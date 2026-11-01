import Phaser from 'phaser';
import { ALL_ITEMS } from '../../data/defaultData';
import { soundManager } from '../../services/soundSynthesizer';
import { CharacterVoice, DialogueNode, DialoguePage } from '../../types/dialogue';
import { DialogueManager } from '../DialogueManager';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';
import { triggerScreenShake } from '../utils/screenShake';

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

  // Cutscene state (e.g. Flowey encounter intro and Toriel entrance)
  public isCutsceneActive = false;
  private floweyCutsceneTriggered = false;
  private floweyNpcSprite: Phaser.GameObjects.Sprite | null = null;
  private torielEntranceNpcSprite: Phaser.GameObjects.Sprite | null = null;
  private torielSwitchNpcSprite: Phaser.GameObjects.Sprite | null = null;
  private torielDummyNpcSprite: Phaser.GameObjects.Sprite | null = null;
  private torielHouseNpcSprite: Phaser.GameObjects.Sprite | null = null;
  private dummyNpcSprite: Phaser.GameObjects.Sprite | null = null;

  // Room definitions with generous door buffer zones
  private rooms: Record<string, RoomData> = {
    room_awakening: {
      id: 'room_awakening',
      name: 'O Despertar nas Flores Douradas',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        // Chamber top stepped walls
        { x: 32, y: 144 }, { x: 64, y: 120 }, { x: 96, y: 120 }, { x: 128, y: 120 },
        { x: 160, y: 120 }, { x: 192, y: 144 }, { x: 224, y: 168 },
        // Corridor top wall
        { x: 256, y: 192 }, { x: 288, y: 192 }, { x: 320, y: 192 }, { x: 352, y: 192 },
        { x: 384, y: 192 }, { x: 416, y: 192 }, { x: 448, y: 192 }, { x: 480, y: 192 },
        { x: 512, y: 192 }, { x: 544, y: 192 },
        // Left cavern stepped wall
        { x: 16, y: 176 }, { x: 16, y: 208 }, { x: 16, y: 240 }, { x: 16, y: 272 }, { x: 16, y: 304 },
        // Chamber bottom stepped walls
        { x: 32, y: 328 }, { x: 64, y: 352 }, { x: 96, y: 352 }, { x: 128, y: 352 },
        { x: 160, y: 352 }, { x: 192, y: 328 }, { x: 224, y: 304 },
        // Corridor bottom wall
        { x: 256, y: 280 }, { x: 288, y: 280 }, { x: 320, y: 280 }, { x: 352, y: 280 },
        { x: 384, y: 280 }, { x: 416, y: 280 }, { x: 448, y: 280 }, { x: 480, y: 280 },
        { x: 512, y: 280 }, { x: 544, y: 280 }, { x: 576, y: 280 },
      ],
      objects: [
        {
          type: 'sign',
          x: 130,
          y: 240,
          npcKey: 'prop_golden_flowerbed',
          dialogueId: 'room1_flowerbed',
          text: '* Flores douradas.\n* Elas amorteceram sua queda das alturas do Monte Ebott.',
        },
        {
          type: 'sign',
          x: 130,
          y: 160,
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
        // West corridor walls (top and bottom)
        { x: 32, y: 192 }, { x: 64, y: 192 }, { x: 96, y: 192 }, { x: 128, y: 192 }, { x: 160, y: 192 },
        { x: 32, y: 288 }, { x: 64, y: 288 }, { x: 96, y: 288 }, { x: 128, y: 288 }, { x: 160, y: 288 },

        // Chamber top stepped walls
        { x: 192, y: 160 }, { x: 224, y: 128 }, { x: 256, y: 128 },
        // North grand passage walls
        { x: 256, y: 96 }, { x: 256, y: 64 },
        { x: 384, y: 64 }, { x: 384, y: 96 },
        { x: 384, y: 128 }, { x: 416, y: 128 }, { x: 448, y: 160 },

        // East chamber stepped walls
        { x: 480, y: 192 }, { x: 480, y: 224 }, { x: 480, y: 256 }, { x: 480, y: 288 },

        // Chamber bottom stepped walls
        { x: 448, y: 320 }, { x: 416, y: 352 }, { x: 384, y: 352 }, { x: 352, y: 352 },
        { x: 320, y: 352 }, { x: 288, y: 352 }, { x: 256, y: 352 }, { x: 224, y: 352 },
        { x: 192, y: 320 },
      ],
      objects: [
        {
          type: 'door',
          x: 54,
          y: 240,
          npcKey: 'prop_arch_door',
          targetRoom: 'room_awakening',
          targetX: 520,
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
          y: 80,
          npcKey: 'prop_arch_door',
          targetRoom: 'room_toriel_entrance',
          targetX: 320,
          targetY: 410,
        },
      ],
    },

    room_toriel_entrance: {
      id: 'room_toriel_entrance',
      name: 'Ruínas - Entrada',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        {
          type: 'save',
          x: 235,
          y: 275,
          id: 'save_toriel_entrance',
          dialogueId: 'save_toriel_entrance',
          text: '* A sombra das ruínas paira sobre você, enchendo-o de DETERMINAÇÃO.\n\n* (HP totalmente restaurado e Arquivo Salvo!)',
        },
        {
          type: 'sign',
          x: 190,
          y: 280,
          npcKey: 'prop_leaf_pile',
          dialogueId: 'leaves_ruins_entrance',
          text: '* Folhas caídas de outono, aconchegantes e crocantes.\n* O aroma agradável de folhas caídas enche você de DETERMINAÇÃO.',
        },
        {
          type: 'sign',
          x: 430,
          y: 275,
          dialogueId: 'sign_ruins_intro',
          text: '* "Apenas os destemidos podem prosseguir.\n* Bravos, tolos. Ambos não seguem o caminho do meio."',
        },
        {
          type: 'sign',
          x: 320,
          y: 44,
          npcKey: 'prop_delta_rune_carving',
          dialogueId: 'sign_delta_rune',
          text: '* O lendário emblema gravado na parede púrpura: o Delta Rune.\n* Três triângulos coroados por um orbe alado, o símbolo sagrado do Reino dos Monstros.',
        },
        {
          type: 'npc',
          x: 320,
          y: 165,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_ruins_intro',
        },
        {
          type: 'door',
          x: 320,
          y: 445,
          targetRoom: 'room_flowey',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 72,
          npcKey: 'prop_arch_door',
          targetRoom: 'ruins_switch_chamber',
          targetX: 320,
          targetY: 360,
        },
      ],
    },

    ruins_switch_chamber: {
      id: 'ruins_switch_chamber',
      name: 'Ruínas - Sala dos Interruptores',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        {
          type: 'switch',
          x: 210,
          y: 125,
          id: 'switch_toriel_labeled',
          text: '* Você puxou o interruptor rotulado por Toriel com um "CLIQUE"! Os espinhos de ferro recuaram para o chão.',
        },
        {
          type: 'sign',
          x: 165,
          y: 125,
          npcKey: 'prop_chalk_marking',
          dialogueId: 'sign_switch_labeled',
          text: '* Bilhete em giz amarelo por Toriel:\n* "Por favor, aperte este interruptor! - Toriel ❤"',
        },
        {
          type: 'sign',
          x: 125,
          y: 125,
          dialogueId: 'sign_switch_labeled',
          text: '* Bilhete em giz amarelo por Toriel:\n* "Por favor, aperte este interruptor! - Toriel ❤"',
        },
        {
          type: 'switch',
          x: 430,
          y: 125,
          id: 'switch_unlabeled',
          text: '* (Um interruptor comum não rotulado. Toriel não marcou este com giz.)',
        },
        {
          type: 'sign',
          x: 470,
          y: 125,
          dialogueId: 'sign_switch_unlabeled',
          text: '* (Um interruptor comum na parede. Toriel não colocou nenhuma etiqueta neste.)',
        },
        ...[260, 290, 320, 350, 380].map((sx) => ({
          type: 'spikes' as const,
          x: sx,
          y: 145,
          id: 'spikes_switch_chamber',
          dialogueId: 'spikes_active',
        })),
        {
          type: 'npc',
          x: 400,
          y: 145,
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
          y: 445,
          targetRoom: 'room_toriel_entrance',
          targetX: 320,
          targetY: 100,
        },
        {
          type: 'door',
          x: 320,
          y: 72,
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
      wallTiles: [],
      objects: [
        {
          type: 'npc',
          x: 260,
          y: 220,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_dummy_advice',
        },
        {
          type: 'npc',
          x: 370,
          y: 220,
          npcKey: 'prop_dummy',
          npcName: 'Manequim',
          npcVoice: 'monster',
          dialogueId: 'dummy_practice',
        },
        {
          type: 'sign',
          x: 175,
          y: 360,
          npcKey: 'prop_leaf_pile',
          dialogueId: 'leaves_dummy_room',
          text: '* Uma pilha aconchegante de folhas caídas.\n* O aroma adocicado do outono subterrâneo enche você de DETERMINAÇÃO.',
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
          y: 445,
          targetRoom: 'ruins_switch_chamber',
          targetX: 320,
          targetY: 100,
        },
        {
          type: 'door',
          x: 320,
          y: 72,
          npcKey: 'prop_arch_door',
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
          x: 250,
          y: 300,
          id: 'switch_puzzle_1',
          dialogueId: 'switch_puzzle_1',
          text: '* Você puxou a alavanca com um "CLIQUE"! Os espinhos de ferro recuaram para o chão.',
        },
        {
          type: 'sign',
          x: 212,
          y: 300,
          npcKey: 'prop_chalk_marking',
          text: '* Seta em giz amarelo apontando para a alavanca correta:\n* [Z], pisar ou clique do mouse para acionar.',
        },
        {
          type: 'switch',
          x: 370,
          y: 300,
          id: 'switch_puzzle_dummy',
          text: '* (Você puxou a outra alavanca... Um rangido ecoa, mas nada aconteceu com os espinhos.)\n* Procure a alavanca marcada com giz amarelo!',
        },
        ...[144, 176, 208, 240, 272, 304, 336, 368, 400, 432, 464, 496].map((sx) => ({
          type: 'spikes' as const,
          x: sx,
          y: 220,
          id: 'spikes_gate',
          dialogueId: 'spikes_active',
        })),
        {
          type: 'chest',
          x: 440,
          y: 160,
          itemId: 'toy_knife',
          text: '* Você abriu o baú antigo... Encontrou uma [Faca de Brinquedo] (ATK +3)!',
        },
        {
          type: 'sign',
          x: 320,
          y: 360,
          text: '* DICA: Puxe a alavanca prateada marcada com giz à esquerda [Z / Clique] para desarmar a armadilha de espinhos.',
        },
        {
          type: 'npc',
          x: 450,
          y: 300,
          npcKey: 'enemy_froggit',
          npcName: 'Froggit',
          npcVoice: 'monster',
          dialogueId: 'froggit_encounter',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_dummy_room',
          targetX: 320,
          targetY: 130,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          npcKey: 'prop_arch_door',
          targetRoom: 'ruins_long_hall',
          targetX: 320,
          targetY: 360,
        },
      ],
    },

    ruins_long_hall: {
      id: 'ruins_long_hall',
      name: 'O Longo Corredor das Ruínas',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 128, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 480, y: i * 32 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'save',
          x: 220,
          y: 280,
          id: 'save_long_hall',
          dialogueId: 'save_long_hall',
          text: '* Saber que um dia você poderá andar com segurança e determinação pelas Ruínas enche você de DETERMINAÇÃO.',
        },
        {
          type: 'npc',
          x: 320,
          y: 150,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_independence_test',
        },
        {
          type: 'sign',
          x: 400,
          y: 220,
          text: '* "Por favor, aguarde aqui pacientemente enquanto a Mamãe prepara uma deliciosa torta de caramelo e canela."',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_puzzle',
          targetX: 320,
          targetY: 130,
        },
      ],
    },

    room_toriel_house_exterior: {
      id: 'room_toriel_house_exterior',
      name: 'Ruínas - Fachada da Casa de Toriel',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        {
          type: 'sign',
          x: 440,
          y: 130,
          npcKey: 'prop_toriel_house',
          dialogueId: 'sign_toriel_door',
        },
        {
          type: 'sign',
          x: 190,
          y: 160,
          npcKey: 'prop_bare_tree',
          dialogueId: 'sign_bare_tree',
        },
        {
          type: 'sign',
          x: 190,
          y: 265,
          npcKey: 'prop_autumn_carpet',
          dialogueId: 'leaves_ruins_entrance',
        },
        {
          type: 'door',
          x: 440,
          y: 195,
          targetRoom: 'room_toriel_house_interior',
          targetX: 320,
          targetY: 410,
        },
        {
          type: 'save',
          x: 285,
          y: 310,
          id: 'save_toriel_house',
          dialogueId: 'save_toriel_house',
          text: '* A visão desta casa acolhedora sob as árvores ancestrais enche você de DETERMINAÇÃO.\n\n* (HP totalmente restaurado e Arquivo Salvo!)',
        },
        {
          type: 'npc',
          x: 395,
          y: 215,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_house_repeat',
        },
        {
          type: 'door',
          x: 40,
          y: 340,
          targetRoom: 'ruins_dummy_room',
          targetX: 320,
          targetY: 120,
        },
      ],
    },

    room_toriel_house_interior: {
      id: 'room_toriel_house_interior',
      name: 'Casa de Toriel - Sala de Estar',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        {
          type: 'sign',
          x: 320,
          y: 220,
          npcKey: 'prop_cozy_rug',
        },
        {
          type: 'sign',
          x: 320,
          y: 125,
          npcKey: 'prop_fireplace',
          dialogueId: 'toriel_fireplace',
          text: '* Uma lareira de tijolos aconchegante.\n* Chamas mágicas crepitam suavemente, preenchendo toda a sala com um calor acolhedor.',
        },
        {
          type: 'sign',
          x: 230,
          y: 190,
          npcKey: 'prop_toriel_chair',
          dialogueId: 'toriel_armchair',
          text: '* A poltrona de veludo vermelha favorita de Toriel.\n* Ao lado há um livro aberto: "72 Fatos Incríveis sobre Caracóis - Edição Ilustrada".',
        },
        {
          type: 'sign',
          x: 165,
          y: 125,
          npcKey: 'prop_bookshelf',
          dialogueId: 'toriel_bookshelf',
          text: '* Uma estante de madeira alta repleta de enciclopédias de botânica subterrânea, livros de receitas e história dos monstros.',
        },
        {
          type: 'chest',
          x: 475,
          y: 130,
          id: 'toriel_pie_plate',
          npcKey: 'prop_kitchen_counter',
          itemId: 'butterscotch_pie',
          text: '* Uma fatia quentinha e dourada de Torta de Caramelo e Canela repousa sobre o balcão!\n* Você pegou a [Torta de Caramelo]!',
        },
        {
          type: 'sign',
          x: 420,
          y: 260,
          npcKey: 'prop_dining_table',
          dialogueId: 'toriel_dining_table',
          text: '* Uma mesa de jantar redonda e polida com carinho.\n* No centro há uma linda flor dourada em um vaso de vidro translúcido.',
        },
        {
          type: 'sign',
          x: 155,
          y: 270,
          npcKey: 'prop_cozy_plant',
          dialogueId: 'toriel_plant',
          text: '* Uma samambaia viçosa em um vaso de cerâmica.\n* As folhas parecem ter sido borrifadas com água fresca e amor esta manhã.',
        },
        {
          type: 'save',
          x: 220,
          y: 340,
          id: 'save_toriel_interior',
          dialogueId: 'save_toriel_interior',
          text: '* O aroma caloroso de torta de caramelo e canela recém-assada e a sensação de um lar seguro enchem você de DETERMINAÇÃO.',
        },
        {
          type: 'npc',
          x: 300,
          y: 210,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_house_interior_talk',
          text: '* Sinta-se em casa, minha criança! Há uma fatia quentinha de torta no balcão da cozinha esperando por você. ❤',
        },
        {
          type: 'door',
          x: 122,
          y: 135,
          targetRoom: 'room_toriel_hallway',
          targetX: 570,
          targetY: 260,
        },
        {
          type: 'door',
          x: 320,
          y: 445,
          targetRoom: 'room_toriel_house_exterior',
          targetX: 440,
          targetY: 225,
        },
      ],
    },

    room_toriel_hallway: {
      id: 'room_toriel_hallway',
      name: 'Casa de Toriel - Corredor',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        // Runner carpet down the center of the hallway
        {
          type: 'sign',
          x: 340,
          y: 260,
          npcKey: 'prop_hallway_runner',
        },
        // Door 1: Player's Bedroom
        {
          type: 'door',
          x: 440,
          y: 155,
          npcKey: 'prop_hallway_door',
          targetRoom: 'room_player_bedroom',
          targetX: 320,
          targetY: 410,
        },
        {
          type: 'sign',
          x: 475,
          y: 165,
          dialogueId: 'player_bedroom_door_sign',
        },
        // Door 2: Toriel's Bedroom
        {
          type: 'door',
          x: 300,
          y: 155,
          npcKey: 'prop_hallway_door',
          targetRoom: 'room_toriel_bedroom',
          targetX: 320,
          targetY: 410,
        },
        {
          type: 'sign',
          x: 335,
          y: 165,
          dialogueId: 'toriel_bedroom_door_sign',
        },
        // Door 3: Room Under Renovation (Locked)
        {
          type: 'sign',
          x: 180,
          y: 155,
          npcKey: 'prop_hallway_door',
          dialogueId: 'renovating_door_sign',
        },
        // Mirror on the wall
        {
          type: 'sign',
          x: 525,
          y: 140,
          dialogueId: 'hallway_mirror',
          text: '* É você, Frisk!\n* Apesar de tudo, continua sendo você.',
        },
        // Potted houseplant in corridor
        {
          type: 'sign',
          x: 235,
          y: 160,
          npcKey: 'prop_cozy_plant',
          text: '* Uma planta viçosa e saudável num vaso de cerâmica.\n* As folhas estão limpas e bem cuidadas.',
        },
        // West staircase leading down to subterranean passage
        {
          type: 'door',
          x: 70,
          y: 260,
          npcKey: 'prop_basement_stairs',
          targetRoom: 'room_toriel_basement',
          targetX: 130,
          targetY: 220,
        },
        {
          type: 'sign',
          x: 65,
          y: 185,
          dialogueId: 'basement_stairs_sign',
        },
        // East doorway back to Living Room
        {
          type: 'door',
          x: 605,
          y: 260,
          targetRoom: 'room_toriel_house_interior',
          targetX: 122,
          targetY: 170,
        },
        // Hallway Save Star
        {
          type: 'save',
          x: 490,
          y: 310,
          id: 'save_toriel_hallway',
          dialogueId: 'save_toriel_hallway',
          text: '* O silêncio reconfortante do corredor e a sensação de segurança deste lar enchem você de DETERMINAÇÃO.\n\n* (HP totalmente restaurado e Arquivo Salvo!)',
        },
      ],
    },

    room_player_bedroom: {
      id: 'room_player_bedroom',
      name: 'Casa de Toriel - Quarto da Criança',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        // Center cozy carpet
        {
          type: 'sign',
          x: 320,
          y: 290,
          npcKey: 'prop_cozy_rug',
        },
        // Frisk's Bed
        {
          type: 'sign',
          x: 440,
          y: 195,
          id: 'player_bed',
          npcKey: 'prop_player_bed',
        },
        // Flower Lamp on nightstand
        {
          type: 'sign',
          x: 375,
          y: 180,
          npcKey: 'prop_flower_lamp',
          dialogueId: 'player_lamp',
        },
        // Toy Box
        {
          type: 'sign',
          x: 215,
          y: 195,
          npcKey: 'prop_toy_box',
          dialogueId: 'player_toy_box',
        },
        // Wooden Dresser
        {
          type: 'sign',
          x: 140,
          y: 195,
          npcKey: 'prop_dresser',
          dialogueId: 'player_dresser',
        },
        // Potted plant on side
        {
          type: 'sign',
          x: 505,
          y: 285,
          npcKey: 'prop_cozy_plant',
        },
        // Exit Door back to Hallway
        {
          type: 'door',
          x: 320,
          y: 445,
          targetRoom: 'room_toriel_hallway',
          targetX: 440,
          targetY: 215,
        },
      ],
    },

    room_toriel_bedroom: {
      id: 'room_toriel_bedroom',
      name: 'Casa de Toriel - Quarto de Toriel',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        // Center cozy carpet
        {
          type: 'sign',
          x: 300,
          y: 300,
          npcKey: 'prop_cozy_rug',
        },
        // Toriel's Queen Bed
        {
          type: 'sign',
          x: 440,
          y: 200,
          npcKey: 'prop_toriel_bed',
          dialogueId: 'toriel_bed',
        },
        // Joke Diary on Nightstand
        {
          type: 'sign',
          x: 350,
          y: 180,
          npcKey: 'prop_toriel_diary',
          dialogueId: 'toriel_joke_diary',
        },
        // Clothes Wardrobe
        {
          type: 'sign',
          x: 175,
          y: 180,
          npcKey: 'prop_toriel_wardrobe',
          dialogueId: 'toriel_wardrobe',
        },
        // Snail Bookshelf
        {
          type: 'sign',
          x: 115,
          y: 270,
          npcKey: 'prop_bookshelf',
          dialogueId: 'toriel_snail_encyclopedia',
        },
        // Independent Cactus
        {
          type: 'sign',
          x: 505,
          y: 290,
          npcKey: 'prop_cozy_plant',
          dialogueId: 'toriel_cactus',
        },
        // Exit Door back to Hallway
        {
          type: 'door',
          x: 320,
          y: 445,
          targetRoom: 'room_toriel_hallway',
          targetX: 300,
          targetY: 215,
        },
      ],
    },

    room_toriel_basement: {
      id: 'room_toriel_basement',
      name: 'Ruínas - Saída Subterrânea',
      width: 640,
      height: 480,
      floorTile: 'tile_floor_ruins',
      wallTiles: [],
      objects: [
        // Stairs leading back up to the house
        {
          type: 'door',
          x: 90,
          y: 195,
          npcKey: 'prop_stairs_up',
          targetRoom: 'room_toriel_hallway',
          targetX: 110,
          targetY: 260,
        },
        // Sign near the stairs
        {
          type: 'sign',
          x: 150,
          y: 170,
          dialogueId: 'basement_stairs_sign',
        },
        // Basement Save Star
        {
          type: 'save',
          x: 270,
          y: 260,
          id: 'save_toriel_basement',
          dialogueId: 'save_toriel_basement',
          text: '* O ar gélido vindo do fundo do corredor e a sensação iminente de liberdade enchem você de DETERMINAÇÃO.\n\n* (HP totalmente restaurado e Arquivo Salvo!)',
        },
        // Toriel NPC standing before the gate
        {
          type: 'npc',
          x: 435,
          y: 220,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          dialogueId: 'toriel_basement_talk',
        },
        // Monumental Grand Ruins Exit Gate
        {
          type: 'sign',
          x: 535,
          y: 200,
          npcKey: 'prop_basement_gate',
          dialogueId: 'ruins_exit_gate',
        },
      ],
    },
  };

  constructor() {
    super('OverworldScene');
  }

  create() {
    gameState.setActiveScene('OverworldScene');
    SpriteGenerator.generateAllTextures(this);

    this.currentRoomId = gameState.getCurrentRoom();
    this.roomGroup = this.add.group();
    this.wallsGroup = this.add.group();
    this.interactablesGroup = this.add.group();
    this.isTransitioning = false;
    this.transitionCooldown = 500;

    // Sound: Fallen Down for Ruins Entrance and Toriel's Home, Overworld for other exploration
    if (
      this.currentRoomId === 'room_toriel_entrance' ||
      this.currentRoomId === 'room_toriel_house_exterior' ||
      this.currentRoomId === 'room_toriel_house_interior' ||
      this.currentRoomId === 'room_toriel_hallway' ||
      this.currentRoomId === 'room_player_bedroom' ||
      this.currentRoomId === 'room_toriel_bedroom'
    ) {
      soundManager.playMusic('fallen_down');
    } else {
      soundManager.playMusic('overworld');
    }

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
    const initialRoomName = this.rooms[this.currentRoomId]?.name || this.currentRoomId;
    gameState.setCurrentRoomName(initialRoomName);

    const savedPos = gameState.getPlayerPos();
    const isAwoken = gameState.getFlag('frisk_awoken');
    const spawnX = this.currentRoomId === 'room_awakening' && !isAwoken ? 130 : savedPos.x;
    const spawnY = this.currentRoomId === 'room_awakening' && !isAwoken ? 240 : savedPos.y;
    const initialTexture =
      this.currentRoomId === 'room_awakening' && !isAwoken
        ? 'player_fallen'
        : 'player_down_0';
    this.player = this.add.sprite(spawnX, spawnY, initialTexture);
    this.player.setDepth(10);

    if (this.currentRoomId === 'room_awakening' && !isAwoken) {
      this.setupAwakeningState();
    } else if (this.currentRoomId === 'room_flowey' && !gameState.getFlag('flowey_met')) {
      this.time.delayedCall(350, () => {
        this.checkAndStartFloweyCutscene();
      });
    } else if (this.currentRoomId === 'room_toriel_entrance' && !gameState.getFlag('toriel_entrance_cutscene')) {
      this.time.delayedCall(400, () => {
        this.runTorielEntranceCutscene();
      });
    } else if (this.currentRoomId === 'ruins_switch_chamber' && !gameState.getFlag('toriel_switch_intro_spoken')) {
      this.time.delayedCall(400, () => {
        this.runTorielSwitchIntroCutscene();
      });
    } else if (this.currentRoomId === 'ruins_dummy_room') {
      if (!gameState.getFlag('toriel_dummy_intro_spoken')) {
        this.time.delayedCall(400, () => {
          this.runTorielDummyIntroCutscene();
        });
      } else if (gameState.getFlag('dummy_practiced') && !gameState.getFlag('toriel_dummy_solved_cutscene')) {
        this.time.delayedCall(400, () => {
          this.runTorielDummySolvedCutscene();
        });
      }
    } else if (this.currentRoomId === 'room_toriel_house_exterior') {
      if (!gameState.getFlag('toriel_house_arrival_cutscene')) {
        this.time.delayedCall(400, () => {
          this.runTorielHouseArrivalCutscene();
        });
      }
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

    const room = this.rooms[roomId] || this.rooms.room_awakening;
    this.currentRoomId = room.id;
    gameState.setCurrentRoom(room.id, undefined, undefined, room.name);

    // Floor & Atmospheric rendering
    if (room.id === 'room_awakening') {
      // 1. Non-square Undertale Room 1 authentic geometry
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep purple Ruins stone floor for the stepped cavern chamber and connecting corridor
      gfx.fillStyle(0x382d4d, 1);
      gfx.lineStyle(4, 0x221a30, 1);

      // Stepped chamber and long corridor polygon
      const floorPoly = [
        { x: 32, y: 176 },
        { x: 64, y: 176 },
        { x: 64, y: 144 },
        { x: 196, y: 144 },
        { x: 196, y: 176 },
        { x: 224, y: 176 },
        { x: 224, y: 216 },
        { x: 596, y: 216 },
        { x: 596, y: 264 },
        { x: 224, y: 264 },
        { x: 224, y: 304 },
        { x: 196, y: 304 },
        { x: 196, y: 336 },
        { x: 64, y: 336 },
        { x: 64, y: 304 },
        { x: 32, y: 304 },
      ];

      gfx.beginPath();
      gfx.moveTo(floorPoly[0].x, floorPoly[0].y);
      for (let i = 1; i < floorPoly.length; i++) {
        gfx.lineTo(floorPoly[i].x, floorPoly[i].y);
      }
      gfx.closePath();
      gfx.fillPath();
      gfx.strokePath();

      // Subtle tiled stone grid lines in hallway and chamber
      gfx.lineStyle(1, 0x483a60, 0.45);
      for (let x = 64; x < 590; x += 32) {
        gfx.lineBetween(x, 216, x, 264);
      }
      gfx.lineBetween(224, 240, 590, 240);

      // Concentric spotlight from the hole in Mt. Ebott (matching original Undertale / reference image)
      // Layer 1: Outermost soft lavender light ring
      gfx.fillStyle(0x6e6388, 1);
      gfx.fillEllipse(130, 240, 154, 88);

      // Layer 2: Inner soft lilac ring
      gfx.fillStyle(0x988eb7, 1);
      gfx.fillEllipse(130, 240, 132, 72);

      // Layer 3: Vibrant green oval grass mound
      gfx.fillStyle(0x2fa639, 1);
      gfx.fillEllipse(130, 240, 102, 52);

      // Layer 4: Inner grass mound shading
      gfx.fillStyle(0x258b2e, 1);
      gfx.fillEllipse(130, 240, 92, 44);

      this.roomGroup.add(gfx);

      // Atmospheric soft sunlight cone & floating dust motes
      const beam = this.add.graphics();
      beam.fillStyle(0xfff8d6, 0.08);
      beam.fillTriangle(130, 0, 40, 310, 220, 310);
      beam.fillStyle(0xfffae6, 0.14);
      beam.fillTriangle(130, 0, 75, 280, 185, 280);
      beam.setDepth(3);
      this.roomGroup.add(beam);

      for (let i = 0; i < 16; i++) {
        const px = Phaser.Math.Between(70, 190);
        const py = Phaser.Math.Between(80, 290);
        const mote = this.add.circle(px, py, Phaser.Math.Between(1, 2), 0xfff9c4, 0.7);
        mote.setDepth(4);
        this.roomGroup.add(mote);

        this.tweens.add({
          targets: mote,
          y: py + Phaser.Math.Between(-14, 16),
          x: px + Phaser.Math.Between(-10, 10),
          alpha: { from: 0.2, to: 0.85 },
          duration: Phaser.Math.Between(2200, 3800),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'room_flowey') {
      // 2. Authentic non-square Undertale Room 2 (A Clareira de Flowey)
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep purple Ruins stone floor for the west corridor, central cavern chamber and north archway
      gfx.fillStyle(0x382d4d, 1);
      gfx.lineStyle(4, 0x221a30, 1);

      const floorPoly = [
        // West entry corridor (top)
        { x: 32, y: 216 },
        { x: 180, y: 216 },
        // Stepped transition to central chamber
        { x: 224, y: 160 },
        { x: 280, y: 160 },
        // North grand passage to Toriel's entrance
        { x: 280, y: 72 },
        { x: 360, y: 72 },
        { x: 360, y: 160 },
        // East chamber wall steps
        { x: 416, y: 160 },
        { x: 464, y: 208 },
        { x: 464, y: 272 },
        { x: 416, y: 320 },
        // South chamber wall
        { x: 224, y: 320 },
        // West corridor (bottom)
        { x: 180, y: 264 },
        { x: 32, y: 264 },
      ];

      gfx.beginPath();
      gfx.moveTo(floorPoly[0].x, floorPoly[0].y);
      for (let i = 1; i < floorPoly.length; i++) {
        gfx.lineTo(floorPoly[i].x, floorPoly[i].y);
      }
      gfx.closePath();
      gfx.fillPath();
      gfx.strokePath();

      // Subtle tiled stone grid lines in corridor and chamber
      gfx.lineStyle(1, 0x483a60, 0.4);
      for (let x = 64; x < 180; x += 32) {
        gfx.lineBetween(x, 216, x, 264);
      }
      gfx.lineBetween(32, 240, 180, 240);
      for (let x = 200; x < 450; x += 32) {
        gfx.lineBetween(x, 160, x, 320);
      }
      for (let y = 176; y < 310; y += 32) {
        gfx.lineBetween(224, y, 416, y);
      }
      // North passage lines
      gfx.lineBetween(320, 72, 320, 160);
      gfx.lineBetween(280, 116, 360, 116);

      // Central Sunlit Grass Mound (Center: 320, 240)
      // Layer 1: Outer soft purple/earth glow
      gfx.fillStyle(0x524368, 1);
      gfx.fillEllipse(320, 240, 140, 80);

      // Layer 2: Earth / soil transition ring
      gfx.fillStyle(0x1e5428, 1);
      gfx.fillEllipse(320, 240, 116, 64);

      // Layer 3: Lush green grass oval
      gfx.fillStyle(0x2fa639, 1);
      gfx.fillEllipse(320, 240, 96, 50);

      // Layer 4: Shaded grass details
      gfx.fillStyle(0x258b2e, 1);
      gfx.fillEllipse(320, 240, 84, 40);

      // Subtle grass texture pixels
      gfx.fillStyle(0x3bd647, 1);
      gfx.fillRect(290, 232, 3, 3);
      gfx.fillRect(344, 235, 3, 3);
      gfx.fillRect(312, 222, 3, 3);
      gfx.fillRect(328, 252, 3, 3);
      gfx.fillRect(302, 246, 3, 3);

      // If Flowey was already met and blasted by Toriel, show scorched center marks
      if (gameState.getFlag('flowey_met')) {
        gfx.fillStyle(0x2b2319, 0.7);
        gfx.fillEllipse(320, 240, 36, 18);
        gfx.fillStyle(0x181410, 0.85);
        gfx.fillEllipse(320, 240, 20, 10);
      }

      this.roomGroup.add(gfx);

      // Atmospheric soft sunlight cone shining down from the cavern ceiling onto Flowey
      const beam = this.add.graphics();
      beam.fillStyle(0xfff8d6, 0.08);
      beam.fillTriangle(320, 0, 220, 300, 420, 300);
      beam.fillStyle(0xfffae6, 0.14);
      beam.fillTriangle(320, 0, 260, 275, 380, 275);
      beam.setDepth(3);
      this.roomGroup.add(beam);

      // Floating dust / pollen motes in the sunbeam
      for (let i = 0; i < 16; i++) {
        const px = Phaser.Math.Between(250, 390);
        const py = Phaser.Math.Between(60, 280);
        const mote = this.add.circle(px, py, Phaser.Math.Between(1, 2), 0xfff9c4, 0.7);
        mote.setDepth(4);
        this.roomGroup.add(mote);

        this.tweens.add({
          targets: mote,
          y: py + Phaser.Math.Between(-14, 16),
          x: px + Phaser.Math.Between(-10, 10),
          alpha: { from: 0.2, to: 0.85 },
          duration: Phaser.Math.Between(2200, 3800),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'room_toriel_entrance') {
      // 3. Authentic Undertale Room 3 (Ruínas - Entrada / Ruins Entrance)
      // Custom grand entrance hall with purple stone architecture,
      // grand staircase, flanking stone pillars, Delta Rune relief, and atmospheric lighting.
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep purple stone floor for the south corridor, expansive entrance hall and northern stair dais
      gfx.fillStyle(0x382d4d, 1);
      gfx.lineStyle(4, 0x221a30, 1);

      const floorPoly = [
        // South corridor (from Flowey's clearing)
        { x: 272, y: 460 },
        { x: 368, y: 460 },
        { x: 368, y: 390 },
        // Grand hall (East wall)
        { x: 508, y: 390 },
        { x: 524, y: 370 },
        { x: 524, y: 175 },
        { x: 440, y: 155 },
        // Northern staircase dais (leads to the grand arch door)
        { x: 400, y: 155 },
        { x: 400, y: 64 },
        { x: 240, y: 64 },
        { x: 240, y: 155 },
        // Grand hall (West wall)
        { x: 200, y: 155 },
        { x: 116, y: 175 },
        { x: 116, y: 370 },
        { x: 132, y: 390 },
        { x: 272, y: 390 },
      ];

      gfx.beginPath();
      gfx.moveTo(floorPoly[0].x, floorPoly[0].y);
      for (let i = 1; i < floorPoly.length; i++) {
        gfx.lineTo(floorPoly[i].x, floorPoly[i].y);
      }
      gfx.closePath();
      gfx.fillPath();
      gfx.strokePath();

      // Stone tile grid lines inside the hall
      gfx.lineStyle(1, 0x483a60, 0.4);
      for (let x = 148; x < 500; x += 32) {
        gfx.lineBetween(x, 175, x, 390);
      }
      for (let y = 190; y < 390; y += 32) {
        gfx.lineBetween(132, y, 508, y);
      }
      // Corridor lines
      gfx.lineBetween(320, 390, 320, 460);
      gfx.lineBetween(272, 425, 368, 425);

      // Central ceremonial carpet / runner trim in rich purple-plum
      gfx.fillStyle(0x2a1d3b, 0.7);
      gfx.fillRect(268, 175, 104, 215);
      gfx.lineStyle(2, 0x584475, 0.8);
      gfx.strokeRect(268, 175, 104, 215);

      this.roomGroup.add(gfx);

      // Grand Wall Facade above the northern stairs
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x2a1738, 1);
      wallGfx.fillRect(180, 0, 280, 68);
      wallGfx.lineStyle(3, 0x1a0d24, 1);
      wallGfx.strokeRect(180, 0, 280, 68);

      // Brick pattern on back wall
      wallGfx.lineStyle(1, 0x412354, 0.6);
      for (let wy = 12; wy < 68; wy += 14) {
        wallGfx.lineBetween(180, wy, 460, wy);
      }
      for (let wx = 195; wx < 450; wx += 28) {
        wallGfx.lineBetween(wx, 0, wx, 68);
      }
      this.roomGroup.add(wallGfx);

      // Grand Tiered Stairs sprite (leads directly to northern arch)
      const stairs = this.add.sprite(320, 132, 'prop_ruins_stairs');
      stairs.setDepth(2);
      this.roomGroup.add(stairs);

      // Two Flanking Stone Pillars with climbing vines
      const leftPillar = this.add.sprite(210, 110, 'prop_ruins_pillar');
      leftPillar.setDepth(3);
      this.roomGroup.add(leftPillar);

      const rightPillar = this.add.sprite(430, 110, 'prop_ruins_pillar');
      rightPillar.setDepth(3);
      this.roomGroup.add(rightPillar);

      // Hanging ivy foliage cascading from upper walls
      const vineLeft = this.add.sprite(150, 175, 'prop_hanging_vines');
      vineLeft.setDepth(4);
      this.roomGroup.add(vineLeft);

      const vineRight = this.add.sprite(490, 175, 'prop_hanging_vines');
      vineRight.setDepth(4);
      this.roomGroup.add(vineRight);

      // Wall sconce lanterns with warm golden flame on left and right walls
      [
        { x: 125, y: 240 },
        { x: 515, y: 240 },
      ].forEach((torch) => {
        const torchGfx = this.add.graphics();
        torchGfx.setDepth(3);
        // Sconce bracket
        torchGfx.fillStyle(0x2c1d11, 1);
        torchGfx.fillRect(torch.x - 3, torch.y - 4, 6, 12);
        torchGfx.fillStyle(0xf39c12, 1);
        torchGfx.fillCircle(torch.x, torch.y - 6, 4);
        torchGfx.fillStyle(0xffff66, 1);
        torchGfx.fillCircle(torch.x, torch.y - 7, 2);
        this.roomGroup.add(torchGfx);

        // Soft radial glow
        const glow = this.add.circle(torch.x, torch.y - 6, 32, 0xffd277, 0.12);
        glow.setDepth(3);
        this.roomGroup.add(glow);

        this.tweens.add({
          targets: glow,
          scale: { from: 0.9, to: 1.15 },
          alpha: { from: 0.08, to: 0.16 },
          duration: Phaser.Math.Between(700, 1100),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // Ambient floating autumn leaf particles drifting gently across the entrance hall
      for (let i = 0; i < 10; i++) {
        const lx = Phaser.Math.Between(160, 480);
        const ly = Phaser.Math.Between(80, 420);
        const leaf = this.add.sprite(lx, ly, 'particle_leaf');
        leaf.setDepth(4);
        leaf.setScale(Phaser.Math.FloatBetween(0.7, 1.2));
        leaf.setAlpha(Phaser.Math.FloatBetween(0.4, 0.85));
        this.roomGroup.add(leaf);

        this.tweens.add({
          targets: leaf,
          y: ly + Phaser.Math.Between(20, 50),
          x: lx + Phaser.Math.Between(-18, 18),
          angle: Phaser.Math.Between(-45, 45),
          alpha: { from: 0.3, to: 0.9 },
          duration: Phaser.Math.Between(2600, 4500),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'ruins_switch_chamber') {
      // 4. Authentic Undertale Room 4 (Ruínas - Sala dos Interruptores)
      // Custom purple stone chamber with underground river canal,
      // stone bridge crossing, iron spike barrier, wall switches with chalk markings, and torches.
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep purple stone floor for the chamber
      gfx.fillStyle(0x382d4d, 1);
      gfx.lineStyle(4, 0x221a30, 1);
      gfx.fillRect(130, 72, 380, 375);
      gfx.strokeRect(130, 72, 380, 375);

      // Stone tile grid lines
      gfx.lineStyle(1, 0x483a60, 0.35);
      for (let x = 162; x < 500; x += 32) {
        gfx.lineBetween(x, 72, x, 445);
      }
      for (let y = 104; y < 445; y += 32) {
        gfx.lineBetween(130, y, 510, y);
      }

      // Underground Water Canal (running across the chamber horizontally)
      const waterGfx = this.add.graphics();
      waterGfx.setDepth(1);
      // River trench bed (dark violet-black void)
      waterGfx.fillStyle(0x130a1c, 1);
      waterGfx.fillRect(130, 185, 380, 75);

      // Deep cavern water body
      waterGfx.fillStyle(0x1a2639, 1);
      waterGfx.fillRect(130, 188, 380, 69);
      // Riverbank stone borders
      waterGfx.fillStyle(0x2d173b, 1);
      waterGfx.fillRect(130, 185, 380, 4);
      waterGfx.fillRect(130, 256, 380, 4);

      // Animated water ripple lines
      for (let i = 0; i < 5; i++) {
        const ry = 196 + i * 12;
        const ripple = this.add.rectangle(Phaser.Math.Between(160, 480), ry, Phaser.Math.Between(30, 70), 2, 0x487eb0, 0.45);
        ripple.setDepth(2);
        this.roomGroup.add(ripple);
        this.tweens.add({
          targets: ripple,
          alpha: { from: 0.2, to: 0.65 },
          x: ripple.x + Phaser.Math.Between(-15, 15),
          duration: Phaser.Math.Between(1800, 2800),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.roomGroup.add(waterGfx);

      // Solid Stone Bridge crossing over the water canal in the center
      const bridgeGfx = this.add.graphics();
      bridgeGfx.setDepth(2);
      bridgeGfx.fillStyle(0x43325c, 1);
      bridgeGfx.fillRect(265, 180, 110, 85);
      bridgeGfx.lineStyle(2, 0x221430, 1);
      bridgeGfx.strokeRect(265, 180, 110, 85);

      // Paved stone texture on the bridge
      bridgeGfx.lineStyle(1, 0x5a4478, 0.6);
      bridgeGfx.lineBetween(320, 180, 320, 265);
      bridgeGfx.lineBetween(265, 222, 375, 222);
      this.roomGroup.add(bridgeGfx);

      // Stone Bridge Balustrades on left and right sides
      const leftRail = this.add.sprite(265, 222, 'prop_bridge_rail');
      leftRail.setDepth(3);
      this.roomGroup.add(leftRail);

      const rightRail = this.add.sprite(375, 222, 'prop_bridge_rail');
      rightRail.setDepth(3);
      this.roomGroup.add(rightRail);

      // North Wall Facade above the chamber
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x2a1738, 1);
      wallGfx.fillRect(130, 0, 380, 72);
      wallGfx.lineStyle(3, 0x1a0d24, 1);
      wallGfx.strokeRect(130, 0, 380, 72);

      // Brick pattern on back wall
      wallGfx.lineStyle(1, 0x412354, 0.6);
      for (let wy = 14; wy < 72; wy += 14) {
        wallGfx.lineBetween(130, wy, 510, wy);
      }
      for (let wx = 150; wx < 500; wx += 28) {
        wallGfx.lineBetween(wx, 0, wx, 72);
      }
      this.roomGroup.add(wallGfx);

      // Wall sconce torches on left and right walls
      [
        { x: 145, y: 125 },
        { x: 495, y: 125 },
      ].forEach((torch) => {
        const torchGfx = this.add.graphics();
        torchGfx.setDepth(3);
        torchGfx.fillStyle(0x2c1d11, 1);
        torchGfx.fillRect(torch.x - 3, torch.y - 4, 6, 12);
        torchGfx.fillStyle(0xf39c12, 1);
        torchGfx.fillCircle(torch.x, torch.y - 6, 4);
        torchGfx.fillStyle(0xffff66, 1);
        torchGfx.fillCircle(torch.x, torch.y - 7, 2);
        this.roomGroup.add(torchGfx);

        const glow = this.add.circle(torch.x, torch.y - 6, 30, 0xffd277, 0.12);
        glow.setDepth(3);
        this.roomGroup.add(glow);

        this.tweens.add({
          targets: glow,
          scale: { from: 0.9, to: 1.15 },
          alpha: { from: 0.08, to: 0.16 },
          duration: Phaser.Math.Between(700, 1100),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // Hanging ivy tendrils from upper walls
      const vineLeft = this.add.sprite(155, 72, 'prop_hanging_vines');
      vineLeft.setDepth(4);
      this.roomGroup.add(vineLeft);

      const vineRight = this.add.sprite(485, 72, 'prop_hanging_vines');
      vineRight.setDepth(4);
      this.roomGroup.add(vineRight);

      // Subtle atmospheric cavern dust motes
      for (let i = 0; i < 8; i++) {
        const mx = Phaser.Math.Between(150, 490);
        const my = Phaser.Math.Between(80, 430);
        const mote = this.add.circle(mx, my, Phaser.Math.Between(1, 2), 0xfff9c4, 0.6);
        mote.setDepth(4);
        this.roomGroup.add(mote);
        this.tweens.add({
          targets: mote,
          y: my + Phaser.Math.Between(-12, 14),
          x: mx + Phaser.Math.Between(-8, 8),
          alpha: { from: 0.2, to: 0.75 },
          duration: Phaser.Math.Between(2200, 3600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.roomGroup.add(gfx);
    } else if (room.id === 'ruins_dummy_room') {
      // 5. Authentic Undertale Room 5 (Ruínas - Sala do Manequim de Treinamento)
      // Custom purple stone chamber, back wall facade, climbing ivy pillars,
      // training dais for dummy, wall sconce torches with flame glow, and floating motes.
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep purple stone floor
      gfx.fillStyle(0x382d4d, 1);
      gfx.lineStyle(4, 0x221a30, 1);
      gfx.fillRect(130, 72, 380, 375);
      gfx.strokeRect(130, 72, 380, 375);

      // Stone tile grid lines
      gfx.lineStyle(1, 0x483a60, 0.35);
      for (let x = 162; x < 500; x += 32) {
        gfx.lineBetween(x, 72, x, 445);
      }
      for (let y = 104; y < 445; y += 32) {
        gfx.lineBetween(130, y, 510, y);
      }

      // Stone training dais / platform for the Dummy in the center-right (Center: 370, 225)
      gfx.fillStyle(0x281c3b, 1);
      gfx.fillEllipse(370, 235, 70, 32);
      gfx.fillStyle(0x4a3765, 1);
      gfx.fillEllipse(370, 232, 60, 26);
      gfx.lineStyle(2, 0x241535, 1);
      gfx.strokeEllipse(370, 232, 60, 26);

      // North Wall Facade above the chamber (y: 0 to 72)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x2a1738, 1);
      wallGfx.fillRect(130, 0, 380, 72);
      wallGfx.lineStyle(3, 0x1a0d24, 1);
      wallGfx.strokeRect(130, 0, 380, 72);

      // Brick pattern on back wall
      wallGfx.lineStyle(1, 0x412354, 0.6);
      for (let wy = 14; wy < 72; wy += 14) {
        wallGfx.lineBetween(130, wy, 510, wy);
      }
      for (let wx = 150; wx < 500; wx += 28) {
        wallGfx.lineBetween(wx, 0, wx, 72);
      }
      this.roomGroup.add(wallGfx);

      // Ancient stone pillars flanking the chamber
      const leftPillar = this.add.sprite(175, 120, 'prop_ruins_pillar');
      leftPillar.setDepth(3);
      this.roomGroup.add(leftPillar);

      const rightPillar = this.add.sprite(465, 120, 'prop_ruins_pillar');
      rightPillar.setDepth(3);
      this.roomGroup.add(rightPillar);

      // Wall sconce torches on left and right walls with flickering warm glow
      [
        { x: 145, y: 160 },
        { x: 495, y: 160 },
      ].forEach((torch) => {
        const torchGfx = this.add.graphics();
        torchGfx.setDepth(3);
        torchGfx.fillStyle(0x2c1d11, 1);
        torchGfx.fillRect(torch.x - 3, torch.y - 4, 6, 12);
        torchGfx.fillStyle(0xf39c12, 1);
        torchGfx.fillCircle(torch.x, torch.y - 6, 4);
        torchGfx.fillStyle(0xffff66, 1);
        torchGfx.fillCircle(torch.x, torch.y - 7, 2);
        this.roomGroup.add(torchGfx);

        const glow = this.add.circle(torch.x, torch.y - 6, 30, 0xffd277, 0.12);
        glow.setDepth(3);
        this.roomGroup.add(glow);

        this.tweens.add({
          targets: glow,
          scale: { from: 0.9, to: 1.15 },
          alpha: { from: 0.08, to: 0.16 },
          duration: Phaser.Math.Between(700, 1100),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // Hanging ivy tendrils from upper walls
      const vineLeft = this.add.sprite(155, 72, 'prop_hanging_vines');
      vineLeft.setDepth(4);
      this.roomGroup.add(vineLeft);

      const vineRight = this.add.sprite(485, 72, 'prop_hanging_vines');
      vineRight.setDepth(4);
      this.roomGroup.add(vineRight);

      // Subtle atmospheric cavern dust motes
      for (let i = 0; i < 8; i++) {
        const mx = Phaser.Math.Between(150, 490);
        const my = Phaser.Math.Between(80, 430);
        const mote = this.add.circle(mx, my, Phaser.Math.Between(1, 2), 0xfff9c4, 0.6);
        mote.setDepth(4);
        this.roomGroup.add(mote);
        this.tweens.add({
          targets: mote,
          y: my + Phaser.Math.Between(-12, 14),
          x: mx + Phaser.Math.Between(-8, 8),
          alpha: { from: 0.2, to: 0.75 },
          duration: Phaser.Math.Between(2200, 3600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.roomGroup.add(gfx);
    } else if (room.id === 'room_toriel_house_exterior') {
      // 6. Authentic Undertale Home Exterior (Ruínas - Fachada da Casa de Toriel)
      // Custom cobblestone ground, backdrop cavern wall with rock stalactites,
      // warm porch lantern glow, and drifting autumn red/amber leaf particles.
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep reddish-purple stone courtyard
      gfx.fillStyle(0x351d38, 1);
      gfx.fillRect(0, 0, 640, 480);

      // Cobblestone floor lines
      gfx.lineStyle(1, 0x48284c, 0.4);
      for (let x = 0; x < 640; x += 32) {
        gfx.lineBetween(x, 180, x, 480);
      }
      for (let y = 180; y < 480; y += 24) {
        gfx.lineBetween(0, y, 640, y);
      }

      // Cavern backdrop wall (top area)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x220f26, 1);
      wallGfx.fillRect(0, 0, 640, 180);
      wallGfx.lineStyle(2, 0x17091a, 1);
      wallGfx.strokeRect(0, 0, 640, 180);

      // Distant cavern purple stone strata & stalactites
      wallGfx.fillStyle(0x2e1433, 1);
      for (let sx = 20; sx < 640; sx += 48) {
        wallGfx.beginPath();
        wallGfx.moveTo(sx, 0);
        wallGfx.lineTo(sx + 24, 0);
        wallGfx.lineTo(sx + 12, 28);
        wallGfx.closePath();
        wallGfx.fill();
      }

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Warm amber lantern glow on Toriel's cottage porch
      const porchGlow = this.add.circle(440, 150, 85, 0xffbe76, 0.18);
      porchGlow.setDepth(3);
      this.roomGroup.add(porchGlow);
      this.tweens.add({
        targets: porchGlow,
        scale: { from: 0.95, to: 1.1 },
        alpha: { from: 0.14, to: 0.22 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Drifting red and amber autumn leaves particles
      for (let i = 0; i < 14; i++) {
        const lx = Phaser.Math.Between(40, 600);
        const ly = Phaser.Math.Between(80, 440);
        const leaf = this.add.sprite(lx, ly, 'particle_leaf');
        leaf.setDepth(6);
        leaf.setAlpha(Phaser.Math.FloatBetween(0.5, 0.85));
        leaf.setScale(Phaser.Math.FloatBetween(0.8, 1.3));
        this.roomGroup.add(leaf);

        this.tweens.add({
          targets: leaf,
          y: ly + Phaser.Math.Between(15, 30),
          x: lx + Phaser.Math.Between(-14, 14),
          angle: Phaser.Math.Between(-30, 30),
          duration: Phaser.Math.Between(1800, 3200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'room_toriel_house_interior') {
      // 7. Authentic Undertale Toriel's Living Room Interior
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Warm wooden floorboards
      gfx.fillStyle(0x4a2a18, 1);
      gfx.fillRect(0, 0, 640, 480);

      // Floor plank lines
      gfx.lineStyle(1, 0x361c0e, 0.45);
      for (let y = 140; y < 480; y += 24) {
        gfx.lineBetween(0, y, 640, y);
      }
      for (let x = 0; x < 640; x += 64) {
        gfx.lineBetween(x, 140, x, 480);
      }

      // Elegant dark wainscoted wall facade on the north (y: 0 to 140)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x2d170d, 1);
      wallGfx.fillRect(0, 0, 640, 140);
      wallGfx.lineStyle(3, 0x1b0c06, 1);
      wallGfx.strokeRect(0, 0, 640, 140);

      // Wainscoting baseboard & wood panels
      wallGfx.fillStyle(0x3e2013, 1);
      wallGfx.fillRect(0, 100, 640, 40);
      wallGfx.lineStyle(1, 0x5a311f, 0.7);
      for (let wx = 30; wx < 640; wx += 48) {
        wallGfx.strokeRect(wx, 105, 36, 30);
      }

      // Framed Delta Rune Crest Painting above fireplace (x: 320, y: 55)
      wallGfx.fillStyle(0xb78b27, 1);
      wallGfx.fillRect(302, 36, 36, 28);
      wallGfx.fillStyle(0x1b120c, 1);
      wallGfx.fillRect(305, 39, 30, 22);
      wallGfx.fillStyle(0xffffff, 1);
      wallGfx.fillCircle(320, 47, 4);
      wallGfx.fillTriangle(314, 55, 320, 52, 326, 55);

      // Framed Golden Flower Painting (x: 440, y: 55)
      wallGfx.fillStyle(0xb78b27, 1);
      wallGfx.fillRect(426, 40, 28, 24);
      wallGfx.fillStyle(0x2c1e15, 1);
      wallGfx.fillRect(428, 42, 24, 20);
      wallGfx.fillStyle(0xf1c40f, 1);
      wallGfx.fillCircle(440, 52, 4);

      // Hallway Archway leading to bedroom corridor on the north wall (centered at x: 122, y: 50..140)
      // Dark doorway passage into the corridor
      wallGfx.fillStyle(0x110905, 1);
      wallGfx.fillRect(96, 52, 52, 88);

      // Perspective floor & red runner carpet visible inside the archway passage
      wallGfx.fillStyle(0x381e10, 1);
      wallGfx.fillRect(100, 118, 44, 22);
      wallGfx.fillStyle(0x8a2020, 1);
      wallGfx.fillRect(110, 122, 24, 18);

      // Wooden doorway arch trim & pillars
      wallGfx.fillStyle(0x5a311f, 1);
      wallGfx.fillRect(92, 48, 6, 92); // Left doorpost
      wallGfx.fillRect(146, 48, 6, 92); // Right doorpost
      wallGfx.fillRect(88, 44, 66, 8); // Top header/lintel beam
      wallGfx.lineStyle(2, 0x381e10, 1);
      wallGfx.strokeRect(88, 44, 66, 8);
      wallGfx.strokeRect(92, 48, 60, 92);

      // Warm hallway backlight spill onto the living room floor
      const archGlow = this.add.graphics();
      archGlow.setDepth(2);
      archGlow.fillStyle(0xffbe76, 0.14);
      archGlow.fillEllipse(122, 144, 56, 22);
      this.roomGroup.add(archGlow);

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Warm golden hearth glow from the fireplace (x: 320, y: 130)
      const hearthGlow = this.add.circle(320, 130, 110, 0xffa502, 0.16);
      hearthGlow.setDepth(3);
      this.roomGroup.add(hearthGlow);
      this.tweens.add({
        targets: hearthGlow,
        scale: { from: 0.94, to: 1.12 },
        alpha: { from: 0.12, to: 0.22 },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Drifting gentle warm fireplace sparks / cozy dust motes
      for (let i = 0; i < 9; i++) {
        const mx = Phaser.Math.Between(160, 480);
        const my = Phaser.Math.Between(150, 420);
        const spark = this.add.circle(mx, my, Phaser.Math.Between(1, 2), 0xffeaa7, 0.7);
        spark.setDepth(5);
        this.roomGroup.add(spark);
        this.tweens.add({
          targets: spark,
          y: my - Phaser.Math.Between(10, 24),
          x: mx + Phaser.Math.Between(-8, 8),
          alpha: { from: 0.2, to: 0.8 },
          duration: Phaser.Math.Between(2000, 3500),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'room_toriel_hallway') {
      // 8. Authentic Undertale Toriel's Home Hallway (Corredor da Casa)
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Warm wooden floorboards along the horizontal corridor
      gfx.fillStyle(0x4a2a18, 1);
      gfx.fillRect(40, 140, 560, 220);

      // Wooden floor plank lines
      gfx.lineStyle(1, 0x361c0e, 0.45);
      for (let y = 140; y <= 360; y += 24) {
        gfx.lineBetween(40, y, 600, y);
      }
      for (let x = 40; x <= 600; x += 64) {
        gfx.lineBetween(x, 140, x, 360);
      }

      // Elegant dark wainscoted wall facade on the north (y: 0 to 140)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x2d170d, 1);
      wallGfx.fillRect(40, 0, 560, 140);
      wallGfx.lineStyle(3, 0x1b0c06, 1);
      wallGfx.strokeRect(40, 0, 560, 140);

      // Wainscoting baseboard & wood panels
      wallGfx.fillStyle(0x3e2013, 1);
      wallGfx.fillRect(40, 100, 560, 40);
      wallGfx.lineStyle(1, 0x5a311f, 0.7);
      for (let wx = 60; wx < 580; wx += 44) {
        wallGfx.strokeRect(wx, 105, 34, 30);
      }

      // Framed flower artwork between doors
      // Frame 1 (x: 235, y: 55)
      wallGfx.fillStyle(0xb78b27, 1);
      wallGfx.fillRect(222, 40, 26, 22);
      wallGfx.fillStyle(0x2c1e15, 1);
      wallGfx.fillRect(224, 42, 22, 18);
      wallGfx.fillStyle(0x27ae60, 1);
      wallGfx.fillRect(233, 46, 4, 8);
      wallGfx.fillStyle(0xf1c40f, 1);
      wallGfx.fillCircle(235, 48, 3);

      // Frame 2 (x: 370, y: 55)
      wallGfx.fillStyle(0xb78b27, 1);
      wallGfx.fillRect(357, 40, 26, 22);
      wallGfx.fillStyle(0x2c1e15, 1);
      wallGfx.fillRect(359, 42, 22, 18);
      wallGfx.fillStyle(0x3498db, 1);
      wallGfx.fillRect(368, 46, 4, 8);
      wallGfx.fillStyle(0x9b59b6, 1);
      wallGfx.fillCircle(370, 48, 3);

      // Hallway mirror frame on the right wall (x: 525, y: 50)
      wallGfx.fillStyle(0xd4af37, 1);
      wallGfx.fillRect(510, 30, 30, 46);
      wallGfx.fillStyle(0x74b9ff, 1);
      wallGfx.fillRect(514, 34, 22, 38);
      wallGfx.fillStyle(0xffffff, 1);
      wallGfx.fillRect(516, 36, 6, 20);

      // East doorway arch opening to Living Room (x: 590 to 640)
      wallGfx.fillStyle(0x110905, 1);
      wallGfx.fillRect(580, 160, 40, 140);

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Warm wall sconces with glowing light
      [
        { x: 235, y: 85 },
        { x: 370, y: 85 },
        { x: 500, y: 85 },
      ].forEach((torch) => {
        const glow = this.add.circle(torch.x, torch.y, 70, 0xffbe76, 0.16);
        glow.setDepth(3);
        this.roomGroup.add(glow);
        this.tweens.add({
          targets: glow,
          scale: { from: 0.94, to: 1.1 },
          alpha: { from: 0.12, to: 0.2 },
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // Drifting gentle warm dust motes
      for (let i = 0; i < 8; i++) {
        const mx = Phaser.Math.Between(80, 560);
        const my = Phaser.Math.Between(160, 320);
        const mote = this.add.circle(mx, my, Phaser.Math.Between(1, 2), 0xfff9c4, 0.65);
        mote.setDepth(5);
        this.roomGroup.add(mote);
        this.tweens.add({
          targets: mote,
          y: my + Phaser.Math.Between(-10, 12),
          x: mx + Phaser.Math.Between(-8, 8),
          alpha: { from: 0.2, to: 0.8 },
          duration: Phaser.Math.Between(2200, 3600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (room.id === 'room_player_bedroom') {
      // 9. Authentic Undertale Player's Bedroom (Quarto da Criança)
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Wooden floor
      gfx.fillStyle(0x4a2a18, 1);
      gfx.fillRect(100, 140, 440, 320);

      // Floor plank lines
      gfx.lineStyle(1, 0x361c0e, 0.45);
      for (let y = 140; y <= 440; y += 24) {
        gfx.lineBetween(100, y, 540, y);
      }
      for (let x = 100; x <= 540; x += 55) {
        gfx.lineBetween(x, 140, x, 440);
      }

      // North Wall Facade (Soft warm teal/sage wainscoted tone)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x231d1d, 1);
      wallGfx.fillRect(100, 0, 440, 140);
      wallGfx.lineStyle(3, 0x140f0f, 1);
      wallGfx.strokeRect(100, 0, 440, 140);

      // Baseboard
      wallGfx.fillStyle(0x382c2c, 1);
      wallGfx.fillRect(100, 105, 440, 35);

      // Small sweet drawing on the wall (Crayon Golden Flower)
      wallGfx.fillStyle(0xf5f6fa, 1);
      wallGfx.fillRect(285, 45, 30, 26);
      wallGfx.fillStyle(0xf1c40f, 1);
      wallGfx.fillCircle(300, 56, 5);
      wallGfx.fillStyle(0x27ae60, 1);
      wallGfx.fillRect(299, 60, 2, 8);

      // South Door Opening threshold
      wallGfx.fillStyle(0x110905, 1);
      wallGfx.fillRect(295, 435, 50, 45);

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Warm amber glow from flower lamp (x: 375, y: 180)
      const lampGlow = this.add.circle(375, 180, 85, 0xffdf78, 0.2);
      lampGlow.setDepth(3);
      this.roomGroup.add(lampGlow);
      this.tweens.add({
        targets: lampGlow,
        scale: { from: 0.95, to: 1.12 },
        alpha: { from: 0.16, to: 0.25 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (room.id === 'room_toriel_bedroom') {
      // 10. Authentic Undertale Toriel's Bedroom (Quarto de Toriel)
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Deep dark polished wood floor
      gfx.fillStyle(0x3a1d12, 1);
      gfx.fillRect(80, 140, 480, 320);

      // Plank lines
      gfx.lineStyle(1, 0x25120a, 0.5);
      for (let y = 140; y <= 440; y += 24) {
        gfx.lineBetween(80, y, 560, y);
      }
      for (let x = 80; x <= 560; x += 60) {
        gfx.lineBetween(x, 140, x, 440);
      }

      // North Wall Facade (Royal deep burgundy wainscoted tone)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x271018, 1);
      wallGfx.fillRect(80, 0, 480, 140);
      wallGfx.lineStyle(3, 0x16070c, 1);
      wallGfx.strokeRect(80, 0, 480, 140);

      // Wainscoting baseboard & panels
      wallGfx.fillStyle(0x3f1725, 1);
      wallGfx.fillRect(80, 105, 480, 35);
      wallGfx.lineStyle(1, 0x5a2335, 0.7);
      for (let wx = 100; wx < 540; wx += 44) {
        wallGfx.strokeRect(wx, 110, 34, 25);
      }

      // Framed Delta Rune tapestry on Toriel's wall
      wallGfx.fillStyle(0xd4af37, 1);
      wallGfx.fillRect(260, 34, 38, 48);
      wallGfx.fillStyle(0x5c192d, 1);
      wallGfx.fillRect(264, 38, 30, 40);
      wallGfx.fillStyle(0xffffff, 1);
      wallGfx.fillCircle(279, 48, 4);
      wallGfx.fillTriangle(272, 60, 279, 56, 286, 60);

      // South Door Opening threshold
      wallGfx.fillStyle(0x110905, 1);
      wallGfx.fillRect(295, 435, 50, 45);

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Soft candle glow at nightstand (x: 350, y: 180)
      const candleGlow = this.add.circle(350, 180, 75, 0xffa502, 0.18);
      candleGlow.setDepth(3);
      this.roomGroup.add(candleGlow);
      this.tweens.add({
        targets: candleGlow,
        scale: { from: 0.92, to: 1.1 },
        alpha: { from: 0.14, to: 0.22 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (room.id === 'room_toriel_basement') {
      // 11. Authentic Undertale Ruins Subterranean Corridor & Ruins Exit Gate
      const gfx = this.add.graphics();
      gfx.setDepth(1);

      // Cool purple ancient stone block floor
      gfx.fillStyle(0x231835, 1);
      gfx.fillRect(40, 140, 560, 220);

      // Stone mortar tile grid
      gfx.lineStyle(1, 0x362550, 0.5);
      for (let y = 140; y <= 360; y += 24) {
        gfx.lineBetween(40, y, 600, y);
      }
      for (let x = 40; x <= 600; x += 36) {
        gfx.lineBetween(x, 140, x, 360);
      }

      // North Ancient Purple Stone Wall Facade (y: 0 to 140)
      const wallGfx = this.add.graphics();
      wallGfx.setDepth(2);
      wallGfx.fillStyle(0x190f26, 1);
      wallGfx.fillRect(40, 0, 560, 140);
      wallGfx.lineStyle(3, 0x0f0817, 1);
      wallGfx.strokeRect(40, 0, 560, 140);

      // Stone brick lines
      wallGfx.lineStyle(1, 0x2e1d43, 0.6);
      for (let wy = 14; wy < 140; wy += 16) {
        wallGfx.lineBetween(40, wy, 600, wy);
      }
      for (let wx = 60; wx < 580; wx += 32) {
        wallGfx.lineBetween(wx, 0, wx, 140);
      }

      // Ancient stone pillars flanking the subterranean corridor
      [200, 340].forEach((px) => {
        const pillar = this.add.sprite(px, 120, 'prop_ruins_pillar');
        pillar.setDepth(3);
        this.roomGroup.add(pillar);
      });

      this.roomGroup.add(gfx);
      this.roomGroup.add(wallGfx);

      // Magical Violet Wall Sconces (Torches)
      [
        { x: 190, y: 155 },
        { x: 330, y: 155 },
        { x: 470, y: 155 },
      ].forEach((torch) => {
        const torchGfx = this.add.graphics();
        torchGfx.setDepth(3);
        torchGfx.fillStyle(0x1a0f26, 1);
        torchGfx.fillRect(torch.x - 3, torch.y - 4, 6, 12);
        torchGfx.fillStyle(0x6c5ce7, 1);
        torchGfx.fillCircle(torch.x, torch.y - 6, 4);
        torchGfx.fillStyle(0xa29bfe, 1);
        torchGfx.fillCircle(torch.x, torch.y - 7, 2);
        this.roomGroup.add(torchGfx);

        const glow = this.add.circle(torch.x, torch.y - 6, 35, 0x8c7ae6, 0.18);
        glow.setDepth(3);
        this.roomGroup.add(glow);

        this.tweens.add({
          targets: glow,
          scale: { from: 0.9, to: 1.18 },
          alpha: { from: 0.12, to: 0.24 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // Warm golden light spilling from the west stairs (from Toriel's home above)
      const stairSpill = this.add.circle(100, 195, 60, 0xffd277, 0.15);
      stairSpill.setDepth(3);
      this.roomGroup.add(stairSpill);

      // Cold subterranean mist drifting across the stone floor
      for (let i = 0; i < 9; i++) {
        const mx = Phaser.Math.Between(80, 560);
        const my = Phaser.Math.Between(220, 310);
        const mist = this.add.circle(mx, my, Phaser.Math.Between(12, 22), 0xc7ecee, 0.12);
        mist.setDepth(4);
        this.roomGroup.add(mist);
        this.tweens.add({
          targets: mist,
          x: mx + Phaser.Math.Between(-25, 25),
          alpha: { from: 0.08, to: 0.18 },
          duration: Phaser.Math.Between(2600, 4200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      // Standard rooms fill tiles
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
    }

    // Walls
    room.wallTiles.forEach((wall) => {
      if (
        room.id !== 'room_awakening' &&
        room.id !== 'room_flowey' &&
        room.id !== 'room_toriel_entrance' &&
        room.id !== 'ruins_switch_chamber' &&
        room.id !== 'ruins_dummy_room' &&
        room.id !== 'room_toriel_house_exterior' &&
        room.id !== 'room_toriel_house_interior' &&
        room.id !== 'room_toriel_hallway' &&
        room.id !== 'room_player_bedroom' &&
        room.id !== 'room_toriel_bedroom' &&
        room.id !== 'room_toriel_basement'
      ) {
        // Keep door openings clear (North/South: x=320, East: x=576 y=240, West: x=64 y=240)
        if (
          (wall.y === 64 && Math.abs(wall.x - 320) < 32) ||
          (wall.y === 416 && Math.abs(wall.x - 320) < 32) ||
          (wall.x === 576 && Math.abs(wall.y - 240) < 48) ||
          (wall.x === 64 && Math.abs(wall.y - 240) < 48)
        ) {
          return;
        }
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
        if (obj.npcKey === 'prop_kitchen_counter') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_kitchen_counter');
          sprite.setDepth(4);
        } else {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_chest');
        }
      } else if (obj.type === 'sign') {
        if (obj.npcKey === 'prop_golden_flowerbed') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_golden_flowerbed');
          sprite.setDepth(2);
        } else if (obj.npcKey === 'prop_leaf_pile') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_leaf_pile');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_delta_rune_carving') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_delta_rune_carving');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_chalk_marking') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_chalk_marking');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_toriel_house') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toriel_house');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_bare_tree') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_bare_tree');
          sprite.setDepth(5);
        } else if (obj.npcKey === 'prop_autumn_carpet') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_autumn_carpet');
          sprite.setDepth(2);
        } else if (obj.npcKey === 'prop_fireplace') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_fireplace');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_toriel_chair') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toriel_chair');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_dining_table') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_dining_table');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_bookshelf') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_bookshelf');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_cozy_plant') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_cozy_plant');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_cozy_rug') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_cozy_rug');
          sprite.setDepth(2);
        } else if (obj.npcKey === 'prop_hallway_runner') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_hallway_runner');
          sprite.setDepth(2);
        } else if (obj.npcKey === 'prop_hallway_door') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_hallway_door');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_player_bed') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_player_bed');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_flower_lamp') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_flower_lamp');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_toy_box') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toy_box');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_dresser') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_dresser');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_toriel_bed') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toriel_bed');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_toriel_diary') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toriel_diary');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_toriel_wardrobe') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_toriel_wardrobe');
          sprite.setDepth(4);
        } else if (obj.npcKey === 'prop_basement_gate') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_basement_gate');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_basement_stairs') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_basement_stairs');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_stairs_up') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_stairs_up');
          sprite.setDepth(3);
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
        if (obj.npcKey === 'npc_toriel' && room.id === 'room_toriel_entrance' && gameState.getFlag('toriel_entrance_cutscene')) {
          return;
        }
        if (obj.npcKey === 'npc_toriel' && room.id === 'ruins_switch_chamber' && gameState.getFlag('toriel_switch_solved_cutscene')) {
          return;
        }
        if (obj.npcKey === 'npc_toriel' && room.id === 'ruins_dummy_room' && gameState.getFlag('toriel_dummy_solved_cutscene')) {
          return;
        }
        if (obj.npcKey === 'npc_toriel' && room.id === 'room_toriel_house_exterior' && gameState.getFlag('toriel_house_arrival_cutscene')) {
          return;
        }
        if (obj.npcKey === 'enemy_froggit' && gameState.getFlag('enemy_defeated_froggit')) {
          return;
        }

        let spriteKey = obj.npcKey || 'enemy_froggit';
        if (obj.npcKey === 'prop_dummy' && gameState.getFlag('dummy_defeated')) {
          spriteKey = 'prop_dummy_defeated';
        }

        const npcSprite = this.add.sprite(obj.x, obj.y, spriteKey);
        if (obj.npcKey === 'enemy_froggit') {
          npcSprite.setScale(0.35);
        }
        sprite = npcSprite;

        if (obj.npcKey === 'flowey_friendly') {
          this.floweyNpcSprite = npcSprite;
          if (!gameState.getFlag('flowey_met')) {
            npcSprite.setVisible(false);
          }
        } else if (obj.npcKey === 'npc_toriel' && room.id === 'room_toriel_entrance') {
          this.torielEntranceNpcSprite = npcSprite;
        } else if (obj.npcKey === 'npc_toriel' && room.id === 'ruins_switch_chamber') {
          this.torielSwitchNpcSprite = npcSprite;
        } else if (obj.npcKey === 'npc_toriel' && room.id === 'ruins_dummy_room') {
          this.torielDummyNpcSprite = npcSprite;
        } else if (obj.npcKey === 'npc_toriel' && room.id === 'room_toriel_house_exterior') {
          this.torielHouseNpcSprite = npcSprite;
        } else if (obj.npcKey === 'prop_dummy') {
          this.dummyNpcSprite = npcSprite;
        }

        if (!(obj.npcKey === 'prop_dummy' && gameState.getFlag('dummy_defeated'))) {
          this.tweens.add({
            targets: sprite,
            y: obj.y - 3,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      } else if (obj.type === 'door') {
        if (obj.npcKey === 'prop_arch_door') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_arch_door');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_hallway_door') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_hallway_door');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_basement_stairs') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_basement_stairs');
          sprite.setDepth(3);
        } else if (obj.npcKey === 'prop_stairs_up') {
          sprite = this.add.sprite(obj.x, obj.y, 'prop_stairs_up');
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
      // Only permit mouse usage on NPCs and interactables close to the character
      if (obj.type !== 'door') {
        sprite.setInteractive();
        sprite.on('pointerover', () => {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
          if (dist <= 80) {
            this.input.setDefaultCursor('pointer');
          }
        });
        sprite.on('pointerout', () => {
          this.input.setDefaultCursor('default');
        });
        sprite.on('pointerdown', () => {
          if (this.isDialogueActive || this.isSavePromptActive || this.isCutsceneActive) return;

          // Proximity restriction: Only allow mouse interaction when close to the character
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
          const maxInteractionDist = 80;

          if (dist > maxInteractionDist) {
            // Cannot interact with distant NPCs or objects via mouse
            return;
          }

          this.handleInteractableAction(sprite as Phaser.GameObjects.Sprite);
        });
      }
    });

    // Inspectable scorched grass spot in Flowey's room after battle
    if (room.id === 'room_flowey' && gameState.getFlag('flowey_met')) {
      const inspectZone = this.add.zone(320, 240, 56, 40) as unknown as Phaser.GameObjects.Sprite;
      inspectZone.setData('config', {
        type: 'sign',
        text: '* Um canteiro circular de grama banhado pela luz suave do sol.\n* A terra no centro ainda tem resquícios de fuligem onde Flowey estava.',
      });
      inspectZone.setInteractive();
      inspectZone.on('pointerover', () => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, inspectZone.x, inspectZone.y);
        if (dist <= 80) {
          this.input.setDefaultCursor('pointer');
        }
      });
      inspectZone.on('pointerout', () => {
        this.input.setDefaultCursor('default');
      });
      inspectZone.on('pointerdown', () => {
        if (!this.isDialogueActive && !this.isSavePromptActive && !this.isCutsceneActive) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, inspectZone.x, inspectZone.y);
          if (dist <= 80) {
            this.handleInteractableAction(inspectZone);
          }
        }
      });
      this.interactablesGroup.add(inspectZone);
    }
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
        if (onComplete.startBattle === 'flowey') {
          this.startFloweyBattleTransition();
        } else {
          this.startBattle(onComplete.startBattle);
        }
      } else if (onComplete.startScene) {
        if (onComplete.startScene === 'FloweyBattleScene') {
          this.startFloweyBattleTransition();
        } else {
          this.scene.start(onComplete.startScene);
        }
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
      if (dist < 38) {
        const switchId = cfg.id;
        if (
          switchId &&
          !gameState.getFlag(switchId) &&
          switchId !== 'switch_unlabeled' &&
          switchId !== 'switch_puzzle_dummy'
        ) {
          this.handleInteractableAction(sprite);
        }
      }
    });
  }

  // V.0.0.2-GU.1: Fix solid collision check to include NPCs, chests, and signs (ignoring walkable flowerbed)
  private checkSolidCollision(x: number, y: number): boolean {
    const playerHalfW = 12;
    const playerHalfH = 14;

    // Custom boundary confinement for non-square room_awakening
    if (this.currentRoomId === 'room_awakening') {
      const inChamber = x >= 46 && x <= 226 && y >= 162 && y <= 318;
      const inSteppedCorner =
        (x < 72 && (y < 188 || y > 292)) ||
        (x > 192 && (y < 188 || y > 292));
      const inCorridor = x >= 210 && x <= 585 && y >= 222 && y <= 258;

      if ((!inChamber || inSteppedCorner) && !inCorridor) {
        return true;
      }
    }

    // Custom boundary confinement for non-square room_flowey
    if (this.currentRoomId === 'room_flowey') {
      const inWestCorridor = x >= 42 && x <= 186 && y >= 222 && y <= 258;
      const inChamber = x >= 180 && x <= 456 && y >= 166 && y <= 314;
      const inSteppedCorner =
        (x < 220 && (y < 188 || y > 292)) ||
        (x > 416 && (y < 192 || y > 288));
      const inNorthPassage = x >= 286 && x <= 354 && y >= 72 && y <= 170;

      if (!inWestCorridor && (!inChamber || inSteppedCorner) && !inNorthPassage) {
        return true;
      }
    }

    // Custom boundary confinement for non-square room_toriel_entrance (Ruins Entrance)
    if (this.currentRoomId === 'room_toriel_entrance') {
      const inSouthCorridor = x >= 268 && x <= 372 && y >= 370 && y <= 455;
      const inMainHall = x >= 135 && x <= 505 && y >= 165 && y <= 390;
      const inStairsPassage = x >= 235 && x <= 405 && y >= 64 && y <= 165;

      // Solid stone pillars collision
      const hitLeftPillar = Math.abs(x - 210) < 18 && Math.abs(y - 110) < 30;
      const hitRightPillar = Math.abs(x - 430) < 18 && Math.abs(y - 110) < 30;

      if ((!inSouthCorridor && !inMainHall && !inStairsPassage) || hitLeftPillar || hitRightPillar) {
        return true;
      }
    }

    // Custom boundary confinement for ruins_switch_chamber (Switch Chamber)
    if (this.currentRoomId === 'ruins_switch_chamber') {
      // Room perimeter
      if (x < 140 || x > 500 || y < 64 || y > 445) {
        return true;
      }

      // Water canal trench is y: 180 to 260
      // Stone bridge crossing is x: 265 to 375
      if (y >= 180 && y <= 260) {
        // Can only walk across on bridge within width 272..368
        if (x < 272 || x > 368) {
          return true; // canal water!
        }
      }

      // Spikes check: if spikes are not retracted, completely block passage leading north to the door
      if (!gameState.getFlag('switch_toriel_labeled')) {
        // Spikes barrier across the central walkway (x: 240 to 400 at y: 125 to 162)
        if (y < 162 && y > 125 && Math.abs(x - 320) < 85) {
          return true;
        }
        // North doorway opening threshold (cannot enter north door without lowering spikes)
        if (y < 112) {
          return true;
        }
      }
    }

    // Custom boundary confinement for ruins_dummy_room (Dummy Chamber)
    if (this.currentRoomId === 'ruins_dummy_room') {
      // Room perimeter
      if (x < 140 || x > 500 || y < 64 || y > 445) {
        return true;
      }

      // Solid stone pillars collision on left and right
      const hitLeftPillar = Math.abs(x - 175) < 18 && Math.abs(y - 120) < 30;
      const hitRightPillar = Math.abs(x - 465) < 18 && Math.abs(y - 120) < 30;

      if (hitLeftPillar || hitRightPillar) {
        return true;
      }
    }

    // Custom boundary confinement for ruins_puzzle (Spike Puzzle Room)
    // Prevent player from advancing past the spike barrier before pressing the right button
    if (this.currentRoomId === 'ruins_puzzle') {
      if (!gameState.getFlag('switch_puzzle_1')) {
        // Complete horizontal barrier across the room at the spikes row (y: 220)
        if (y < 238) {
          return true;
        }
      }
    }

    // Custom boundary confinement for room_toriel_house_exterior (Home Exterior)
    if (this.currentRoomId === 'room_toriel_house_exterior') {
      // Room perimeter bounds
      if (x < 36 || x > 604 || y < 140 || y > 445) {
        return true;
      }
      // Cottage stone walls footprint is solid (x: 350 to 530, y: 70 to 180)
      if (x >= 350 && x <= 530 && y <= 180) {
        return true;
      }
      // Bare tree trunk is solid (x: 175 to 205, y: 140 to 175)
      if (Math.abs(x - 190) < 18 && Math.abs(y - 155) < 22) {
        return true;
      }
    }

    // Custom boundary confinement for room_toriel_house_interior (Home Interior)
    if (this.currentRoomId === 'room_toriel_house_interior') {
      // Room perimeter bounds: left wall 95, right wall 520, north wall 145, south wall 440
      // Allow south exit doorway threshold at x: 320 (from 290 to 350) for y >= 440
      // Allow north wall hallway archway opening at x: 122 (from 100 to 144) for y between 118 and 145
      const atDoorThreshold = Math.abs(x - 320) < 30 && y >= 440;
      const atHallwayArch = Math.abs(x - 122) < 22 && y <= 145 && y >= 118;
      if ((x < 95 && !atHallwayArch) || x > 520 || (y < 145 && !atHallwayArch) || (y > 440 && !atDoorThreshold)) {
        return true;
      }
    }

    // Custom boundary confinement for room_toriel_hallway (Corredor da Casa)
    if (this.currentRoomId === 'room_toriel_hallway') {
      const atNorthDoor1 = Math.abs(x - 440) < 24 && y <= 180 && y >= 140;
      const atNorthDoor2 = Math.abs(x - 300) < 24 && y <= 180 && y >= 140;
      const atWestStairs = x <= 95 && Math.abs(y - 260) < 32;
      const atEastArch = x >= 580 && Math.abs(y - 260) < 32;

      if (x < 50 && !atWestStairs) return true;
      if (x > 615 && !atEastArch) return true;
      if (y < 170 && !atNorthDoor1 && !atNorthDoor2) return true;
      if (y > 330) return true;
    }

    // Custom boundary confinement for room_player_bedroom (Quarto da Criança)
    if (this.currentRoomId === 'room_player_bedroom') {
      const atSouthDoor = Math.abs(x - 320) < 30 && y >= 435;
      if (x < 120 || x > 520 || y < 165 || (y > 440 && !atSouthDoor)) {
        return true;
      }
    }

    // Custom boundary confinement for room_toriel_bedroom (Quarto de Toriel)
    if (this.currentRoomId === 'room_toriel_bedroom') {
      const atSouthDoor = Math.abs(x - 320) < 30 && y >= 435;
      if (x < 100 || x > 530 || y < 165 || (y > 440 && !atSouthDoor)) {
        return true;
      }
    }

    // Custom boundary confinement for room_toriel_basement (Saída Subterrânea)
    if (this.currentRoomId === 'room_toriel_basement') {
      const atWestStairs = x <= 115 && Math.abs(y - 195) < 32;
      if (x < 65 && !atWestStairs) return true;
      if (x > 565 || y < 168 || y > 300) {
        return true;
      }
    }

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

    // 2. NPCs, Chests, Signs, and blocking Spikes (excluding non-blocking items)
    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (!cfg) return;

      if (
        (cfg.type === 'npc' && cfg.npcKey !== 'prop_golden_flowerbed') ||
        cfg.type === 'chest' ||
        (cfg.type === 'sign' &&
          cfg.npcKey !== 'prop_golden_flowerbed' &&
          cfg.npcKey !== 'prop_leaf_pile' &&
          cfg.npcKey !== 'prop_delta_rune_carving' &&
          cfg.npcKey !== 'prop_chalk_marking' &&
          cfg.npcKey !== 'prop_toriel_house' &&
          cfg.npcKey !== 'prop_bare_tree' &&
          cfg.npcKey !== 'prop_autumn_carpet' &&
          cfg.npcKey !== 'prop_cozy_rug' &&
          cfg.npcKey !== 'prop_hallway_runner' &&
          cfg.npcKey !== 'prop_hallway_door' &&
          cfg.npcKey !== 'prop_basement_stairs' &&
          cfg.npcKey !== 'prop_stairs_up') ||
        (cfg.type === 'spikes' && sprite.getData('blocking'))
      ) {
        let solidHalfW = cfg.type === 'npc' ? 14 : 12;
        let solidHalfH = cfg.type === 'npc' ? 14 : 12;

        if (cfg.npcKey === 'prop_fireplace') {
          solidHalfW = 24;
          solidHalfH = 20;
        } else if (cfg.npcKey === 'prop_dining_table') {
          solidHalfW = 26;
          solidHalfH = 18;
        } else if (cfg.npcKey === 'prop_bookshelf') {
          solidHalfW = 20;
          solidHalfH = 24;
        } else if (cfg.npcKey === 'prop_kitchen_counter') {
          solidHalfW = 24;
          solidHalfH = 16;
        } else if (cfg.npcKey === 'prop_toriel_chair') {
          solidHalfW = 18;
          solidHalfH = 18;
        } else if (cfg.npcKey === 'prop_player_bed') {
          solidHalfW = 24;
          solidHalfH = 26;
        } else if (cfg.npcKey === 'prop_toriel_bed') {
          solidHalfW = 32;
          solidHalfH = 28;
        } else if (cfg.npcKey === 'prop_toriel_wardrobe') {
          solidHalfW = 22;
          solidHalfH = 28;
        } else if (cfg.npcKey === 'prop_dresser') {
          solidHalfW = 20;
          solidHalfH = 20;
        } else if (cfg.npcKey === 'prop_toy_box') {
          solidHalfW = 18;
          solidHalfH = 14;
        } else if (cfg.npcKey === 'prop_basement_gate') {
          solidHalfW = 44;
          solidHalfH = 38;
        }

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

          // Prevent player from advancing to next scene in the switch chamber until Toriel's switch is activated
          if (this.currentRoomId === 'ruins_switch_chamber' && cfg.targetRoom === 'ruins_dummy_room') {
            if (!gameState.getFlag('switch_toriel_labeled')) {
              this.player.y = Math.max(this.player.y, 160);
              soundManager.playMenuMove();
              triggerScreenShake(this, 'light');
              this.showDialogue(
                '* Os espinhos pontiagudos bloqueiam o avanço para a próxima sala!\n* Puxe a alavanca marcada por Toriel para desativá-los.',
                'monster'
              );
              return;
            }
          }

          // Prevent player from advancing to next scene in the spike puzzle room until the switch is activated
          if (this.currentRoomId === 'ruins_puzzle' && cfg.targetRoom === 'ruins_long_hall') {
            if (!gameState.getFlag('switch_puzzle_1')) {
              this.player.y = Math.max(this.player.y, 240);
              soundManager.playMenuMove();
              triggerScreenShake(this, 'light');
              this.showDialogue(
                '* Os espinhos pontiagudos bloqueiam qualquer avanço para a próxima cena!\n* Acione a alavanca correta para desativá-los.',
                'monster'
              );
              return;
            }
          }

          this.switchRoom(cfg.targetRoom, cfg.targetX || 320, cfg.targetY || 300);
        }
      }
    });
  }

  private showResilienceTransition(onMidpoint: () => void, onComplete: () => void) {
    const overlay = this.add.rectangle(320, 240, 640, 480, 0x000000, 1);
    overlay.setDepth(500);
    overlay.setAlpha(0);

    const textContainer = this.add.container(320, 240);
    textContainer.setDepth(501);
    textContainer.setAlpha(0);

    const heart = this.add.text(0, -20, '♥', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#e74c3c',
    });
    heart.setOrigin(0.5);
    textContainer.add(heart);

    const showSecretCode = Math.random() < 0.5;
    const transitionMessage = showSecretCode ? '007474' : 'THE COLORS OF RESILIENCE';
    const glowColor = showSecretCode ? '#00e5ff' : '#ffdd59';

    const phrase = this.add.text(0, 4, transitionMessage, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: showSecretCode ? '13px' : '11px',
      color: '#ffffff',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: glowColor,
        blur: 8,
        stroke: true,
        fill: true,
      },
    });
    phrase.setOrigin(0.5);
    textContainer.add(phrase);

    // Smooth Undertale 'Fade-to-Black' transition:
    // 1. Screen gently fades to pure black
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        onMidpoint();

        // 2. Transition motif breathes gently in the black void
        this.tweens.add({
          targets: textContainer,
          alpha: 0.85,
          duration: 150,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.time.delayedCall(200, () => {
              this.tweens.add({
                targets: textContainer,
                alpha: 0,
                duration: 150,
                ease: 'Sine.easeIn',
              });

              // 3. Screen smoothly fades out from black, immersing the player into the new room
              this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 300,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  overlay.destroy();
                  textContainer.destroy();
                  onComplete();
                },
              });
            });
          },
        });
      },
    });
  }

  public switchRoom(targetRoom: string, targetX: number, targetY: number) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.floweyCutsceneTriggered = false;

    this.showResilienceTransition(
      () => {
        this.buildRoom(targetRoom);
        this.player.setPosition(targetX, targetY);
        const roomName = this.rooms[targetRoom]?.name || targetRoom;
        gameState.setCurrentRoom(targetRoom, targetX, targetY, roomName);
        gameState.setFlag(`reached_${targetRoom}`, true);

        // Auto-save mechanism triggered upon entering a new room
        gameState.autoSave(roomName);

        // Screen transition camera shake effect in Phaser engine
        triggerScreenShake(this, 'transition');

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

        // Audio transition: Fallen Down for Ruins Entrance and Toriel's Home, Overworld for other chambers
        if (
          targetRoom === 'room_toriel_entrance' ||
          targetRoom === 'room_toriel_house_exterior' ||
          targetRoom === 'room_toriel_house_interior' ||
          targetRoom === 'room_toriel_hallway' ||
          targetRoom === 'room_player_bedroom' ||
          targetRoom === 'room_toriel_bedroom'
        ) {
          soundManager.playMusic('fallen_down');
        } else {
          soundManager.playMusic('overworld');
        }
      },
      () => {
        this.isTransitioning = false;
        this.transitionCooldown = 300;

        if (targetRoom === 'room_flowey' && !gameState.getFlag('flowey_met')) {
          this.checkAndStartFloweyCutscene();
        } else if (targetRoom === 'room_toriel_entrance' && !gameState.getFlag('toriel_entrance_cutscene')) {
          this.runTorielEntranceCutscene();
        } else if (targetRoom === 'ruins_switch_chamber' && !gameState.getFlag('toriel_switch_intro_spoken')) {
          this.runTorielSwitchIntroCutscene();
        } else if (targetRoom === 'ruins_dummy_room') {
          if (!gameState.getFlag('toriel_dummy_intro_spoken')) {
            this.runTorielDummyIntroCutscene();
          } else if (gameState.getFlag('dummy_practiced') && !gameState.getFlag('toriel_dummy_solved_cutscene')) {
            this.runTorielDummySolvedCutscene();
          }
        }
      }
    );
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
        if (cfg.itemId === 'butterscotch_pie') {
          this.showDialogue(
            '* O prato onde a torta de caramelo e canela estava agora tem apenas algumas migalhas doces e um cheiro maravilhoso.'
          );
        } else {
          this.startDialogueById('chest_empty');
        }
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
      if (cfg.id === 'switch_unlabeled' || cfg.id === 'switch_puzzle_dummy') {
        soundManager.playMenuMove();
        this.showDialogue(
          cfg.text || '* (Você puxou o interruptor comum não rotulado... Nada parece ter acontecido.)'
        );
        return;
      }

      const switchId = cfg.id || 'switch_toriel_labeled';
      const isAlreadyOn = gameState.getFlag(switchId);
      if (!isAlreadyOn) {
        soundManager.playMenuSelect();
        gameState.setFlag(switchId, true);
        sprite.setTexture('prop_switch_on');

        this.lowerAllSpikes();
        if (switchId === 'switch_toriel_labeled') {
          this.triggerTorielSwitchSolvedSequence();
        } else {
          soundManager.playSave();
          triggerScreenShake(this, 'light');
          this.showDialogue(
            cfg.text || '* Você puxou a alavanca com um "CLIQUE"! Os espinhos de ferro recuaram para o chão.'
          );
        }
      } else {
        this.showDialogue('* A alavanca já foi acionada. Os espinhos continuam abaixados no chão.');
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
        this.triggerTorielSwitchSolvedSequence();
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
    } else if (cfg.npcKey === 'prop_dummy' || cfg.id === 'prop_dummy') {
      if (gameState.getFlag('dummy_practiced')) {
        soundManager.playMenuSelect();
        if (gameState.getFlag('dummy_defeated')) {
          this.startDialogueById('dummy_defeated_dialogue');
        } else if (gameState.getFlag('dummy_fled')) {
          this.showDialogue('* Um manequim de pano de algodão.\n* Permanece parado e impassível diante de você.');
        } else {
          this.startDialogueById('dummy_spared_dialogue');
        }
      } else {
        this.startBattle('dummy');
      }
    } else if (cfg.type === 'sign') {
      if (cfg.id === 'player_bed' || cfg.npcKey === 'prop_player_bed') {
        soundManager.playMenuSelect();
        this.runPlayerSleepSequence();
        return;
      }
      soundManager.playMenuSelect();
      if (cfg.dialogueId) {
        this.startDialogueById(cfg.dialogueId);
      } else {
        this.showDialogue(cfg.text || '* Uma placa de madeira.');
      }
    } else if (cfg.type === 'npc') {
      if (cfg.npcKey === 'npc_toriel' && this.currentRoomId === 'ruins_switch_chamber') {
        if (gameState.getFlag('switch_toriel_labeled')) {
          this.triggerTorielSwitchSolvedSequence();
        } else {
          this.startDialogueById('toriel_switch_advice');
        }
        return;
      }
      if (cfg.npcKey === 'npc_toriel' && this.currentRoomId === 'ruins_dummy_room') {
        if (gameState.getFlag('dummy_practiced') && !gameState.getFlag('toriel_dummy_solved_cutscene')) {
          this.runTorielDummySolvedCutscene();
        } else {
          this.startDialogueById('toriel_dummy_advice');
        }
        return;
      }
      if (cfg.dialogueId) {
        this.startDialogueById(cfg.dialogueId);
      } else if (cfg.npcKey === 'flowey_friendly') {
        this.startDialogueById('flowey_encounter');
      } else if (cfg.npcKey === 'npc_toriel') {
        this.startDialogueById('toriel_welcome');
      } else {
        this.showDialogue(cfg.text || '* ...', cfg.npcVoice || 'monster');
      }
    }
  }

  private runPlayerSleepSequence() {
    if (this.isTransitioning || this.isCutsceneActive) return;
    this.isCutsceneActive = true;
    this.isMoving = false;

    // Fade to black
    const overlay = this.add.rectangle(320, 240, 640, 480, 0x000000, 0);
    overlay.setDepth(500);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        soundManager.playSave();
        gameState.restoreFullHp();

        // Check if Toriel leaves a slice of pie
        const hasPieFlag = gameState.getFlag('bed_pie_received') || gameState.getFlag('chest_butterscotch_pie');
        let pieGiven = false;
        if (!hasPieFlag) {
          const pieItem = ALL_ITEMS.find((it) => it.id === 'butterscotch_pie');
          if (pieItem) {
            gameState.addItem(pieItem);
            gameState.setFlag('bed_pie_received', true);
            pieGiven = true;
          }
        }

        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 600,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              overlay.destroy();
              this.isCutsceneActive = false;

              const messages = [
                '* Você se aconchegou sob os cobertores quentinhos e tirou um sono reconfortante...',
                '* (Seu HP foi totalmente restaurado!)',
              ];

              if (pieGiven) {
                messages.push(
                  '* Ao acordar, você encontra uma fatia fresca de [Torta de Caramelo] no chão ao lado da cama!\n* Há um bilhete fofo da Mamãe Toriel: "Tenha bons sonhos, minha criança! ❤"'
                );
              }

              this.showDialogue(messages);
            },
          });
        });
      },
    });
  }

  // V.0.0.3-ENC.1: Authentic Undertale 'Encounter Intro' transition animation
  // Shows a static '!' exclamation mark directly above player, screen-flash strobe,
  // before cleanly transitioning into the BattleScene.
  public startBattle(enemyId: string) {
    if (enemyId === 'flowey') {
      this.startFloweyBattleTransition();
      return;
    }

    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isCutsceneActive = true;
    this.isMoving = false;

    // Immediately halt overworld music and freeze player animation
    soundManager.stopMusic();
    this.player.setTexture(`player_${this.playerDirection}_0`);
    this.tweens.killTweensOf(this.player);

    // Play signature battle start / encounter sound
    soundManager.playBattleStart();
    triggerScreenShake(this, 'transition');

    // 1. Static '!' Exclamation Mark directly above the player's head
    // Positioned steadily above player without moving or bouncing
    const exclamationY = this.player.y - 34;
    const exclamation: Phaser.GameObjects.GameObject = this.textures.exists('ui_encounter_exclamation')
      ? this.add.sprite(this.player.x, exclamationY, 'ui_encounter_exclamation')
      : this.add.text(this.player.x, exclamationY, '!', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '18px',
          color: '#ff2d2d',
          stroke: '#000000',
          strokeThickness: 5,
        }).setOrigin(0.5);

    (exclamation as Phaser.GameObjects.Sprite | Phaser.GameObjects.Text).setDepth(550); // Above screen flash overlay

    // 2. Screen-flash effect: Undertale signature rapid white strobe pulses
    const flashOverlay = this.add.rectangle(320, 240, 640, 480, 0xffffff, 1);
    flashOverlay.setDepth(500);
    flashOverlay.setAlpha(1);

    // Pulse sequence (pure white flash strobe):
    this.time.delayedCall(75, () => {
      flashOverlay.setAlpha(0);

      this.time.delayedCall(75, () => {
        flashOverlay.setFillStyle(0xffffff, 1);
        flashOverlay.setAlpha(1);

        this.time.delayedCall(75, () => {
          flashOverlay.setAlpha(0);

          this.time.delayedCall(75, () => {
            flashOverlay.setFillStyle(0xffffff, 1);
            flashOverlay.setAlpha(1);

            this.time.delayedCall(90, () => {
              // Fade to black void before entering BattleScene
              flashOverlay.setFillStyle(0x000000, 1);
              flashOverlay.setAlpha(1);

              this.time.delayedCall(160, () => {
                exclamation.destroy();
                flashOverlay.destroy();
                this.isTransitioning = false;
                this.isCutsceneActive = false;
                this.scene.start('BattleScene', { enemyId });
              });
            });
          });
        });
      });
    });
  }

  // Authentic Flowey battle encounter sequence
  public startFloweyBattleTransition() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isCutsceneActive = true;
    this.isMoving = false;

    // Immediately stop overworld music & freeze Frisk
    soundManager.stopMusic();
    this.player.setTexture(`player_${this.playerDirection}_0`);
    this.tweens.killTweensOf(this.player);

    // Signature battle start encounter sound
    soundManager.playBattleStart();

    // 1. Static '!' exclamation mark above Frisk
    const exclamationY = this.player.y - 34;
    const exclamation: Phaser.GameObjects.GameObject = this.textures.exists('ui_encounter_exclamation')
      ? this.add.sprite(this.player.x, exclamationY, 'ui_encounter_exclamation')
      : this.add.text(this.player.x, exclamationY, '!', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '18px',
          color: '#ff2d2d',
          stroke: '#000000',
          strokeThickness: 5,
        }).setOrigin(0.5);

    (exclamation as Phaser.GameObjects.Sprite | Phaser.GameObjects.Text).setDepth(550);

    // 2. Red soul appears over Frisk's chest and stays immobile before fading into battle
    const soulGlow = this.add.sprite(this.player.x, this.player.y, 'soul_red');
    soulGlow.setDepth(555);

    // 3. Signature Undertale triple white strobe flash
    const flashOverlay = this.add.rectangle(320, 240, 640, 480, 0xffffff, 1);
    flashOverlay.setDepth(500);
    flashOverlay.setAlpha(1);

    this.time.delayedCall(75, () => {
      flashOverlay.setAlpha(0);

      this.time.delayedCall(75, () => {
        flashOverlay.setFillStyle(0xffffff, 1);
        flashOverlay.setAlpha(1);

        this.time.delayedCall(75, () => {
          flashOverlay.setAlpha(0);

          this.time.delayedCall(75, () => {
            flashOverlay.setFillStyle(0xffffff, 1);
            flashOverlay.setAlpha(1);

            this.time.delayedCall(90, () => {
              // Fade to black void before entering FloweyBattleScene
              flashOverlay.setFillStyle(0x000000, 1);
              flashOverlay.setAlpha(1);

              this.time.delayedCall(160, () => {
                soulGlow.destroy();
                exclamation.destroy();
                flashOverlay.destroy();
                this.isTransitioning = false;
                this.isCutsceneActive = false;
                this.scene.start('FloweyBattleScene');
              });
            });
          });
        });
      });
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

      // Bursting dirt particles as Flowey shoots out of the grass mound
      for (let i = 0; i < 8; i++) {
        const dirt = this.add.circle(
          this.floweyNpcSprite.x + Phaser.Math.Between(-10, 10),
          this.floweyNpcSprite.y + 12,
          Phaser.Math.Between(2, 3),
          0x4a3219,
          1
        );
        dirt.setDepth(15);
        this.tweens.add({
          targets: dirt,
          x: dirt.x + Phaser.Math.Between(-18, 18),
          y: dirt.y - Phaser.Math.Between(10, 24),
          alpha: 0,
          duration: 350,
          onComplete: () => dirt.destroy(),
        });
      }

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

  private runTorielEntranceCutscene() {
    if (this.currentRoomId !== 'room_toriel_entrance') return;
    if (gameState.getFlag('toriel_entrance_cutscene')) return;
    if (this.isCutsceneActive || this.isDialogueActive) return;

    this.isCutsceneActive = true;
    this.isMoving = false;

    // Position Frisk at south entry corridor facing UP towards the grand staircase
    this.player.setPosition(320, 410);
    this.playerDirection = 'up';
    this.player.setTexture('player_up_0');

    // Find Toriel sprite
    let torielSprite = this.torielEntranceNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielEntranceNpcSprite = torielSprite;
    }

    // Frisk steps forward into the grand hall (y: 410 -> y: 325)
    let stepFrame = 0;
    const walkTimer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        stepFrame = stepFrame === 0 ? 1 : 0;
        this.player.setTexture(`player_up_${stepFrame}`);
      },
    });

    this.tweens.add({
      targets: this.player,
      y: 325,
      duration: 900,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        this.player.setTexture('player_up_0');
        this.playerDirection = 'up';
        gameState.setPlayerPos(320, 325);

        // Toriel turns with a gentle welcome bounce
        if (torielSprite && torielSprite.active) {
          soundManager.playVoiceBlip('toriel');
          this.tweens.add({
            targets: torielSprite,
            scaleY: 1.15,
            duration: 180,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        }

        this.time.delayedCall(450, () => {
          this.startDialogueById('toriel_ruins_intro', () => {
            this.finishTorielEntranceCutscene();
          });
        });
      },
    });
  }

  private finishTorielEntranceCutscene() {
    const toriel = this.torielEntranceNpcSprite;
    if (!toriel || !toriel.active) {
      gameState.setFlag('toriel_entrance_cutscene', true);
      gameState.setFlag('toriel_intro_spoken', true);
      this.isCutsceneActive = false;
      return;
    }

    // Toriel turns north and walks gracefully up the grand stairs to the entrance archway
    soundManager.playMenuMove();

    this.tweens.add({
      targets: toriel,
      y: 68,
      duration: 1500,
      ease: 'Linear',
      onComplete: () => {
        soundManager.playMenuSelect();
        // Fade out into the inner ruins doorway
        this.tweens.add({
          targets: toriel,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            toriel.destroy();
            this.torielEntranceNpcSprite = null;
            gameState.setFlag('toriel_entrance_cutscene', true);
            gameState.setFlag('toriel_intro_spoken', true);
            this.isCutsceneActive = false;

            // Ambient hint on screen
            const hint = this.add.text(320, 420, '* Toriel seguiu em frente pelas catacumbas...', {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '9px',
              color: '#dcdde1',
              stroke: '#000000',
              strokeThickness: 3,
            });
            hint.setOrigin(0.5);
            hint.setDepth(30);
            this.tweens.add({
              targets: hint,
              alpha: 0,
              y: 405,
              delay: 1800,
              duration: 800,
              onComplete: () => hint.destroy(),
            });
          },
        });
      },
    });
  }

  private runTorielSwitchIntroCutscene() {
    if (this.currentRoomId !== 'ruins_switch_chamber') return;
    if (gameState.getFlag('toriel_switch_intro_spoken')) return;
    if (this.isCutsceneActive || this.isDialogueActive) return;

    this.isCutsceneActive = true;
    this.isMoving = false;

    // Position Frisk at south entry corridor facing UP
    this.player.setPosition(320, 410);
    this.playerDirection = 'up';
    this.player.setTexture('player_up_0');

    // Find Toriel sprite in switch chamber
    let torielSprite = this.torielSwitchNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielSwitchNpcSprite = torielSprite;
    }

    // Frisk steps forward into the room (y: 410 -> y: 340)
    let stepFrame = 0;
    const walkTimer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        stepFrame = stepFrame === 0 ? 1 : 0;
        this.player.setTexture(`player_up_${stepFrame}`);
      },
    });

    this.tweens.add({
      targets: this.player,
      y: 340,
      duration: 750,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        this.player.setTexture('player_up_0');
        this.playerDirection = 'up';
        gameState.setPlayerPos(320, 340);

        if (torielSprite && torielSprite.active) {
          soundManager.playVoiceBlip('toriel');
          this.tweens.add({
            targets: torielSprite,
            scaleY: 1.15,
            duration: 180,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        }

        this.time.delayedCall(400, () => {
          this.startDialogueById('toriel_switch_intro', () => {
            gameState.setFlag('toriel_switch_intro_spoken', true);
            this.isCutsceneActive = false;
          });
        });
      },
    });
  }

  private triggerTorielSwitchSolvedSequence() {
    this.isCutsceneActive = true;
    this.isMoving = false;

    // Camera shake and sound
    triggerScreenShake(this, 'light');
    soundManager.playSave();

    let torielSprite = this.torielSwitchNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielSwitchNpcSprite = torielSprite;
    }

    if (torielSprite && torielSprite.active) {
      soundManager.playVoiceBlip('toriel');
      this.tweens.add({
        targets: torielSprite,
        scaleY: 1.2,
        scaleX: 1.05,
        duration: 180,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    this.time.delayedCall(450, () => {
      this.startDialogueById('toriel_switch_solved', () => {
        this.finishTorielSwitchCutscene();
      });
    });
  }

  private finishTorielSwitchCutscene() {
    let toriel = this.torielSwitchNpcSprite;
    if (!toriel || !toriel.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          toriel = s;
        }
      });
      this.torielSwitchNpcSprite = toriel;
    }

    if (!toriel || !toriel.active) {
      gameState.setFlag('toriel_switch_solved_cutscene', true);
      this.isCutsceneActive = false;
      return;
    }

    const torielSpriteRef = toriel;

    // Toriel turns away and faces north towards the grand archway
    if (this.textures.exists('npc_toriel_up')) {
      torielSpriteRef.setTexture('npc_toriel_up');
    }

    soundManager.playMenuMove();

    // Walking animation: slight bobbing
    const bobTween = this.tweens.add({
      targets: torielSpriteRef,
      scaleX: { from: 1, to: 0.95 },
      scaleY: { from: 1, to: 1.05 },
      duration: 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Step 1: Align horizontally to the center doorway path (x: 320)
    this.tweens.add({
      targets: torielSpriteRef,
      x: 320,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        // Step 2: Walk north across lowered spikes (y: 155 -> y: 68) directly into north archway door
        this.tweens.add({
          targets: torielSpriteRef,
          y: 68,
          duration: 1400,
          ease: 'Linear',
          onComplete: () => {
            bobTween.stop();
            torielSpriteRef.setScale(1);
            soundManager.playMenuSelect();

            // Fade out into the door frame threshold
            this.tweens.add({
              targets: torielSpriteRef,
              alpha: 0,
              duration: 350,
              onComplete: () => {
                torielSpriteRef.destroy();
                this.torielSwitchNpcSprite = null;
                gameState.setFlag('toriel_switch_solved_cutscene', true);
                this.isCutsceneActive = false;

                // Ambient Undertale narration hint
                const hint = this.add.text(
                  320,
                  420,
                  '* Toriel seguiu em frente para a sala do manequim...',
                  {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '9px',
                    color: '#dcdde1',
                    stroke: '#000000',
                    strokeThickness: 3,
                  }
                );
                hint.setOrigin(0.5);
                hint.setDepth(30);
                this.tweens.add({
                  targets: hint,
                  alpha: 0,
                  y: 405,
                  delay: 2000,
                  duration: 800,
                  onComplete: () => hint.destroy(),
                });
              },
            });
          },
        });
      },
    });
  }

  private runTorielDummyIntroCutscene() {
    if (this.currentRoomId !== 'ruins_dummy_room') return;
    if (gameState.getFlag('toriel_dummy_intro_spoken')) return;
    if (this.isCutsceneActive || this.isDialogueActive) return;

    this.isCutsceneActive = true;
    this.isMoving = false;

    // Position Frisk at south entry facing UP
    this.player.setPosition(320, 410);
    this.playerDirection = 'up';
    this.player.setTexture('player_up_0');

    // Find Toriel sprite in dummy chamber
    let torielSprite = this.torielDummyNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielDummyNpcSprite = torielSprite;
    }

    // Frisk steps forward into the room (y: 410 -> y: 320)
    let stepFrame = 0;
    const walkTimer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        stepFrame = stepFrame === 0 ? 1 : 0;
        this.player.setTexture(`player_up_${stepFrame}`);
      },
    });

    this.tweens.add({
      targets: this.player,
      y: 320,
      duration: 750,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        this.player.setTexture('player_up_0');
        this.playerDirection = 'up';
        gameState.setPlayerPos(320, 320);

        if (torielSprite && torielSprite.active) {
          soundManager.playVoiceBlip('toriel');
          this.tweens.add({
            targets: torielSprite,
            scaleY: 1.15,
            duration: 180,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        }

        this.time.delayedCall(400, () => {
          this.startDialogueById('toriel_dummy_intro', () => {
            gameState.setFlag('toriel_dummy_intro_spoken', true);
            this.isCutsceneActive = false;
          });
        });
      },
    });
  }

  private runTorielDummySolvedCutscene() {
    if (this.currentRoomId !== 'ruins_dummy_room') return;
    if (gameState.getFlag('toriel_dummy_solved_cutscene')) return;
    if (this.isCutsceneActive || this.isDialogueActive) return;

    this.isCutsceneActive = true;
    this.isMoving = false;

    // In Undertale, Frisk stands directly south of the training dummy facing north
    this.player.setPosition(370, 255);
    this.player.setTexture('player_up_0');
    this.playerDirection = 'up';
    gameState.setPlayerPos(370, 255);

    let torielSprite = this.torielDummyNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielDummyNpcSprite = torielSprite;
    }

    if (torielSprite && torielSprite.active) {
      soundManager.playVoiceBlip('toriel');
      this.tweens.add({
        targets: torielSprite,
        scaleY: 1.18,
        scaleX: 1.05,
        duration: 180,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    let dialogueId = 'toriel_dummy_solved_pacifist';
    if (gameState.getFlag('dummy_defeated')) {
      dialogueId = 'toriel_dummy_solved_violent';
    } else if (gameState.getFlag('dummy_fled')) {
      dialogueId = 'toriel_dummy_solved_fled';
    }

    this.time.delayedCall(400, () => {
      this.startDialogueById(dialogueId, () => {
        this.finishTorielDummyCutscene();
      });
    });
  }

  private finishTorielDummyCutscene() {
    let toriel = this.torielDummyNpcSprite;
    if (!toriel || !toriel.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          toriel = s;
        }
      });
      this.torielDummyNpcSprite = toriel;
    }

    if (!toriel || !toriel.active) {
      gameState.setFlag('toriel_dummy_solved_cutscene', true);
      this.isCutsceneActive = false;
      return;
    }

    const torielSpriteRef = toriel;

    // Toriel walks to Frisk, takes Frisk's hand, and they walk north together to Toriel's home
    soundManager.playMenuMove();

    // Walking animation: slight bobbing
    const bobTween = this.tweens.add({
      targets: torielSpriteRef,
      scaleX: { from: 1, to: 0.95 },
      scaleY: { from: 1, to: 1.05 },
      duration: 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Frisk turns left towards Toriel as she steps over
    this.time.delayedCall(80, () => {
      this.player.setTexture('player_left_0');
      this.playerDirection = 'left';
    });

    // Step 1: Toriel steps towards Frisk (x: 260 -> 340)
    this.tweens.add({
      targets: torielSpriteRef,
      x: 340,
      y: 255,
      duration: 450,
      ease: 'Linear',
      onComplete: () => {
        // Toriel and Frisk turn together towards the north archway door
        if (this.textures.exists('npc_toriel_up')) {
          torielSpriteRef.setTexture('npc_toriel_up');
        }
        this.player.setTexture('player_up_0');
        this.playerDirection = 'up';

        // Little affectionate heart above Frisk & Toriel holding hands
        const handHeart = this.add.text(355, 220, '♥', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: '#e74c3c',
        });
        handHeart.setOrigin(0.5);
        handHeart.setDepth(20);
        this.tweens.add({
          targets: handHeart,
          y: 205,
          alpha: 0,
          duration: 550,
          onComplete: () => handHeart.destroy(),
        });

        // Step 2: Toriel and Frisk walk north together through the grand doorway
        let stepFrame = 0;
        const walkFriskTimer = this.time.addEvent({
          delay: 160,
          loop: true,
          callback: () => {
            stepFrame = stepFrame === 0 ? 1 : 0;
            this.player.setTexture(`player_up_${stepFrame}`);
          },
        });

        this.tweens.add({
          targets: [torielSpriteRef, this.player],
          y: 72,
          duration: 1400,
          ease: 'Linear',
          onComplete: () => {
            walkFriskTimer.remove();
            bobTween.stop();
            torielSpriteRef.setScale(1);
            this.player.setTexture('player_up_0');
            soundManager.playMenuSelect();

            // Transition to Toriel's Home Exterior with resilience flash (which randomly shows 007474)
            this.showResilienceTransition(
              () => {
                torielSpriteRef.destroy();
                this.torielDummyNpcSprite = null;
                gameState.setFlag('toriel_dummy_solved_cutscene', true);
                this.switchRoom('room_toriel_house_exterior', 180, 340);
              },
              () => {
                this.isCutsceneActive = false;
              }
            );
          },
        });
      },
    });
  }

  private runTorielHouseArrivalCutscene() {
    if (this.currentRoomId !== 'room_toriel_house_exterior') return;
    if (gameState.getFlag('toriel_house_arrival_cutscene')) return;
    if (this.isCutsceneActive || this.isDialogueActive) return;

    this.isCutsceneActive = true;
    this.isMoving = false;

    // Position Frisk at left courtyard entry facing right
    this.player.setPosition(160, 340);
    this.playerDirection = 'right';
    this.player.setTexture('player_right_0');

    // Find Toriel sprite in courtyard
    let torielSprite = this.torielHouseNpcSprite;
    if (!torielSprite || !torielSprite.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          torielSprite = s;
        }
      });
      this.torielHouseNpcSprite = torielSprite;
    }

    if (torielSprite && torielSprite.active) {
      torielSprite.setPosition(200, 340);
      torielSprite.setTexture('npc_toriel');
    }

    // Step 1: Frisk and Toriel walk together into the courtyard (Frisk to 270, 310; Toriel to 395, 215)
    let stepFrame = 0;
    const walkTimer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        stepFrame = stepFrame === 0 ? 1 : 0;
        this.player.setTexture(`player_right_${stepFrame}`);
      },
    });

    if (torielSprite && torielSprite.active) {
      this.tweens.add({
        targets: torielSprite,
        x: 395,
        y: 215,
        duration: 1300,
        ease: 'Linear',
      });
    }

    this.tweens.add({
      targets: this.player,
      x: 270,
      y: 310,
      duration: 1200,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        this.player.setTexture('player_right_0');
        gameState.setPlayerPos(270, 310);

        if (torielSprite && torielSprite.active) {
          soundManager.playVoiceBlip('toriel');
          this.tweens.add({
            targets: torielSprite,
            scaleY: 1.15,
            duration: 180,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        }

        this.time.delayedCall(450, () => {
          this.startDialogueById('toriel_house_welcome', () => {
            this.finishTorielHouseArrivalCutscene();
          });
        });
      },
    });
  }

  private finishTorielHouseArrivalCutscene() {
    let toriel = this.torielHouseNpcSprite;
    if (!toriel || !toriel.active) {
      this.interactablesGroup.getChildren().forEach((c) => {
        const s = c as Phaser.GameObjects.Sprite;
        const cfg = s.getData('config');
        if (cfg && cfg.npcKey === 'npc_toriel') {
          toriel = s;
        }
      });
      this.torielHouseNpcSprite = toriel;
    }

    if (!toriel || !toriel.active) {
      gameState.setFlag('toriel_house_arrival_cutscene', true);
      this.isCutsceneActive = false;
      return;
    }

    const torielSpriteRef = toriel;

    // Toriel turns up towards the cottage door
    if (this.textures.exists('npc_toriel_up')) {
      torielSpriteRef.setTexture('npc_toriel_up');
    }

    soundManager.playMenuMove();

    // Toriel walks to front door (x: 440, y: 195)
    this.tweens.add({
      targets: torielSpriteRef,
      x: 440,
      y: 195,
      duration: 650,
      ease: 'Linear',
      onComplete: () => {
        // Door unlock chime
        soundManager.playSave();

        // Heart of warmth above door
        const heart = this.add.text(440, 160, '♥', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '12px',
          color: '#e74c3c',
        });
        heart.setOrigin(0.5);
        heart.setDepth(20);
        this.tweens.add({
          targets: heart,
          y: 145,
          alpha: 0,
          duration: 650,
          onComplete: () => heart.destroy(),
        });

        // Toriel enters the cottage
        this.tweens.add({
          targets: torielSpriteRef,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            torielSpriteRef.destroy();
            this.torielHouseNpcSprite = null;
            gameState.setFlag('toriel_house_arrival_cutscene', true);
            this.isCutsceneActive = false;

            // Ambient Undertale narration hint
            const hint = this.add.text(
              320,
              430,
              '* Toriel entrou em casa para preparar a torta de caramelo e canela...',
              {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '9px',
                color: '#dcdde1',
                stroke: '#000000',
                strokeThickness: 3,
              }
            );
            hint.setOrigin(0.5);
            hint.setDepth(30);
            this.tweens.add({
              targets: hint,
              alpha: 0,
              y: 415,
              delay: 2400,
              duration: 800,
              onComplete: () => hint.destroy(),
            });
          },
        });
      },
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
