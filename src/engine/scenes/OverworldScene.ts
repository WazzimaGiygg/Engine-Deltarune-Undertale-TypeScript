import Phaser from 'phaser';
import { ALL_ITEMS } from '../../data/defaultData';
import { soundManager } from '../../services/soundSynthesizer';
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
    itemId?: string;
    targetRoom?: string;
    targetX?: number;
    targetY?: number;
    npcKey?: string;
    npcName?: string;
    npcVoice?: 'toriel' | 'sans' | 'papyrus' | 'monster';
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

  private currentRoomId = 'ruins_entrance';
  private roomGroup!: Phaser.GameObjects.Group;
  private wallsGroup!: Phaser.GameObjects.Group;
  private interactablesGroup!: Phaser.GameObjects.Group;

  // Dialogue system state
  public isDialogueActive = false;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueQueue: string[] = [];
  private currentFullText = '';
  private displayedCharIndex = 0;
  private typewriterTimer = 0;
  private activeVoice: 'toriel' | 'sans' | 'papyrus' | 'monster' = 'monster';

  // Room definitions
  private rooms: Record<string, RoomData> = {
    ruins_entrance: {
      id: 'ruins_entrance',
      name: 'Entrada das Ruínas',
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
        // Top boundary
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 64 })),
        // Left & Right
        ...Array.from({ length: 15 }, (_, i) => ({ x: 64, y: i * 32 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 544, y: i * 32 })),
        // Bottom boundary
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 32, y: 416 })),
      ],
      objects: [
        {
          type: 'save',
          x: 220,
          y: 260,
          id: 'save_1',
          text: '* A sombra das ruínas paira sobre você, mas o calor das flores douradas enche você de DETERMINAÇÃO.\n\n* (HP restaurado e Jogo Salvo!)',
        },
        {
          type: 'sign',
          x: 420,
          y: 200,
          text: '* "Apenas os determinados podem resolver os enigmas da caverna subterrânea."',
        },
        {
          type: 'npc',
          x: 320,
          y: 180,
          npcKey: 'enemy_froggit',
          npcName: 'Froggit Educado',
          npcVoice: 'monster',
          text: '* Ribbit, ribbit.\n* (Olá humano! Você sabia que apertando [C] você abre seu inventário e equipamentos?)',
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_puzzle',
          targetX: 320,
          targetY: 380,
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
          x: 200,
          y: 350,
          text: '* DICA: Pressione o botão vermelho no piso para desarmar as armadilhas de espinho.',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_entrance',
          targetX: 320,
          targetY: 100,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_crossroads',
          targetX: 320,
          targetY: 380,
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
          text: '* Saber que um simpático esqueleto e uma cabra maternal zelam por você enche você de DETERMINAÇÃO.\n\n* (HP restaurado e Jogo Salvo!)',
        },
        {
          type: 'npc',
          x: 220,
          y: 180,
          npcKey: 'npc_toriel',
          npcName: 'Toriel',
          npcVoice: 'toriel',
          text: '* Minha criança, tenha cuidado ao explorar as Ruínas!\n* Se encontrar problemas, você pode sempre poupar os monstros conversando com eles.',
        },
        {
          type: 'npc',
          x: 420,
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
          targetY: 100,
        },
        {
          type: 'door',
          x: 320,
          y: 64,
          targetRoom: 'ruins_boss_gate',
          targetX: 320,
          targetY: 380,
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
          x: 250,
          y: 180,
          npcKey: 'enemy_sir_ossos',
          npcName: 'Sir Ossos',
          npcVoice: 'papyrus',
          text: '* NYEH HEH HEH! HUMANO!\n* VOCÊ CHEGOU ATÉ O PORTÃO DA CORTE REAL!\n* PREPARE-SE PARA TESTAR SUA CORAGEM EM COMBATE!',
        },
        {
          type: 'npc',
          x: 390,
          y: 180,
          npcKey: 'enemy_deltajester',
          npcName: 'Bufão Caótico',
          npcVoice: 'monster',
          text: '* CAOS, CAOS! QUER JOGAR COMIGO, HUMANO?! O MUNDO GIRA EM TORNO DE NÓS!',
        },
        {
          type: 'sign',
          x: 320,
          y: 300,
          text: '* Aproxime-se de qualquer um dos campeões acima e aperte [Z] para iniciar um combate épico!',
        },
        {
          type: 'door',
          x: 320,
          y: 416,
          targetRoom: 'ruins_crossroads',
          targetX: 320,
          targetY: 100,
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
    this.player = this.add.sprite(savedPos.x, savedPos.y, 'player_down_0');
    this.player.setDepth(10);

    // Create Dialogue Box Container
    this.createDialogueBox();

    // Listen for custom virtual inputs from UI
    this.events.on('virtual_action', this.handleVirtualAction, this);
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

    // Walls
    room.wallTiles.forEach((wall) => {
      // Exclude doorway passages
      if (
        (wall.y === 64 && Math.abs(wall.x - 320) < 32) ||
        (wall.y === 416 && Math.abs(wall.x - 320) < 32)
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
        sprite = this.add.sprite(obj.x, obj.y, 'prop_sign');
      } else if (obj.type === 'switch') {
        const isSwitched = gameState.getFlag(obj.id || 'switch');
        sprite = this.add.sprite(obj.x, obj.y, isSwitched ? 'prop_switch_on' : 'prop_switch_off');
      } else if (obj.type === 'spikes') {
        const isDown = gameState.getFlag('switch_puzzle_1');
        sprite = this.add.sprite(obj.x, obj.y, isDown ? 'prop_spikes_down' : 'prop_spikes_up');
        sprite.setData('blocking', !isDown);
      } else if (obj.type === 'npc') {
        sprite = this.add.sprite(obj.x, obj.y, obj.npcKey || 'enemy_froggit');
        // Gentle bobbing animation for NPCs
        this.tweens.add({
          targets: sprite,
          y: obj.y - 3,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        // Doorway trigger
        sprite = this.add.rectangle(obj.x, obj.y, 40, 20, 0x000000, 0) as unknown as Phaser.GameObjects.Sprite;
      }

      sprite.setDepth(4);
      sprite.setData('config', obj);
      this.interactablesGroup.add(sprite);
    });
  }

  private createDialogueBox() {
    this.dialogueBox = this.add.container(320, 410);
    this.dialogueBox.setDepth(100);
    this.dialogueBox.setVisible(false);

    // Black box with white border
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.lineStyle(4, 0xffffff, 1);
    bg.fillRoundedRect(-280, -55, 560, 110, 6);
    bg.strokeRoundedRect(-280, -55, 560, 110, 6);
    this.dialogueBox.add(bg);

    // Text field
    this.dialogueText = this.add.text(-255, -42, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: 510 },
      lineSpacing: 8,
    });
    this.dialogueBox.add(this.dialogueText);

    // Advance prompt indicator
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
    voice: 'toriel' | 'sans' | 'papyrus' | 'monster' = 'monster'
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
    if (this.isDialogueActive) {
      this.handleDialogueTyping(delta);
      return;
    }

    this.handleMovement(delta);
    this.checkInteractions();
  }

  private handleDialogueTyping(delta: number) {
    // Check confirm key press to skip or advance
    const justPressedZ =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    const justPressedX = Phaser.Input.Keyboard.JustDown(this.wasd.X);

    // Fast-forward text if X is pressed
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

        // Play voice blip for characters except spaces
        if (nextChar && nextChar.trim() !== '') {
          soundManager.playVoiceBlip(this.activeVoice);
        }
      }

      if (justPressedZ) {
        // Skip straight to end of current page
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
      }
    } else {
      // Line is fully revealed, waiting for player confirm
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
      // Normalize
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;

      const nextX = this.player.x + vx * this.speed * (delta / 1000);
      const nextY = this.player.y + vy * this.speed * (delta / 1000);

      // Check collision
      if (!this.checkWallCollision(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      if (!this.checkWallCollision(this.player.x, nextY)) {
        this.player.y = nextY;
      }

      // Update walk animation
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

    // Check door trigger
    this.checkDoorTriggers();
  }

  private checkWallCollision(x: number, y: number): boolean {
    const playerHalfW = 12;
    const playerHalfH = 14;

    let hit = false;
    this.wallsGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (
        Math.abs(x - sprite.x) < 16 + playerHalfW &&
        Math.abs(y - sprite.y) < 16 + playerHalfH
      ) {
        hit = true;
      }
    });

    // Check blocking puzzle spikes
    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.getData('blocking')) {
        if (
          Math.abs(x - sprite.x) < 16 + playerHalfW &&
          Math.abs(y - sprite.y) < 16 + playerHalfH
        ) {
          hit = true;
        }
      }
    });

    return hit;
  }

  private checkDoorTriggers() {
    this.interactablesGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      const cfg = sprite.getData('config');
      if (cfg && cfg.type === 'door') {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cfg.x, cfg.y);
        if (dist < 26) {
          this.switchRoom(cfg.targetRoom, cfg.targetX, cfg.targetY);
        }
      }
    });
  }

  public switchRoom(targetRoom: string, targetX: number, targetY: number) {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.buildRoom(targetRoom);
      this.player.setPosition(targetX, targetY);
      gameState.setPlayerPos(targetX, targetY);
      this.cameras.main.fadeIn(200, 0, 0, 0);
    });
  }

  private checkInteractions() {
    const justPressedZ =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    // Open menu with C / ESC
    const justPressedC =
      Phaser.Input.Keyboard.JustDown(this.wasd.C) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ESC);

    if (justPressedC) {
      soundManager.playMenuSelect();
      this.game.events.emit('open_overworld_menu');
      return;
    }

    if (!justPressedZ) return;

    // Check closest interactable
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
      soundManager.playSave();
      gameState.restoreFullHp();
      gameState.saveGame();
      this.showDialogue(cfg.text || '* Arquivo Salvo!');
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

        // Retract spikes
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
      // If boss NPC at gate, initiate battle!
      if (cfg.npcKey === 'enemy_sir_ossos') {
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

    // Iconic flash effect
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
    if (action === 'Z') {
      if (this.isDialogueActive) {
        this.advanceDialogue();
      } else {
        this.checkInteractions();
      }
    } else if (action === 'X') {
      if (this.isDialogueActive) {
        this.displayedCharIndex = this.currentFullText.length;
        this.dialogueText.setText(this.currentFullText);
      }
    } else if (action === 'C') {
      this.game.events.emit('open_overworld_menu');
    }
  }
}
