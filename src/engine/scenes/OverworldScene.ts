import Phaser from 'phaser';
import { ALL_ITEMS } from '../../data/defaultData';
import { soundManager } from '../../services/soundSynthesizer';
import { CharacterVoice, DialogueNode, DialoguePage } from '../../types/dialogue';
import { DialogueManager } from '../DialogueManager';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';

interface RoomData {
  id: string;
  name: string;
  width: number;
  height: number;
  wallTiles: { x: number; y: number }[];
  floorTile: string;
  flowerPatches?: { x: number; y: number }[];
  objects: Array<{
    type: 'sign' | 'chest' | 'save' | 'switch' | 'spikes' | 'door' | 'npc';
    x: number;
    y: number;
    id?: string;
    text?: string;
    dialogueId?: string;
    itemId?: string;
    targetRoom?: string;
    targetX?: number;
    targetY?: number;
    npcKey?: string;
    npcName?: string;
    npcVoice?: CharacterVoice;
  }>;
}

export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Z: Phaser.Input.Keyboard.Key;
    X: Phaser.Input.Keyboard.Key;
    C: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
  };

  private playerDirection: 'down' | 'up' | 'left' | 'right' = 'down';
  private isMoving = false;
  private walkFrame = 0;
  private walkTimer = 0;
  private speed = 150;

  private currentRoomId = 'room_awakening';
  private roomGroup!: Phaser.GameObjects.Group;
  private wallsGroup!: Phaser.GameObjects.Group;
  private interactablesGroup!: Phaser.GameObjects.Group;

  // Transition debounce flag to fix getting stuck in door sprites
  private isTransitioning = false;
  private transitionCooldown = 0;

  // Dialogue system state (Undertale classic style)
  public isDialogueActive = false;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialoguePortraitBorder!: Phaser.GameObjects.Graphics;
  private dialoguePortrait!: Phaser.GameObjects.Sprite;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueArrow!: Phaser.GameObjects.Text;
  private dialoguePagesQueue: DialoguePage[] = [];
  private currentDialoguePage: DialoguePage | null = null;
  private currentFullText = '';
  private displayedCharIndex = 0;
  private typewriterTimer = 0;
  private activeVoice: CharacterVoice = 'monster';
  private currentDialogueOnComplete?: DialogueNode['onComplete'];
  private onDialogueFinishedCallback?: () => void;

  // Save UI modal in-engine (Undertale classic style)
  public isSavePromptActive = false;
  private isSaveConfirmed = false;
  private savePromptContainer!: Phaser.GameObjects.Container;
  private saveSelectedOption: 'save' | 'return' = 'save';
  private savePromptSoul!: Phaser.GameObjects.Sprite;
  private saveHeaderName!: Phaser.GameObjects.Text;
  private saveHeaderLv!: Phaser.GameObjects.Text;
  private saveHeaderTime!: Phaser.GameObjects.Text;
  private saveRoomText!: Phaser.GameObjects.Text;
  private saveBtn!: Phaser.GameObjects.Text;
  private returnBtn!: Phaser.GameObjects.Text;
  private saveSavedNotice!: Phaser.GameObjects.Text;
  private savePromptFlash!: Phaser.GameObjects.Graphics;
  private activeSaveSprite: Phaser.GameObjects.Sprite | null = null;
  private ambientParticleTimers: Phaser.Time.TimerEvent[] = [];

  // Awakening animation state
  private wakeUpTween: Phaser.Tweens.Tween | null = null;
  private wakeUpPromptText: Phaser.GameObjects.Text | null = null;

  // Cutscene state (e.g. Flowey encounter intro)
  public isCutsceneActive = false;
  private floweyCutsceneTriggered = false;
  private floweyNpcSprite: Phaser.GameObjects.Sprite | null = null;

  // Room definitions with generous door buffer zones
  private rooms: Record<string, RoomData> = {
    room_awakening: {
      id: 'room_awakening',
      name: 'O Despertar nas Flores Douradas',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 576, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'sign',
          x: 180,
          y: 260,
          npcKey: 'prop_golden_flowerbed',
          dialogueId: 'room1_flowerbed',
          text: '* Flores douradas.\n* Elas devem ter amortecido sua queda.',
        },
        {
          type: 'sign',
          x: 320,
          y: 110,
          dialogueId: 'sign_controls',
          text: '* [SETAS / WASD] - Mover\n* [Z / ENTER] - Interagir e Avançar\n* [X / SHIFT] - Pular\n* [C] - Menu',
        },
        {
          type: 'door',
          x: 576,
          y: 240,
          npcKey: 'prop_arch_door',
          targetRoom: 'room_flowey',
          targetX: 110,
          targetY: 240,
        },
      ],
    },

    room_flowey: {
      id: 'room_flowey',
      name: 'A Clareira de Flowey',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      flowerPatches: [{ x: 320, y: 240 }],
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 576, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'door',
          x: 64,
          y: 240,
          npcKey: 'prop_arch_door',
          targetRoom: 'room_awakening',
          targetX: 500,
          targetY: 240,
        },
        {
          type: 'npc',
          x: 320,
          y: 240,
          npcKey: 'flowey_friendly',
          npcName: 'Flowey',
          npcVoice: 'flowey',
          dialogueId: 'flowey_encounter',
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          npcKey: 'prop_arch_door',
          targetRoom: 'room_toriel_entrance',
          targetX: 320,
          targetY: 340,
        },
      ],
    },

    room_toriel_entrance: {
      id: 'room_toriel_entrance',
      name: 'Entrada das Ruínas com Toriel',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      flowerPatches: [{ x: 200, y: 260 }, { x: 320, y: 340 }],
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'save',
          x: 200,
          y: 260,
          id: 'save_toriel_entrance',
          dialogueId: 'save_toriel_entrance',
          text: '* A sombra das Ruínas paira no ar, mas a presença calorosa de Toriel enche você de DETERMINAÇÃO.\n\n* (HP restaurado e Jogo Salvo!)',
        },
        {
          type: 'npc',
          x: 320,
          y: 165,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_welcome',
        },
        {
          type: 'sign',
          x: 440,
          y: 175,
          dialogueId: 'sign_delta_rune',
          text: '* O emblema gravado na parede púrpura: o lendário Delta Rune.\n* Três triângulos coroados por um orbe alado.',
        },
        {
          type: 'sign',
          x: 200,
          y: 350,
          dialogueId: 'sign_ruins_intro',
          text: '* "Apenas os determinados podem desvendar os mistérios do Subterrâneo."',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'room_flowey',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          npcKey: 'prop_arch_door',
          targetRoom: 'ruins_switch_chamber',
          targetX: 320,
          targetY: 360,
        },
      ],
    },

    ruins_switch_chamber: {
      id: 'ruins_switch_chamber',
      name: 'Sala dos Interruptores das Ruínas',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      flowerPatches: [{ x: 320, y: 300 }],
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'switch',
          x: 210,
          y: 130,
          id: 'switch_toriel_labeled',
          text: '* Você acionou o interruptor rotulado por Toriel com um "CLIQUE"! Os espinhos ao norte recuaram para o chão.',
        },
        {
          type: 'sign',
          x: 170,
          y: 130,
          dialogueId: 'sign_switch_labeled',
          text: '* Bilhete em giz amarelo:\n* "Por favor, aperte este interruptor! - Toriel ❤"',
        },
        {
          type: 'switch',
          x: 430,
          y: 130,
          id: 'switch_unlabeled',
          text: '* (Um interruptor comum. Toriel não marcou este com giz.)',
        },
        {
          type: 'sign',
          x: 470,
          y: 130,
          dialogueId: 'sign_switch_unlabeled',
          text: '* (Um interruptor sem bilhete. Toriel não marcou este com giz.)',
        },
        {
          type: 'spikes',
          x: 320,
          y: 140,
          id: 'spikes_switch_chamber',
          dialogueId: 'spikes_active',
        },
        {
          type: 'npc',
          x: 290,
          y: 220,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_switch_advice',
        },
        {
          type: 'sign',
          x: 480,
          y: 350,
          text: '* "Apenas os determinados podem desvendar os enigmas do Subterrâneo."',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'room_toriel_entrance',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          npcKey: 'prop_arch_door',
          targetRoom: 'ruins_dummy_room',
          targetX: 320,
          targetY: 360,
        },
      ],
    },

    ruins_dummy_room: {
      id: 'ruins_dummy_room',
      name: 'Sala do Manequim de Treinamento',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      flowerPatches: [{ x: 380, y: 240 }, { x: 240, y: 240 }],
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'npc',
          x: 240,
          y: 230,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_dummy_advice',
        },
        {
          type: 'npc',
          x: 380,
          y: 230,
          npcKey: 'prop_dummy',
          npcName: 'Manequim',
          npcVoice: 'monster',
          dialogueId: 'dummy_practice',
        },
        {
          type: 'sign',
          x: 480,
          y: 170,
          text: '* CONSELHO DE COMBATE:\n* "Use [AGIR] para conversar pacientemente e demonstrar misericórdia com [PIEDADE]."',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_switch_chamber',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          npcKey: 'prop_arch_door',
          targetRoom: 'ruins_puzzle',
          targetX: 320,
          targetY: 340,
        },
      ],
    },

    ruins_entrance: {
      id: 'ruins_entrance',
      name: 'Pátio Antigo das Ruínas',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      flowerPatches: [
        { x: 320, y: 340 },
        { x: 288, y: 340 },
        { x: 352, y: 340 },
        { x: 320, y: 372 },
      ],
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'save',
          x: 200,
          y: 270,
          id: 'save_1',
          dialogueId: 'save_flowerbed',
          text: '* A sombra das ruínas paira sobre você, mas o calor das flores douradas enche você de DETERMINAÇÃO.',
        },
        {
          type: 'sign',
          x: 440,
          y: 200,
          dialogueId: 'sign_ruins_intro',
          text: '* "Apenas os determinados podem resolver os enigmas da caverna subterrânea."',
        },
        {
          type: 'npc',
          x: 320,
          y: 190,
          npcKey: 'enemy_froggit',
          npcName: 'Froggit Educado',
          npcVoice: 'monster',
          dialogueId: 'froggit_advice',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'room_toriel_entrance',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_switch_chamber',
          targetX: 320,
          targetY: 340,
        },
      ],
    },

    ruins_puzzle: {
      id: 'ruins_puzzle',
      name: 'Câmara do Enigma de Espinhos',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 96, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 512, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'switch',
          x: 200,
          y: 240,
          id: 'switch_puzzle_1',
          dialogueId: 'switch_puzzle_1',
          text: '* Você pisou no interruptor com um "CLIQUE"! Os espinhos ao norte recuaram para o chão.',
        },
        {
          type: 'spikes',
          x: 320,
          y: 220,
          id: 'spikes_gate',
          dialogueId: 'spikes_active',
        },
        {
          type: 'chest',
          x: 440,
          y: 160,
          itemId: 'toy_knife',
          text: '* Você abriu o baú antigo... Encontrou uma [Faca de Brinquedo] (ATK +3)!',
        },
        {
          type: 'sign',
          x: 190,
          y: 350,
          text: '* DICA: Pressione o botão no piso para desarmar a armadilha de espinhos.',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_dummy_room',
          targetX: 320,
          targetY: 130, // Offset inside room
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_crossroads',
          targetX: 320,
          targetY: 340, // Offset inside room
        },
      ],
    },

    ruins_crossroads: {
      id: 'ruins_crossroads',
      name: 'Cruzamento dos Monstros',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'save',
          x: 180,
          y: 320,
          id: 'save_2',
          dialogueId: 'save_flowerbed',
          text: '* Saber que amigos cuidam de você enche você de DETERMINAÇÃO.',
        },
        {
          type: 'npc',
          x: 210,
          y: 180,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_repeat',
        },
        {
          type: 'npc',
          x: 430,
          y: 180,
          npcKey: 'npc_sans',
          npcName: 'Sans',
          npcVoice: 'sans',
          dialogueId: 'sans_intro',
        },
        {
          type: 'chest',
          x: 480,
          y: 320,
          itemId: 'faded_ribbon',
          text: '* Você vasculhou o baú empoeirado... Encontrou uma [Fita Desbotada] (DEF +3)!',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_puzzle',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_boss_gate',
          targetX: 320,
          targetY: 340,
        },
      ],
    },

    ruins_boss_gate: {
      id: 'ruins_boss_gate',
      name: 'Salão dos Guardiões do Subterrâneo',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 96, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 512, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'npc',
          x: 240,
          y: 180,
          npcKey: 'enemy_sir_ossos',
          npcName: 'Sir Ossos',
          npcVoice: 'papyrus',
          dialogueId: 'sir_ossos_encounter',
        },
        {
          type: 'npc',
          x: 400,
          y: 180,
          npcKey: 'enemy_deltajester',
          npcName: 'Bufão Caótico',
          npcVoice: 'monster',
          dialogueId: 'deltajester_encounter',
        },
        {
          type: 'save',
          x: 180,
          y: 320,
          id: 'save_boss_gate',
          dialogueId: 'save_boss_gate',
          text: '* O silêncio solene diante dos grandes portões ancestrais enche você de DETERMINAÇÃO.',
        },
        {
          type: 'sign',
          x: 320,
          y: 290,
          text: '* Aproxime-se de qualquer um dos campeões acima e aperte [Z] para iniciar um combate épico!',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_crossroads',
          targetX: 320,
          targetY: 130,
        },
      ],
    },
  };

  constructor() {
    super('OverworldScene');
  }

  create() {
    SpriteGenerator.generateAllTextures(this);

    this.currentRoomId = gameState.getCurrentRoom();
    this.roomGroup = this.add.group();
    this.wallsGroup = this.add.group();
    this.interactablesGroup = this.add.group();
    this.isTransitioning = false;
    this.transitionCooldown = 500;

    // Sound
    soundManager.playMusic('overworld');

    // Controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Z: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      X: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      C: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    // Load Room and Player
    this.buildRoom(this.currentRoomId);

    const savedPos = gameState.getPlayerPos();
    const isAwoken = gameState.getFlag('frisk_awoken');
    const initialTexture =
      this.currentRoomId === 'room_awakening' && !isAwoken
        ? 'player_fallen'
        : 'player_down_0';
    this.player = this.add.sprite(savedPos.x, savedPos.y, initialTexture);
    this.player.setDepth(10);

    if (this.currentRoomId === 'room_awakening' && !isAwoken) {
      this.setupAwakeningState();
    } else if (this.currentRoomId === 'room_flowey' && !gameState.getFlag('flowey_met')) {
      this.time.delayedCall(350, () => {
        this.checkAndStartFloweyCutscene();
      });
    } else if (this.currentRoomId === 'room_toriel_entrance' && !gameState.getFlag('toriel_entrance_cutscene')) {
      this.time.delayedCall(450, () => {
        this.startDialogueById('toriel_ruins_intro');
      });
    }

    // Create Dialogue and Save Containers
    this.createDialogueBox();
    this.createSavePrompt();

    // Listen for custom virtual inputs and state reload events from UI
    this.events.on('virtual_action', this.handleVirtualAction, this);
    this.game.events.on('reload_game_state', this.handleReloadGameState, this);

    // Clean up on shutdown
    this.events.once('shutdown', () => {
      this.events.off('virtual_action', this.handleVirtualAction, this);
      this.game.events.off('reload_game_state', this.handleReloadGameState, this);
    });
  }

  public handleReloadGameState() {
    const curRoom = gameState.getCurrentRoom();
    const pos = gameState.getPlayerPos();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.buildRoom(curRoom);
    this.player.setPosition(pos.x, pos.y);
    this.player.setTexture('player_down_0');
    this.player.setScale(1);
    if (this.wakeUpTween) {
      this.wakeUpTween.stop();
      this.wakeUpTween = null;
    }
    if (this.wakeUpPromptText) {
      this.wakeUpPromptText.destroy();
      this.wakeUpPromptText = null;
    }
  }

  private setupAwakeningState() {
    this.player.setTexture('player_fallen');

    // Gentle breathing idle while asleep on the flowers
    if (this.wakeUpTween) this.wakeUpTween.stop();
    this.wakeUpTween = this.tweens.add({
      targets: this.player,
      scaleY: 1.05,
      scaleX: 0.98,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle prompt for player
    if (this.wakeUpPromptText) this.wakeUpPromptText.destroy();
    this.wakeUpPromptText = this.add.text(
      320,
      440,
      '[ Pressione qualquer tecla para se levantar ]',
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#f1c40f',
      }
    );
    this.wakeUpPromptText.setOrigin(0.5);
    this.wakeUpPromptText.setDepth(20);

    this.tweens.add({
      targets: this.wakeUpPromptText,
      alpha: { from: 0.4, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private wakeUpFrisk() {
    if (gameState.getFlag('frisk_awoken')) return;
    gameState.setFlag('frisk_awoken', true);

    if (this.wakeUpTween) {
      this.wakeUpTween.stop();
      this.wakeUpTween = null;
    }
    this.player.setScale(1);

    if (this.wakeUpPromptText) {
      this.tweens.add({
        targets: this.wakeUpPromptText,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.wakeUpPromptText?.destroy();
          this.wakeUpPromptText = null;
        },
      });
    }

    // Play awakening sound
    soundManager.playMenuSelect();

    // Golden sparkle effect around Frisk rising up
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spark = this.add.circle(
        this.player.x + Math.cos(angle) * 8,
        this.player.y + Math.sin(angle) * 8,
        2,
        0xfff9c4,
        1
      );
      spark.setDepth(15);
      this.tweens.add({
        targets: spark,
        x: this.player.x + Math.cos(angle) * 26,
        y: this.player.y + Math.sin(angle) * 26,
        alpha: 0,
        duration: 400,
        onComplete: () => spark.destroy(),
      });
    }

    // Quick white flash on player as determination awakens
    this.player.setTint(0xffffff);
    this.time.delayedCall(120, () => {
      this.player.clearTint();
      this.player.setTexture('player_down_0');
    });
  }

  private buildRoom(roomId: string) {
    this.ambientParticleTimers.forEach((t) => t.remove());
    this.ambientParticleTimers = [];

    this.roomGroup.clear(true, true);
    this.wallsGroup.clear(true, true);
    this.interactablesGroup.clear(true, true);

    const room = this.rooms[roomId] || this.rooms.ruins_entrance;
    this.currentRoomId = room.id;
    gameState.setCurrentRoom(room.id, undefined, undefined, room.name);

    // Floor tiles
    for (let x = 0; x < 640; x += 32) {
      for (let y = 0; y < 480; y += 32) {
        const floor = this.add.image(x + 16, y + 16, room.floorTile);
        floor.setDepth(1);
        this.roomGroup.add(floor);
      }
    }

    // Flower patches
    if (room.flowerPatches) {
      room.flowerPatches.forEach((pt) => {
        const patch = this.add.image(pt.x, pt.y, 'tile_flower_patch');
        patch.setDepth(2);
        this.roomGroup.add(patch);
      });
    }

    // Atmospheric beam of light & dust particles in the awakening chamber (Mt. Ebott shaft)
    if (room.id === 'room_awakening') {
      const beam = this.add.graphics();
      // Outer cone
      beam.fillStyle(0xfff8d6, 0.09);
      beam.fillTriangle(180, 0, 70, 360, 290, 360);
      // Inner cone
      beam.fillStyle(0xfffae6, 0.16);
      beam.fillTriangle(180, 0, 110, 320, 250, 320);
      // Soft ground pool on the flowers
      beam.fillStyle(0xffeb99, 0.15);
      beam.fillEllipse(180, 260, 170, 95);
      beam.setDepth(3);
      this.roomGroup.add(beam);

      // Golden floating dust motes drifting in the sunbeam
      for (let i = 0; i < 18; i++) {
        const px = Phaser.Math.Between(110, 250);
        const py = Phaser.Math.Between(50, 310);
        const mote = this.add.circle(px, py, Phaser.Math.Between(1, 2), 0xfff9c4, 0.7);
        mote.setDepth(4);
        this.roomGroup.add(mote);

        this.tweens.add({
          targets: mote,
          y: py + Phaser.Math.Between(-16, 20),
          x: px + Phaser.Math.Between(-12, 12),
          alpha: { from: 0.15, to: 0.85 },
          duration: Phaser.Math.Between(2000, 3800),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 1500),
        });
      }
    }

    // Walls
    room.wallTiles.forEach((wall) => {
      // Keep door openings clear (North/South: x=320, East: x=576 y=240, West: x=64 y=240)
      if (
        (wall.y === 64 && Math.abs(wall.x - 320) < 32) ||
        (wall.y === 416 && Math.abs(wall.x - 320) < 32) ||
        (wall.x === 576 && Math.abs(wall.y - 240) < 48) ||
        (wall.x === 64 && Math.abs(wall.y - 240) < 48)
      ) {
        return;
      }
      const wallSprite = this.add.image(wall.x + 16, wall.y + 16, 'tile_wall_ruins');
      wallSprite.setDepth(3);
      wallSprite.setData('isWall', true);
      this.wallsGroup.add(wallSprite);
    });

    // Room Objects & NPCs
    room.objects.forEach((obj) => {
      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

      if (obj.type === 'save') {
        sprite = this.add.sprite(obj.x, obj.y, 'prop_save_star');
        sprite.setDepth(5);

        // Undertale rotating 4-pointed golden star tween
        this.tweens.add({
          targets: sprite,
          angle: 360,
          duration: 3600,
          repeat: -1,
          ease: 'Linear',
        });

        // Breathing scale pulse tween
        this.tweens.add({
          targets: sprite,
          scaleX: 1.25,
          scaleY: 1.25,
          yoyo: true,
          repeat: -1,
          duration: 650,
          ease: 'Sine.easeInOut',
        });

        // Gentle floating vertical bobbing
        this.tweens.add({
          targets: sprite,
          y: obj.y - 3,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.startSaveStarAmbientParticles(sprite as Phaser.GameObjects.Sprite);
      } else if (obj.type === 'chest') {
        sprite = this.add.sprite(obj.x, obj.y, 'prop_chest');
      } else if (obj.type === 'sign') {
        if (obj.npcKey === 'prop_golden_flowerbed') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_golden_flowerbed');
          sprite.setDepth(2);
        } else {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_sign');
        }
      } else if (obj.type === 'switch') {
        const isSwitched = gameState.getFlag(obj.id || 'switch');
        sprite = this.add.sprite(obj.x, obj.y, isSwitched ? 'prop_switch_on' : 'prop_switch_off');
      } else if (obj.type === 'spikes') {
        const isDown =
          obj.id === 'spikes_switch_chamber'
            ? gameState.getFlag('switch_toriel_labeled')
            : gameState.getFlag('switch_puzzle_1');
        sprite = this.add.sprite(obj.x, obj.y, isDown ? 'prop_spikes_down' : 'prop_spikes_up');
        sprite.setData('blocking', !isDown);
      } else if (obj.type === 'npc') {
        if (obj.npcKey === 'flowey_friendly' && gameState.getFlag('flowey_met')) {
          return;
        }
        const npcSprite = this.add.sprite(obj.x, obj.y, obj.npcKey || 'enemy_froggit');
        sprite = npcSprite;

        if (obj.npcKey === 'flowey_friendly') {
          this.floweyNpcSprite = npcSprite;
        }

        this.tweens.add({
          targets: sprite,
          y: obj.y - 3,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (obj.type === 'door') {
        if (obj.npcKey === 'prop_arch_door') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_arch_door');
          sprite.setDepth(3);
        } else {
          sprite = this.add.rectangle(obj.x, obj.y, 44, 20, 0x000000, 0) as unknown as Phaser.GameObjects.Sprite;
        }
      } else {
        sprite = this.add.rectangle(obj.x, obj.y, 44, 20, 0x000000, 0) as unknown as Phaser.GameObjects.Sprite;
      }

      if (sprite.depth === undefined || sprite.depth < 2) {
        sprite.setDepth(4);
      }
      sprite.setData('config', obj);
      this.interactablesGroup.add(sprite);

      // Allow direct click / touch on interactables (switches, signs, chests, save stars, and NPCs)
      if (obj.type !== 'door') {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => {
          if (!this.isDialogueActive && !this.isSavePromptActive && !this.isCutsceneActive) {
            this.handleInteractableAction(sprite as Phaser.GameObjects.Sprite);
          }
        });
      }
    });
  }

  private startSaveStarAmbientParticles(sprite: Phaser.GameObjects.Sprite) {
    const timer = this.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        if (!sprite.active) return;
        const offsetX = Phaser.Math.Between(-8, 8);
        const offsetY = Phaser.Math.Between(-6, 6);
        const p = this.add.sprite(sprite.x + offsetX, sprite.y + offsetY, 'particle_star');
        p.setDepth(6);
        p.setScale(Phaser.Math.FloatBetween(0.6, 1.1));
        p.setAlpha(0.9);
        this.roomGroup.add(p);

        this.tweens.add({
          targets: p,
          y: p.y - Phaser.Math.Between(14, 24),
          x: p.x + Phaser.Math.Between(-6, 6),
          alpha: 0,
          scale: 0.25,
          duration: Phaser.Math.Between(700, 1100),
          ease: 'Sine.easeOut',
          onComplete: () => p.destroy(),
        });
      },
    });
    this.ambientParticleTimers.push(timer);
  }

  private playSaveSparkleAnimation(saveSprite?: Phaser.GameObjects.Sprite) {
    const targetX = saveSprite ? saveSprite.x : this.player.x;
    const targetY = saveSprite ? saveSprite.y : this.player.y;

    // 1. Radial explosion of golden star particles on the overworld
    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = Phaser.Math.Between(36, 68);
      const targetPx = targetX + Math.cos(angle) * dist;
      const targetPy = targetY + Math.sin(angle) * dist;

      const p = this.add.sprite(targetX, targetY, 'particle_star');
      p.setDepth(160);
      p.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      p.setAlpha(1);

      this.tweens.add({
        targets: p,
        x: targetPx,
        y: targetPy,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(600, 950),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    // 2. Expanding golden energy ring effect around save star
    const ring = this.add.graphics();
    ring.setDepth(155);
    ring.lineStyle(3, 0xffff55, 1);
    ring.strokeCircle(targetX, targetY, 6);

    this.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 3. Floating overworld text "SALVO! HP MAX!" above Frisk
    const floatText = this.add.text(this.player.x, this.player.y - 28, 'SALVO! HP MAX!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3,
    });
    floatText.setOrigin(0.5);
    floatText.setDepth(160);

    this.tweens.add({
      targets: floatText,
      y: floatText.y - 24,
      alpha: 0,
      duration: 1300,
      ease: 'Quad.easeOut',
      onComplete: () => floatText.destroy(),
    });
  }

  // --- SAVE PROMPT MODAL (Undertale classic style) ---
  private createSavePrompt() {
    this.savePromptContainer = this.add.container(320, 230);
    this.savePromptContainer.setDepth(150);
    this.savePromptContainer.setVisible(false);

    // Pure black rect with 5px solid white border
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.lineStyle(5, 0xffffff, 1);
    bg.fillRect(-220, -85, 440, 170);
    bg.strokeRect(-220, -85, 440, 170);
    this.savePromptContainer.add(bg);

    // Golden/white flash overlay for save confirmation animation
    this.savePromptFlash = this.add.graphics();
    this.savePromptFlash.fillStyle(0xffffff, 1);
    this.savePromptFlash.fillRect(-220, -85, 440, 170);
    this.savePromptFlash.setAlpha(0);
    this.savePromptContainer.add(this.savePromptFlash);

    // Header info: NAME (left), LV (mid), TIME (right)
    this.saveHeaderName = this.add.text(-185, -60, 'FRISK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.savePromptContainer.add(this.saveHeaderName);

    this.saveHeaderLv = this.add.text(-20, -60, 'LV 1', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.savePromptContainer.add(this.saveHeaderLv);

    this.saveHeaderTime = this.add.text(100, -60, '00:00', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.savePromptContainer.add(this.saveHeaderTime);

    // Room Name
    this.saveRoomText = this.add.text(-185, -25, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.savePromptContainer.add(this.saveRoomText);

    // Save button
    this.saveBtn = this.add.text(-120, 30, 'Salvar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
    this.saveBtn.setInteractive({ useHandCursor: true });
    this.saveBtn.on('pointerdown', () => {
      if (!this.isSaveConfirmed) {
        this.saveSelectedOption = 'save';
        this.confirmSaveOption();
      }
    });
    this.saveBtn.on('pointerover', () => {
      if (!this.isSaveConfirmed) {
        this.saveSelectedOption = 'save';
        soundManager.playMenuMove();
        this.updateSavePromptCursor();
      }
    });
    this.savePromptContainer.add(this.saveBtn);

    // Return button
    this.returnBtn = this.add.text(55, 30, 'Voltar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
    this.returnBtn.setInteractive({ useHandCursor: true });
    this.returnBtn.on('pointerdown', () => {
      if (!this.isSaveConfirmed) {
        this.saveSelectedOption = 'return';
        this.confirmSaveOption();
      }
    });
    this.returnBtn.on('pointerover', () => {
      if (!this.isSaveConfirmed) {
        this.saveSelectedOption = 'return';
        soundManager.playMenuMove();
        this.updateSavePromptCursor();
      }
    });
    this.savePromptContainer.add(this.returnBtn);

    // Red soul selection cursor ♥
    this.savePromptSoul = this.add.sprite(-145, 38, 'soul_red');
    this.savePromptSoul.setScale(1.1);
    this.savePromptContainer.add(this.savePromptSoul);

    // Pulse animation for cursor soul
    this.tweens.add({
      targets: this.savePromptSoul,
      scaleX: 1.25,
      scaleY: 1.25,
      yoyo: true,
      repeat: -1,
      duration: 450,
      ease: 'Sine.easeInOut',
    });

    // "Arquivo salvo." text (displayed upon saving)
    this.saveSavedNotice = this.add.text(-185, 28, 'Arquivo salvo.', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffff00',
    });
    this.saveSavedNotice.setVisible(false);
    this.savePromptContainer.add(this.saveSavedNotice);
  }

  private openSavePrompt(cfg?: any, sprite?: Phaser.GameObjects.Sprite) {
    this.isSavePromptActive = true;
    this.isSaveConfirmed = false;
    this.saveSelectedOption = 'save';
    this.activeSaveSprite = sprite || null;

    const stats = gameState.getStats();
    const currentRoom = this.rooms[this.currentRoomId];
    const roomName = currentRoom?.name || 'Ruínas - Pátio';
    const playtime = gameState.getFormattedPlaytime();

    const lastSave = gameState.getLastSavedData();
    if (lastSave) {
      this.saveHeaderName.setText(lastSave.stats.name.toUpperCase());
      this.saveHeaderLv.setText(`LV ${lastSave.stats.lv}`);
      const mins = Math.floor((lastSave.playtimeSeconds || 0) / 60);
      const secs = (lastSave.playtimeSeconds || 0) % 60;
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      this.saveHeaderTime.setText(`${pad(mins)}:${pad(secs)}`);
      this.saveRoomText.setText(lastSave.roomName || roomName);
    } else {
      this.saveHeaderName.setText(stats.name.toUpperCase());
      this.saveHeaderLv.setText(`LV ${stats.lv}`);
      this.saveHeaderTime.setText(playtime);
      this.saveRoomText.setText(roomName);
    }

    this.saveBtn.setVisible(true);
    this.returnBtn.setVisible(true);
    this.saveSavedNotice.setVisible(false);
    this.savePromptSoul.setVisible(true);

    this.updateSavePromptCursor();
    this.savePromptContainer.setVisible(true);
    this.savePromptContainer.setScale(0.95);
    this.savePromptContainer.setAlpha(0);

    this.tweens.add({
      targets: this.savePromptContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  private updateSavePromptCursor() {
    if (this.saveSelectedOption === 'save') {
      this.savePromptSoul.setPosition(-145, 38);
    } else {
      this.savePromptSoul.setPosition(30, 38);
    }
  }

  private confirmSaveOption() {
    if (this.isSaveConfirmed) {
      this.closeSavePrompt();
      return;
    }

    if (this.saveSelectedOption === 'return') {
      soundManager.playMenuSelect();
      this.closeSavePrompt();
      return;
    }

    // SAVING
    this.isSaveConfirmed = true;
    const currentRoom = this.rooms[this.currentRoomId];
    const roomName = currentRoom?.name || 'Ruínas - Pátio';
    const stats = gameState.getStats();

    // 1. Play Undertale authentic save chime
    soundManager.playSave();

    // 2. Fully restore HP and save game state to gameState and localStorage
    gameState.restoreFullHp();
    gameState.setPlayerPos(Math.round(this.player.x), Math.round(this.player.y));
    gameState.saveGame(roomName);

    // 3. Update the header to newly saved values
    this.saveHeaderName.setText(stats.name.toUpperCase());
    this.saveHeaderLv.setText(`LV ${stats.lv}`);
    this.saveHeaderTime.setText(gameState.getFormattedPlaytime());
    this.saveRoomText.setText(roomName);

    // 4. Hide choices, show yellow "Arquivo salvo."
    this.saveBtn.setVisible(false);
    this.returnBtn.setVisible(false);
    this.savePromptSoul.setVisible(false);
    this.saveSavedNotice.setVisible(true);

    // 5. Flash animation on the save modal
    this.savePromptFlash.setAlpha(0.7);
    this.tweens.add({
      targets: this.savePromptFlash,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
    });

    // 6. Burst star sparkle particles on overworld & floating text
    this.playSaveSparkleAnimation(this.activeSaveSprite || undefined);

    // 7. Pulse on "Arquivo salvo."
    this.tweens.add({
      targets: this.saveSavedNotice,
      scaleX: 1.1,
      scaleY: 1.1,
      yoyo: true,
      duration: 200,
      repeat: 1,
    });

    // 8. Auto-close after 1100ms
    this.time.delayedCall(1100, () => {
      if (this.isSavePromptActive) {
        this.closeSavePrompt();
      }
    });
  }

  private closeSavePrompt() {
    if (!this.isSavePromptActive) return;
    this.tweens.add({
      targets: this.savePromptContainer,
      alpha: 0,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 100,
      onComplete: () => {
        this.isSavePromptActive = false;
        this.isSaveConfirmed = false;
        this.savePromptContainer.setVisible(false);
        this.savePromptContainer.setAlpha(1);
        this.savePromptContainer.setScale(1);
      },
    });
  }

  private createDialogueBox() {
    this.dialogueBox = this.add.container(320, 395);
    this.dialogueBox.setDepth(120);
    this.dialogueBox.setVisible(false);

    // Outer frame - Undertale classic pure black background with crisp 5px solid white border
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.lineStyle(5, 0xffffff, 1);
    bg.fillRect(-288, -70, 576, 140);
    bg.strokeRect(-288, -70, 576, 140);
    this.dialogueBox.add(bg);

    // Portrait frame background & border
    this.dialoguePortraitBorder = this.add.graphics();
    this.dialoguePortraitBorder.fillStyle(0x000000, 1);
    this.dialoguePortraitBorder.lineStyle(3, 0xffffff, 1);
    this.dialoguePortraitBorder.fillRect(-264, -50, 88, 100);
    this.dialoguePortraitBorder.strokeRect(-264, -50, 88, 100);
    this.dialoguePortraitBorder.setVisible(false);
    this.dialogueBox.add(this.dialoguePortraitBorder);

    // Character Portrait sprite
    this.dialoguePortrait = this.add.sprite(-220, 0, 'portrait_toriel_normal');
    this.dialoguePortrait.setDisplaySize(80, 80);
    this.dialoguePortrait.setVisible(false);
    this.dialogueBox.add(this.dialoguePortrait);

    // Dialogue text element
    this.dialogueText = this.add.text(-260, -50, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: 520 },
      lineSpacing: 10,
    });
    this.dialogueBox.add(this.dialogueText);

    // Flashing arrow indicator waiting for [Z]
    this.dialogueArrow = this.add.text(255, 45, '▼', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffff00',
    });
    this.dialogueArrow.setOrigin(0.5);
    this.dialogueArrow.setVisible(false);
    this.tweens.add({
      targets: this.dialogueArrow,
      alpha: { from: 1, to: 0.1 },
      y: { from: 43, to: 47 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.dialogueBox.add(this.dialogueArrow);
  }

  public startDialogueById(dialogueId: string, onFinish?: () => void) {
    const resolved = DialogueManager.resolveDialogue(dialogueId);
    if (!resolved || resolved.pages.length === 0) {
      this.showDialogue('* ...', 'monster', null, onFinish);
      return;
    }

    this.isDialogueActive = true;
    this.dialoguePagesQueue = [...resolved.pages];
    this.currentDialogueOnComplete = resolved.onComplete;
    this.onDialogueFinishedCallback = onFinish;
    this.dialogueBox.setVisible(true);
    this.advanceDialogue();
  }

  public showDialogue(
    text: string | string[],
    voice: CharacterVoice = 'monster',
    portrait: string | null = null,
    onFinish?: () => void
  ) {
    const rawPages = Array.isArray(text) ? text : [text];
    const pages: DialoguePage[] = rawPages.map((str) => ({
      text: DialogueManager.formatUndertaleText(str),
      voice,
      portrait: portrait || null,
    }));

    this.isDialogueActive = true;
    this.dialoguePagesQueue = pages;
    this.currentDialogueOnComplete = undefined;
    this.onDialogueFinishedCallback = onFinish;
    this.dialogueBox.setVisible(true);
    this.advanceDialogue();
  }

  private advanceDialogue() {
    if (this.dialoguePagesQueue.length === 0) {
      this.closeDialogue();
      return;
    }

    this.currentDialoguePage = this.dialoguePagesQueue.shift() || null;
    if (!this.currentDialoguePage) {
      this.closeDialogue();
      return;
    }

    this.currentFullText = this.currentDialoguePage.text;
    this.displayedCharIndex = 0;
    this.typewriterTimer = 0;
    this.dialogueText.setText('');
    this.dialogueArrow.setVisible(false);

    const portraitKey = this.currentDialoguePage.portrait;
    const hasPortrait = Boolean(portraitKey && this.textures.exists(portraitKey));

    if (hasPortrait && portraitKey) {
      this.dialoguePortrait.setTexture(portraitKey);
      this.dialoguePortrait.setVisible(true);
      this.dialoguePortraitBorder.setVisible(true);
      this.dialogueText.setPosition(-154, -50);
      this.dialogueText.setWordWrapWidth(415);
    } else {
      this.dialoguePortrait.setVisible(false);
      this.dialoguePortraitBorder.setVisible(false);
      this.dialogueText.setPosition(-260, -50);
      this.dialogueText.setWordWrapWidth(520);
    }

    this.activeVoice = this.currentDialoguePage.voice || 'monster';
  }

  private closeDialogue() {
    this.isDialogueActive = false;
    this.dialogueBox.setVisible(false);
    this.dialogueArrow.setVisible(false);

    const onComplete = this.currentDialogueOnComplete;
    const cb = this.onDialogueFinishedCallback;

    this.currentDialogueOnComplete = undefined;
    this.onDialogueFinishedCallback = undefined;
    this.currentDialoguePage = null;

    if (onComplete) {
      if (onComplete.setFlag) {
        gameState.setFlag(onComplete.setFlag, true);
      }
      if (onComplete.clearFlag) {
        gameState.setFlag(onComplete.clearFlag, false);
      }
      if (onComplete.restoreHp) {
        gameState.restoreFullHp();
      }
      if (onComplete.giveGold) {
        gameState.addGold(onComplete.giveGold);
      }
      if (onComplete.giveItem) {
        const item = ALL_ITEMS.find((it) => it.id === onComplete.giveItem);
        if (item) gameState.addItem(item);
      }
      if (onComplete.startBattle) {
        this.startBattle(onComplete.startBattle);
      } else if (onComplete.startScene) {
        this.scene.start(onComplete.startScene);
      }
    }

    if (cb) {
      cb();
    }
  }

  update(_: number, delta: number) {
    if (this.transitionCooldown > 0) {
      this.transitionCooldown -= delta;
      if (this.transitionCooldown <= 0) {
        this.isTransitioning = false;
      }
    }

    if (this.isSavePromptActive) {
      this.handleSavePromptInput();
      return;
    }

    if (this.isDialogueActive) {
      this.handleDialogueTyping(delta);
      return;
    }

    if (this.isCutsceneActive) {
      return;
    }

    // Force encounter if in Flowey's room and Flowey hasn't been met yet
    if (
      this.currentRoomId === 'room_flowey' &&
      !gameState.getFlag('flowey_met') &&
      !this.floweyCutsceneTriggered &&
      !this.isTransitioning
    ) {
      this.checkAndStartFloweyCutscene();
      return;
    }

    if (!this.isTransitioning) {
      this.handleMovement(delta);
      this.checkInteractions();
    }
  }

  private handleSavePromptInput() {
    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.D);
    const confirm =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);
    const cancel =
      Phaser.Input.Keyboard.JustDown(this.wasd.X) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ESC);

    if (this.isSaveConfirmed) {
      if (confirm || cancel) {
        this.closeSavePrompt();
      }
      return;
    }

    if (left || right) {
      this.saveSelectedOption = this.saveSelectedOption === 'save' ? 'return' : 'save';
      soundManager.playMenuMove();
      this.updateSavePromptCursor();
    }

    if (confirm) {
      this.confirmSaveOption();
    } else if (cancel) {
      soundManager.playMenuSelect();
      this.closeSavePrompt();
    }
  }

  private handleDialogueTyping(delta: number) {
    const justPressedZ =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    const justPressedX =
      Phaser.Input.Keyboard.JustDown(this.wasd.X) ||
      (this.cursors.shift && Phaser.Input.Keyboard.JustDown(this.cursors.shift));

    if (this.displayedCharIndex < this.currentFullText.length) {
      if (justPressedX || justPressedZ) {
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
        this.dialogueArrow.setVisible(true);
        return;
      }

      this.typewriterTimer += delta;
      const speed = this.currentDialoguePage?.speed || 28;
      if (this.typewriterTimer >= speed) {
        this.typewriterTimer = 0;
        this.displayedCharIndex++;
        const nextChar = this.currentFullText[this.displayedCharIndex - 1];
        this.dialogueText.setText(this.currentFullText.substring(0, this.displayedCharIndex));

        if (nextChar && nextChar.trim() !== '' && nextChar !== '*' && nextChar !== '\n') {
          soundManager.playVoiceBlip(this.activeVoice);
        }

        if (this.displayedCharIndex >= this.currentFullText.length) {
          this.dialogueArrow.setVisible(true);
        }
      }
    } else {
      this.dialogueArrow.setVisible(true);

      if (justPressedZ) {
        soundManager.playMenuSelect();
        this.advanceDialogue();
      }
    }
  }

  private handleMovement(delta: number) {
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const actionZ =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    // If Frisk is still sleeping on the golden flowerbed, any direction/action key wakes them up!
    if (!gameState.getFlag('frisk_awoken')) {
      if (left || right || up || down || actionZ) {
        this.wakeUpFrisk();
      }
      return;
    }

    if (left) {
      vx -= 1;
      this.playerDirection = 'left';
    } else if (right) {
      vx += 1;
      this.playerDirection = 'right';
    }

    if (up) {
      vy -= 1;
      this.playerDirection = 'up';
    } else if (down) {
      vy += 1;
      this.playerDirection = 'down';
    }

    this.isMoving = vx !== 0 || vy !== 0;

    if (this.isMoving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;

      const nextX = this.player.x + vx * this.speed * (delta / 1000);
      const nextY = this.player.y + vy * this.speed * (delta / 1000);

      // Check collision against walls, spikes AND solid NPCs/Chests
      if (!this.checkSolidCollision(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      if (!this.checkSolidCollision(this.player.x, nextY)) {
        this.player.y = nextY;
      }

      this.walkTimer += delta;
      if (this.walkTimer > 180) {
        this.walkTimer = 0;
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      }
      this.player.setTexture(`player_${this.playerDirection}_${this.walkFrame}`);
      gameState.setPlayerPos(this.player.x, this.player.y);
    } else {
      this.player.setTexture(`player_${this.playerDirection}_0`);
    }

    this.checkDoorTriggers();
    this.checkStepOnTriggers();
  }

  // Step-on triggers for floor switches and pressure plates
  private checkStepOnTriggers() {
    if (this.isTransitioning || this.isCutsceneActive || this.isDialogueActive || this.isSavePromptActive) return;

    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (!cfg || cfg.type !== 'switch') return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (dist < 32) {
        const switchId = cfg.id;
        if (switchId && !gameState.getFlag(switchId) && switchId !== 'switch_unlabeled') {
          this.handleInteractableAction(sprite);
        }
      }
    });
  }

  // V.0.0.2-GU.1: Fix solid collision check to include NPCs, chests, and signs (ignoring walkable flowerbed)
  private checkSolidCollision(x: number, y: number): boolean {
    const playerHalfW = 12;
    const playerHalfH = 14;

    let hit = false;

    // 1. Boundary walls
    this.wallsGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (
        Math.abs(x - sprite.x) < 16 + playerHalfW &&
        Math.abs(y - sprite.y) < 16 + playerHalfH
      ) {
        hit = true;
      }
    });

    if (hit) return true;

    // 2. NPCs, Chests, Signs, and blocking Spikes
    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (!cfg) return;

      if (
        (cfg.type === 'npc' && cfg.npcKey !== 'prop_golden_flowerbed') ||
        cfg.type === 'chest' ||
        (cfg.type === 'sign' && cfg.npcKey !== 'prop_golden_flowerbed') ||
        (cfg.type === 'spikes' && sprite.getData('blocking'))
      ) {
        const solidHalfW = cfg.type === 'npc' ? 14 : 12;
        const solidHalfH = cfg.type === 'npc' ? 14 : 12;

        if (
          Math.abs(x - sprite.x) < solidHalfW + playerHalfW &&
          Math.abs(y - sprite.y) < solidHalfH + playerHalfH
        ) {
          hit = true;
        }
      }
    });

    return hit;
  }

  // V.0.0.2-N7.1: Room transition fix - avoid getting trapped in door hitbox
  private checkDoorTriggers() {
    if (this.isTransitioning || this.isCutsceneActive) return;

    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (cfg && cfg.type === 'door' && cfg.targetRoom) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cfg.x, cfg.y);
        if (dist < 34) {
          // Block door to Toriel's entrance if Flowey hasn't been met yet
          if (cfg.targetRoom === 'room_toriel_entrance' && !gameState.getFlag('flowey_met')) {
            this.player.y = Math.max(this.player.y, 95);
            soundManager.playMenuMove();
            this.showDialogue(
              '* O caminho adiante ao norte está bloqueado...\n* Uma flor estranha na clareira chama sua atenção!',
              'monster',
              null,
              () => {
                this.floweyCutsceneTriggered = false;
                this.checkAndStartFloweyCutscene();
              }
            );
            return;
          }
          this.switchRoom(cfg.targetRoom, cfg.targetX || 320, cfg.targetY || 300);
        }
      }
    });
  }

  public switchRoom(targetRoom: string, targetX: number, targetY: number) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.floweyCutsceneTriggered = false;

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.buildRoom(targetRoom);
      this.player.setPosition(targetX, targetY);
      gameState.setCurrentRoom(targetRoom, targetX, targetY);
      gameState.setFlag(`reached_${targetRoom}`, true);

      if (targetRoom === 'room_awakening' && !gameState.getFlag('frisk_awoken')) {
        this.setupAwakeningState();
      } else {
        if (this.wakeUpTween) {
          this.wakeUpTween.stop();
          this.wakeUpTween = null;
        }
        if (this.wakeUpPromptText) {
          this.wakeUpPromptText.destroy();
          this.wakeUpPromptText = null;
        }
        this.player.setScale(1);
        this.player.setTexture('player_down_0');
      }

      this.cameras.main.fadeIn(200, 0, 0, 0);

      this.time.delayedCall(450, () => {
        this.isTransitioning = false;
        this.transitionCooldown = 300;

        if (targetRoom === 'room_flowey' && !gameState.getFlag('flowey_met')) {
          this.checkAndStartFloweyCutscene();
        } else if (targetRoom === 'room_toriel_entrance' && !gameState.getFlag('toriel_entrance_cutscene')) {
          this.time.delayedCall(400, () => {
            this.startDialogueById('toriel_ruins_intro');
          });
        }
      });
    });
  }

  private lowerAllSpikes() {
    this.interactablesGroup.getChildren().forEach((ch) => {
      const s = ch as Phaser.GameObjects.Sprite;
      const c = s.getData('config');
      if (c && c.type === 'spikes') {
        s.setTexture('prop_spikes_down');
        s.setData('blocking', false);
      }
    });
  }

  private checkInteractions(forced: boolean = false) {
    const justPressedZ =
      forced ||
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    const justPressedC =
      Phaser.Input.Keyboard.JustDown(this.wasd.C) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ESC);

    if (justPressedC) {
      soundManager.playMenuSelect();
      this.game.events.emit('open_overworld_menu');
      return;
    }

    if (!justPressedZ) return;

    let closestObj: Phaser.GameObjects.Sprite | null = null;
    let minDistance = 75;

    const interactables = this.interactablesGroup.getChildren() as Phaser.GameObjects.Sprite[];

    // Switch prioritization: if a switch is nearby (within 75px), prioritize it over signs or decorative objects
    const nearbySwitch = interactables.find((child) => {
      const cfg = child.getData('config');
      if (!cfg || cfg.type !== 'switch') return false;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
      return d < 75;
    });

    if (nearbySwitch) {
      closestObj = nearbySwitch;
    } else {
      interactables.forEach((child) => {
        const cfg = child.getData('config');
        if (!cfg || cfg.type === 'door') return;

        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
        if (d < minDistance) {
          minDistance = d;
          closestObj = child;
        }
      });
    }

    if (closestObj) {
      this.handleInteractableAction(closestObj);
    }
  }

  private handleInteractableAction(sprite: Phaser.GameObjects.Sprite) {
    const cfg = sprite.getData('config');
    if (!cfg) return;

    if (cfg.type === 'save') {
      soundManager.playMenuSelect();
      this.tweens.add({
        targets: sprite,
        scaleX: 1.5,
        scaleY: 1.5,
        yoyo: true,
        duration: 180,
      });

      gameState.restoreFullHp();

      const determinationText =
        cfg.text || '* A visão acolhedora da caverna enche você de DETERMINAÇÃO.';

      this.showDialogue(
        `${determinationText}\n\n* (HP totalmente restaurado.)`,
        'monster',
        null,
        () => {
          this.openSavePrompt(cfg, sprite);
        }
      );
    } else if (cfg.type === 'chest') {
      const chestOpenedKey = `chest_${cfg.itemId}`;
      if (gameState.getFlag(chestOpenedKey)) {
        this.startDialogueById('chest_empty');
      } else {
        const item = ALL_ITEMS.find((i) => i.id === cfg.itemId);
        if (item) {
          const added = gameState.addItem(item);
          if (added) {
            soundManager.playSave();
            gameState.setFlag(chestOpenedKey, true);
            this.showDialogue(cfg.text || `* Você encontrou [${item.name}]!`);
          } else {
            this.startDialogueById('chest_full_inventory');
          }
        }
      }
    } else if (cfg.type === 'switch') {
      if (cfg.id === 'switch_unlabeled') {
        soundManager.playMenuMove();
        this.showDialogue('* (Você puxou o interruptor comum não rotulado... Nada parece ter acontecido.)');
        return;
      }

      const switchId = cfg.id || 'switch_toriel_labeled';
      const isAlreadyOn = gameState.getFlag(switchId);
      if (!isAlreadyOn) {
        soundManager.playMenuSelect();
        gameState.setFlag(switchId, true);
        sprite.setTexture('prop_switch_on');

        this.lowerAllSpikes();

        this.showDialogue(
          cfg.text || '* Clique! O interruptor foi acionado e os espinhos recuaram para o chão.'
        );
      } else {
        this.showDialogue('* O interruptor já foi acionado. Os espinhos continuam abaixados.');
      }
    } else if (cfg.dialogueId === 'sign_switch_labeled') {
      const alreadyOn = gameState.getFlag('switch_toriel_labeled');
      if (!alreadyOn) {
        soundManager.playMenuSelect();
        gameState.setFlag('switch_toriel_labeled', true);

        // Turn on the switch sprite
        this.interactablesGroup.getChildren().forEach((ch) => {
          const s = ch as Phaser.GameObjects.Sprite;
          const c = s.getData('config');
          if (c && c.id === 'switch_toriel_labeled') {
            s.setTexture('prop_switch_on');
          }
        });

        this.lowerAllSpikes();

        this.showDialogue([
          '* Bilhete em giz amarelo por Toriel:\n* "Por favor, aperte este interruptor! - Toriel ❤"',
          '* (Você acionou o interruptor ao lado com um "CLIQUE"! Os espinhos ao norte recuaram para o chão.)',
        ]);
      } else {
        this.showDialogue([
          '* Bilhete em giz amarelo por Toriel:\n* "Por favor, aperte este interruptor! - Toriel ❤"',
          '* (O interruptor já está ativado e os espinhos continuam abaixados.)',
        ]);
      }
    } else if (cfg.type === 'spikes') {
      const isBlocking = sprite.getData('blocking');
      if (isBlocking) {
        soundManager.playMenuMove();
        this.showDialogue(
          '* Uma fileira de espinhos afiados bloqueia a passagem.\n* Deve haver um interruptor por perto para desativá-los.'
        );
      } else {
        this.showDialogue('* Os espinhos recuaram com segurança para o chão.');
      }
    } else if (cfg.dialogueId) {
      this.startDialogueById(cfg.dialogueId);
    } else if (cfg.type === 'sign') {
      soundManager.playMenuSelect();
      this.showDialogue(cfg.text || '* Uma placa de madeira.');
    } else if (cfg.type === 'npc') {
      if (cfg.dialogueId) {
        this.startDialogueById(cfg.dialogueId);
      } else if (cfg.npcKey === 'flowey_friendly') {
        this.startDialogueById('flowey_encounter');
      } else if (cfg.npcKey === 'npc_toriel') {
        this.startDialogueById('toriel_welcome');
      } else if (cfg.npcKey === 'prop_dummy') {
        this.startDialogueById('dummy_practice');
      } else if (cfg.npcKey === 'enemy_sir_ossos') {
        this.startDialogueById('sir_ossos_encounter');
      } else if (cfg.npcKey === 'enemy_deltajester') {
        this.startDialogueById('deltajester_encounter');
      } else {
        this.showDialogue(cfg.text || '* ...', cfg.npcVoice || 'monster');
      }
    }
  }

  public startBattle(enemyId: string) {
    soundManager.playBattleStart();

    const flash = this.add.rectangle(320, 240, 640, 480, 0xffffff, 1);
    flash.setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        flash.destroy();
        this.scene.start('BattleScene', { enemyId });
      },
    });
  }

  private checkAndStartFloweyCutscene() {
    if (this.currentRoomId !== 'room_flowey') return;
    if (gameState.getFlag('flowey_met')) return;
    if (this.floweyCutsceneTriggered || this.isCutsceneActive || this.isDialogueActive) return;

    this.runFloweyCutscene();
  }

  private runFloweyCutscene() {
    this.floweyCutsceneTriggered = true;
    this.isCutsceneActive = true;
    this.isMoving = false;

    // Stop existing tweens on Frisk
    this.tweens.killTweensOf(this.player);

    // Target coordinates right in front of Flowey
    const targetX = 235;
    const targetY = 240;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);

    if (dist > 14) {
      this.playerDirection = this.player.x < targetX ? 'right' : 'left';
      let walkStep = 0;
      const walkTimer = this.time.addEvent({
        delay: 170,
        loop: true,
        callback: () => {
          walkStep = walkStep === 0 ? 1 : 0;
          this.player.setTexture(`player_${this.playerDirection}_${walkStep}`);
        },
      });

      const walkDuration = Math.min(2200, Math.max(400, Math.round((dist / 125) * 1000)));

      this.tweens.add({
        targets: this.player,
        x: targetX,
        y: targetY,
        duration: walkDuration,
        ease: 'Linear',
        onComplete: () => {
          walkTimer.remove();
          this.player.setTexture('player_right_0');
          this.playerDirection = 'right';
          gameState.setPlayerPos(targetX, targetY);
          this.playFloweyPopSequence();
        },
      });
    } else {
      this.player.setTexture('player_right_0');
      this.playerDirection = 'right';
      this.playFloweyPopSequence();
    }
  }

  private playFloweyPopSequence() {
    // Red exclamation mark (!) above Frisk
    const emote = this.add.text(this.player.x, this.player.y - 28, '!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3,
    });
    emote.setOrigin(0.5);
    emote.setDepth(30);
    soundManager.playMenuSelect();

    // Flowey pop up / smile bounce animation
    if (this.floweyNpcSprite && this.floweyNpcSprite.active) {
      this.floweyNpcSprite.setScale(0.1);
      this.floweyNpcSprite.setVisible(true);
      soundManager.playVoiceBlip('flowey');

      this.tweens.add({
        targets: this.floweyNpcSprite,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 320,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: this.floweyNpcSprite,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
          });
        },
      });
    }

    this.time.delayedCall(700, () => {
      emote.destroy();
      this.isCutsceneActive = false;
      this.startDialogueById('flowey_encounter');
    });
  }

  private handleVirtualAction(action: string) {
    if (!gameState.getFlag('frisk_awoken')) {
      this.wakeUpFrisk();
      return;
    }

    if (this.isCutsceneActive && !this.isDialogueActive) {
      return;
    }

    if (this.isSavePromptActive) {
      if (action === 'LEFT' || action === 'RIGHT') {
        if (!this.isSaveConfirmed) {
          this.saveSelectedOption = this.saveSelectedOption === 'save' ? 'return' : 'save';
          soundManager.playMenuMove();
          this.updateSavePromptCursor();
        }
        return;
      }
      if (action === 'Z') {
        this.confirmSaveOption();
        return;
      }
      if (action === 'X') {
        soundManager.playMenuSelect();
        this.closeSavePrompt();
        return;
      }
    }

    if (action === 'Z') {
      if (this.isDialogueActive) {
        if (this.displayedCharIndex < this.currentFullText.length) {
          this.displayedCharIndex = this.currentFullText.length;
          this.dialogueText.setText(this.currentFullText);
          this.dialogueArrow.setVisible(true);
        } else {
          soundManager.playMenuSelect();
          this.advanceDialogue();
        }
      } else {
        this.checkInteractions(true);
      }
    } else if (action === 'X') {
      if (this.isDialogueActive) {
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
        this.dialogueArrow.setVisible(true);
      }
    } else if (action === 'C') {
      if (!this.isDialogueActive && !this.isSavePromptActive) {
        this.game.events.emit('open_overworld_menu');
      }
    }
  }
}
