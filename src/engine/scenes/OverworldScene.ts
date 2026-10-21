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

  // Save UI modal in-engine
  public isSavePromptActive = false;
  private savePromptContainer!: Phaser.GameObjects.Container;
  private saveSelectedOption: 'save' | 'return' = 'save';
  private savePromptSoul!: Phaser.GameObjects.Sprite;
  private saveTextRef!: Phaser.GameObjects.Text;

  // Awakening animation state
  private wakeUpTween: Phaser.Tweens.Tween | null = null;
  private wakeUpPromptText: Phaser.GameObjects.Text | null = null;

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
          text: '* Flores douradas.\n* Elas devem ter amortecido sua queda.',
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
          text: '* Howdy! Eu sou FLOWEY. FLOWEY a FLOR!\n* Você é novo no Subterrâneo, não é?\n* Acho que o bom e velho Flowey terá que te ensinar como as coisas funcionam por aqui!',
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
          text: '* A sombra das Ruínas paira no ar, mas a presença calorosa de Toriel enche você de DETERMINAÇÃO.\n\n* (HP restaurado e Jogo Salvo!)',
        },
        {
          type: 'npc',
          x: 320,
          y: 165,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          text: '* Bem-vindo à sua nova casa, pequenino!\n* Permita-me educá-lo sobre a operação das Ruínas.\n* As Ruínas estão repletas de quebra-cabeças antigos.\n* Não tenha medo, estou aqui para proteger você!',
        },
        {
          type: 'sign',
          x: 440,
          y: 175,
          text: '* O emblema gravado na parede púrpura: o lendário Delta Rune.\n* Três triângulos coroados por um orbe alado.',
        },
        {
          type: 'sign',
          x: 200,
          y: 350,
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
          text: '* A sombra das ruínas paira sobre você, mas o calor das flores douradas enche você de DETERMINAÇÃO.',
        },
        {
          type: 'sign',
          x: 440,
          y: 200,
          text: '* "Apenas os determinados podem resolver os enigmas da caverna subterrânea."',
        },
        {
          type: 'npc',
          x: 320,
          y: 190,
          npcKey: 'enemy_froggit',
          npcName: 'Froggit Educado',
          npcVoice: 'monster',
          text: '* Ribbit, ribbit.\n* (Olá humano! Pressione [C] a qualquer momento para abrir seus itens e equipamentos.)',
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
          targetRoom: 'ruins_puzzle',
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
          text: '* Você pisou no interruptor com um "CLIQUE"! Os espinhos ao norte recuaram para o chão.',
        },
        {
          type: 'spikes',
          x: 320,
          y: 220,
          id: 'spikes_gate',
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
          targetRoom: 'room_toriel_entrance',
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
          text: '* Saber que amigos cuidam de você enche você de DETERMINAÇÃO.',
        },
        {
          type: 'npc',
          x: 210,
          y: 180,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          text: '* Minha criança, tenha cuidado ao explorar as Ruínas!\n* Se encontrar problemas, você pode sempre poupar os monstros conversando com eles.',
        },
        {
          type: 'npc',
          x: 430,
          y: 180,
          npcKey: 'npc_sans',
          npcName: 'Sans',
          npcVoice: 'sans',
          text: '* e aí, pivete.\n* tá gostando do passeio no subterrâneo? me falaram que você tem um osso duro de roer pela frente.',
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
          text: '* NYEH HEH HEH! HUMANO!\n* VOCÊ CHEGOU ATÉ O PORTÃO DA CORTE REAL!\n* PREPARE-SE PARA TESTAR SUA CORAGEM EM COMBATE!',
        },
        {
          type: 'npc',
          x: 400,
          y: 180,
          npcKey: 'enemy_deltajester',
          npcName: 'Bufão Caótico',
          npcVoice: 'monster',
          text: '* CAOS, CAOS! QUER JOGAR COMIGO, HUMANO?! O MUNDO GIRA EM TORNO DE NÓS!',
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
    }

    // Create Dialogue and Save Containers
    this.createDialogueBox();
    this.createSavePrompt();

    // Listen for custom virtual inputs from UI
    this.events.on('virtual_action', this.handleVirtualAction, this);

    // Clean up on shutdown
    this.events.once('shutdown', () => {
      this.events.off('virtual_action', this.handleVirtualAction, this);
    });
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
    this.roomGroup.clear(true, true);
    this.wallsGroup.clear(true, true);
    this.interactablesGroup.clear(true, true);

    const room = this.rooms[roomId] || this.rooms.ruins_entrance;
    this.currentRoomId = room.id;
    gameState.setCurrentRoom(room.id);

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
        this.tweens.add({
          targets: sprite,
          scaleX: 1.15,
          scaleY: 1.15,
          yoyo: true,
          repeat: -1,
          duration: 600,
        });
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
        const isDown = gameState.getFlag('switch_puzzle_1');
        sprite = this.add.sprite(obj.x, obj.y, isDown ? 'prop_spikes_down' : 'prop_spikes_up');
        sprite.setData('blocking', !isDown);
      } else if (obj.type === 'npc') {
        if (obj.npcKey === 'flowey_friendly' && gameState.getFlag('flowey_met')) {
          return;
        }
        sprite = this.add.sprite(obj.x, obj.y, obj.npcKey || 'enemy_froggit');
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
    });
  }

  // --- SAVE PROMPT MODAL (V.0.0.2-EB.1) ---
  private createSavePrompt() {
    this.savePromptContainer = this.add.container(320, 240);
    this.savePromptContainer.setDepth(150);
    this.savePromptContainer.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.96);
    bg.lineStyle(4, 0xffffff, 1);
    bg.fillRoundedRect(-190, -90, 380, 180, 6);
    bg.strokeRoundedRect(-190, -90, 380, 180, 6);
    this.savePromptContainer.add(bg);

    this.saveTextRef = this.add.text(-160, -70, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
      lineSpacing: 10,
    });
    this.savePromptContainer.add(this.saveTextRef);

    const saveBtn = this.add.text(-120, 35, 'SALVAR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffff00',
    });
    saveBtn.setInteractive({ useHandCursor: true });
    saveBtn.on('pointerdown', () => this.confirmSaveOption());
    this.savePromptContainer.add(saveBtn);

    const retBtn = this.add.text(40, 35, 'VOLTAR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    retBtn.setInteractive({ useHandCursor: true });
    retBtn.on('pointerdown', () => {
      this.saveSelectedOption = 'return';
      this.confirmSaveOption();
    });
    this.savePromptContainer.add(retBtn);

    this.savePromptSoul = this.add.sprite(-140, 42, 'soul_red');
    this.savePromptSoul.setScale(1.1);
    this.savePromptContainer.add(this.savePromptSoul);
  }

  private openSavePrompt() {
    this.isSavePromptActive = true;
    this.saveSelectedOption = 'save';
    const stats = gameState.getStats();
    const roomName = this.rooms[this.currentRoomId]?.name || 'Ruínas';

    this.saveTextRef.setText(
      `${stats.name}   LV ${stats.lv}\n${roomName}\n\n* HP Restaurado ao Máximo!`
    );

    this.savePromptSoul.setPosition(-145, 42);
    this.savePromptContainer.setVisible(true);
    soundManager.playSave();
    gameState.restoreFullHp();
  }

  private updateSavePromptCursor() {
    if (this.saveSelectedOption === 'save') {
      this.savePromptSoul.setPosition(-145, 42);
    } else {
      this.savePromptSoul.setPosition(15, 42);
    }
  }

  private confirmSaveOption() {
    if (this.saveSelectedOption === 'save') {
      gameState.saveGame();
      soundManager.playSave();
      this.saveTextRef.setText(
        `Arquivo Salvo!\n\n* Sua DETERMINAÇÃO foi registrada.`
      );
      this.time.delayedCall(1000, () => {
        this.closeSavePrompt();
      });
    } else {
      soundManager.playMenuSelect();
      this.closeSavePrompt();
    }
  }

  private closeSavePrompt() {
    this.isSavePromptActive = false;
    this.savePromptContainer.setVisible(false);
  }

  private createDialogueBox() {
    this.dialogueBox = this.add.container(320, 410);
    this.dialogueBox.setDepth(100);
    this.dialogueBox.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.lineStyle(4, 0xffffff, 1);
    bg.fillRoundedRect(-280, -55, 560, 110, 6);
    bg.strokeRoundedRect(-280, -55, 560, 110, 6);
    this.dialogueBox.add(bg);

    this.dialogueText = this.add.text(-255, -42, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: 510 },
      lineSpacing: 8,
    });
    this.dialogueBox.add(this.dialogueText);

    const arrow = this.add.text(245, 30, '▼', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffff00',
    });
    this.tweens.add({
      targets: arrow,
      alpha: 0.2,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
    this.dialogueBox.add(arrow);
  }

  public showDialogue(
    text: string | string[],
    voice: 'toriel' | 'sans' | 'papyrus' | 'monster' | 'flowey' = 'monster'
  ) {
    this.isDialogueActive = true;
    this.activeVoice = voice;
    this.dialogueQueue = Array.isArray(text) ? [...text] : [text];
    this.dialogueBox.setVisible(true);
    this.advanceDialogue();
  }

  private advanceDialogue() {
    if (this.dialogueQueue.length === 0) {
      this.closeDialogue();
      return;
    }
    this.currentFullText = this.dialogueQueue.shift() || '';
    this.displayedCharIndex = 0;
    this.dialogueText.setText('');
    this.typewriterTimer = 0;
  }

  private closeDialogue() {
    this.isDialogueActive = false;
    this.dialogueBox.setVisible(false);
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

    if (left || right) {
      this.saveSelectedOption = this.saveSelectedOption === 'save' ? 'return' : 'save';
      soundManager.playMenuMove();
      this.updateSavePromptCursor();
    }

    if (confirm) {
      this.confirmSaveOption();
    } else if (cancel) {
      this.closeSavePrompt();
    }
  }

  private handleDialogueTyping(delta: number) {
    const justPressedZ =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    const justPressedX = Phaser.Input.Keyboard.JustDown(this.wasd.X);

    if (justPressedX && this.displayedCharIndex < this.currentFullText.length) {
      this.displayedCharIndex = this.currentFullText.length;
      this.dialogueText.setText(this.currentFullText);
      return;
    }

    if (this.displayedCharIndex < this.currentFullText.length) {
      this.typewriterTimer += delta;
      if (this.typewriterTimer > 35) {
        this.typewriterTimer = 0;
        this.displayedCharIndex++;
        const nextChar = this.currentFullText[this.displayedCharIndex - 1];
        this.dialogueText.setText(this.currentFullText.substring(0, this.displayedCharIndex));

        if (nextChar && nextChar.trim() !== '') {
          soundManager.playVoiceBlip(this.activeVoice);
        }
      }

      if (justPressedZ) {
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
      }
    } else {
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
    if (this.isTransitioning) return;

    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (cfg && cfg.type === 'door' && cfg.targetRoom) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cfg.x, cfg.y);
        if (dist < 32) {
          this.switchRoom(cfg.targetRoom, cfg.targetX || 320, cfg.targetY || 300);
        }
      }
    });
  }

  public switchRoom(targetRoom: string, targetX: number, targetY: number) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.buildRoom(targetRoom);
      this.player.setPosition(targetX, targetY);
      gameState.setPlayerPos(targetX, targetY);

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
      });
    });
  }

  private checkInteractions() {
    const justPressedZ =
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
    let minDistance = 45;

    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (!cfg || cfg.type === 'door') return;

      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (d < minDistance) {
        minDistance = d;
        closestObj = sprite;
      }
    });

    if (closestObj) {
      this.handleInteractableAction(closestObj);
    }
  }

  private handleInteractableAction(sprite: Phaser.GameObjects.Sprite) {
    const cfg = sprite.getData('config');
    if (!cfg) return;

    if (cfg.type === 'save') {
      this.openSavePrompt();
    } else if (cfg.type === 'sign') {
      soundManager.playMenuSelect();
      this.showDialogue(cfg.text || '* Uma placa de madeira.');
    } else if (cfg.type === 'chest') {
      const chestOpenedKey = `chest_${cfg.itemId}`;
      if (gameState.getFlag(chestOpenedKey)) {
        this.showDialogue('* O baú já está vazio.');
      } else {
        const item = ALL_ITEMS.find((i) => i.id === cfg.itemId);
        if (item) {
          const added = gameState.addItem(item);
          if (added) {
            soundManager.playSave();
            gameState.setFlag(chestOpenedKey, true);
            this.showDialogue(cfg.text || `* Você encontrou [${item.name}]!`);
          } else {
            this.showDialogue('* Seu inventário está cheio!');
          }
        }
      }
    } else if (cfg.type === 'switch') {
      const isAlreadyOn = gameState.getFlag(cfg.id);
      if (!isAlreadyOn) {
        soundManager.playMenuSelect();
        gameState.setFlag(cfg.id, true);
        sprite.setTexture('prop_switch_on');

        this.interactablesGroup.getChildren().forEach((ch) => {
          const s = ch as Phaser.GameObjects.Sprite;
          const c = s.getData('config');
          if (c && c.type === 'spikes') {
            s.setTexture('prop_spikes_down');
            s.setData('blocking', false);
          }
        });

        this.showDialogue(cfg.text || '* Clique! Algo se moveu na sala.');
      } else {
        this.showDialogue('* O interruptor já foi ativado.');
      }
    } else if (cfg.type === 'npc') {
      if (cfg.npcKey === 'flowey_friendly') {
        this.showDialogue(
          [
            '* Howdy! Eu sou FLOWEY. FLOWEY a FLOR!',
            '* Hmm... Você é novo no Subterrâneo, não é?\n* Deve estar tão confuso...',
            '* Alguém precisa te ensinar como as coisas funcionam por aqui!',
            '* Acho que o bom e velho Flowey terá que fazer isso.\n* Pronto? Vamos lá!',
          ],
          'flowey'
        );

        this.time.delayedCall(4500, () => {
          this.scene.start('FloweyBattleScene');
        });
      } else if (cfg.npcKey === 'npc_toriel') {
        const torielSpoken = gameState.getFlag('toriel_intro_spoken');
        if (!torielSpoken) {
          gameState.setFlag('toriel_intro_spoken', true);
          this.showDialogue(
            [
              '* Bem-vindo à sua nova casa, pequenino!',
              '* Permita-me educá-lo sobre a operação das Ruínas.',
              '* As Ruínas estão repletas de quebra-cabeças antigos entre portas e corredores.',
              '* Para avançar, você precisará resolvê-los. Mas não se preocupe, eu já destranquei o portão norte para você!',
              '* Pode me seguir quando estiver pronto, minha criança.',
            ],
            'toriel'
          );
        } else {
          this.showDialogue(
            [
              '* Você está com fome? Mal posso esperar para assar uma Torta de Caramelo bem quentinha para nós...',
              '* Lembre-se: se encontrar algum monstro travesso, seja gentil e converse com ele pelo comando [AGIR].',
              '* Eu vou estar logo à frente esperando por você!',
            ],
            'toriel'
          );
        }
      } else if (cfg.npcKey === 'enemy_sir_ossos') {
        this.startBattle('sir_ossos');
      } else if (cfg.npcKey === 'enemy_deltajester') {
        this.startBattle('deltajester');
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

  private handleVirtualAction(action: string) {
    if (!gameState.getFlag('frisk_awoken')) {
      this.wakeUpFrisk();
      return;
    }

    if (action === 'Z') {
      if (this.isSavePromptActive) {
        this.confirmSaveOption();
      } else if (this.isDialogueActive) {
        this.advanceDialogue();
      } else {
        this.checkInteractions();
      }
    } else if (action === 'X') {
      if (this.isSavePromptActive) {
        this.closeSavePrompt();
      } else if (this.isDialogueActive) {
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
      }
    } else if (action === 'C') {
      this.game.events.emit('open_overworld_menu');
    }
  }
}
