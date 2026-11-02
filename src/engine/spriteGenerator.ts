import Phaser from 'phaser';

export class SpriteGenerator {
  public static generateAllTextures(scene: Phaser.Scene) {
    this.createPlayerTextures(scene);
    this.createSoulTextures(scene);
    this.createEnemyTextures(scene);
    this.createTileTextures(scene);
    this.createBattleEffects(scene);
    this.createDialoguePortraits(scene);
  }

  private static createPlayerTextures(scene: Phaser.Scene) {
    if (scene.textures.exists('player_down_0')) return;

    // Palette:
    // Hair: #4a2c11
    // Skin: #fcd0a1
    // Sweater: #34495e (blue) with #9b59b6 (purple stripes)
    // Shorts: #1a252f
    // Shoes: #5a3818

    const drawFrisk = (key: string, dir: 'down' | 'up' | 'left' | 'right', step: number) => {
      const canvas = scene.textures.createCanvas(key, 32, 48);
      if (!canvas) return;
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;

      // Scale unit: 2x2 per "pixel"
      const p = 2;

      // Hair & Head
      ctx.fillStyle = '#4a2c11';
      ctx.fillRect(4 * p, 1 * p, 8 * p, 4 * p); // Top hair
      ctx.fillRect(3 * p, 2 * p, 10 * p, 4 * p); // Side hair

      // Face
      ctx.fillStyle = '#fcd0a1';
      if (dir === 'down') {
        ctx.fillRect(4 * p, 4 * p, 8 * p, 5 * p);
        // Eyes (horizontal calm lines - -)
        ctx.fillStyle = '#2c1e11';
        ctx.fillRect(5 * p, 6 * p, 2 * p, 1 * p);
        ctx.fillRect(9 * p, 6 * p, 2 * p, 1 * p);
        // Mouth
        ctx.fillRect(7 * p, 8 * p, 2 * p, 1 * p);
      } else if (dir === 'up') {
        // Back of head (all hair)
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(3 * p, 2 * p, 10 * p, 7 * p);
      } else if (dir === 'left') {
        ctx.fillRect(3 * p, 4 * p, 7 * p, 5 * p);
        ctx.fillStyle = '#2c1e11';
        ctx.fillRect(4 * p, 6 * p, 2 * p, 1 * p);
        ctx.fillRect(4 * p, 8 * p, 1 * p, 1 * p);
      } else {
        // right
        ctx.fillRect(6 * p, 4 * p, 7 * p, 5 * p);
        ctx.fillStyle = '#2c1e11';
        ctx.fillRect(10 * p, 6 * p, 2 * p, 1 * p);
        ctx.fillRect(11 * p, 8 * p, 1 * p, 1 * p);
      }

      // Torso / Sweater
      ctx.fillStyle = '#2980b9'; // Blue sweater
      ctx.fillRect(4 * p, 9 * p, 8 * p, 7 * p);
      // Purple stripes
      ctx.fillStyle = '#e056fd';
      ctx.fillRect(4 * p, 11 * p, 8 * p, 1.5 * p);
      ctx.fillRect(4 * p, 14 * p, 8 * p, 1.5 * p);

      // Arms
      ctx.fillStyle = '#2980b9';
      if (dir === 'left') {
        ctx.fillRect(6 * p, 10 * p, 3 * p, 5 * p);
      } else if (dir === 'right') {
        ctx.fillRect(7 * p, 10 * p, 3 * p, 5 * p);
      } else {
        ctx.fillRect(2 * p, 10 * p, 2 * p, 5 * p);
        ctx.fillRect(12 * p, 10 * p, 2 * p, 5 * p);
      }

      // Shorts
      ctx.fillStyle = '#1b1464';
      ctx.fillRect(5 * p, 16 * p, 6 * p, 3 * p);

      // Legs / Shoes with walking offset
      ctx.fillStyle = '#5a3818';
      const legOff = step === 1 ? 1 : 0;
      if (dir === 'down' || dir === 'up') {
        ctx.fillRect(5 * p, (19 - legOff) * p, 2 * p, (4 + legOff) * p);
        ctx.fillRect(9 * p, (19 + legOff) * p, 2 * p, (4 - legOff) * p);
      } else {
        ctx.fillRect((6 + (step === 1 ? 2 : -1)) * p, 19 * p, 3 * p, 4 * p);
      }

      canvas.refresh();
    };

    ['down', 'up', 'left', 'right'].forEach((dir) => {
      drawFrisk(`player_${dir}_0`, dir as 'down' | 'up' | 'left' | 'right', 0);
      drawFrisk(`player_${dir}_1`, dir as 'down' | 'up' | 'left' | 'right', 1);
    });

    // Frisk fallen / sleeping on the golden flower bed
    if (!scene.textures.exists('player_fallen')) {
      const canvas = scene.textures.createCanvas('player_fallen', 48, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        const p = 2;

        // Shadow under Frisk
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(24, 22, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair (spread out slightly on the left/ground)
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(4 * p, 4 * p, 8 * p, 6 * p);
        ctx.fillRect(2 * p, 5 * p, 3 * p, 4 * p);

        // Face resting sideways
        ctx.fillStyle = '#fcd0a1';
        ctx.fillRect(8 * p, 5 * p, 5 * p, 5 * p);

        // Peaceful closed eye (- -)
        ctx.fillStyle = '#2c1e11';
        ctx.fillRect(9 * p, 7 * p, 2 * p, 1 * p);
        // Small mouth
        ctx.fillRect(11 * p, 9 * p, 1 * p, 1 * p);

        // Blue sweater (horizontal torso)
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(12 * p, 5 * p, 7 * p, 5 * p);

        // Magenta/purple sweater stripes
        ctx.fillStyle = '#e056fd';
        ctx.fillRect(14 * p, 5 * p, 1 * p, 5 * p);
        ctx.fillRect(17 * p, 5 * p, 1 * p, 5 * p);

        // Arm resting on the flowers
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(11 * p, 9 * p, 4 * p, 2 * p);
        ctx.fillStyle = '#fcd0a1'; // hand
        ctx.fillRect(15 * p, 9 * p, 1 * p, 2 * p);

        // Dark shorts
        ctx.fillStyle = '#1b1464';
        ctx.fillRect(18 * p, 6 * p, 3 * p, 4 * p);

        // Legs / Brown Shoes tucked
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(20 * p, 7 * p, 3 * p, 3 * p);

        canvas.refresh();
      }
    }
  }

  private static createSoulTextures(scene: Phaser.Scene) {
    if (scene.textures.exists('soul_red')) return;

    const drawHeart = (key: string, color: string) => {
      const canvas = scene.textures.createCanvas(key, 24, 24);
      if (!canvas) return;
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = color;
      // Draw pixel heart
      const matrix = [
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
      ];

      const p = 3;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            ctx.fillRect(c * p, r * p + 1 * p, p, p);
          }
        }
      }
      canvas.refresh();
    };

    drawHeart('soul_red', '#ff0000');
    drawHeart('soul_blue', '#0099ff');
    drawHeart('soul_yellow', '#ffff00');
    drawHeart('soul_white', '#ffffff'); // Invulnerable flashing
  }

  private static createEnemyTextures(scene: Phaser.Scene) {
    // 1. Froggit
    if (!scene.textures.exists('enemy_froggit')) {
      const canvas = scene.textures.createCanvas('enemy_froggit', 128, 128);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Black & White retro style with subtle shading
        ctx.fillStyle = '#ffffff';

        // Antennas
        ctx.fillRect(40, 20, 8, 20);
        ctx.fillRect(80, 20, 8, 20);
        ctx.fillRect(36, 16, 16, 8);
        ctx.fillRect(76, 16, 16, 8);

        // Body
        ctx.fillRect(32, 40, 64, 48);
        ctx.fillRect(24, 48, 80, 36);

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(44, 48, 10, 12);
        ctx.fillRect(74, 48, 10, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(46, 50, 4, 4);
        ctx.fillRect(76, 50, 4, 4);

        // Mouth line
        ctx.fillStyle = '#000000';
        ctx.fillRect(52, 70, 24, 4);
        ctx.fillRect(50, 68, 4, 4);
        ctx.fillRect(74, 68, 4, 4);

        // Legs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 76, 20, 24);
        ctx.fillRect(92, 76, 20, 24);
        ctx.fillRect(12, 94, 28, 10);
        ctx.fillRect(88, 94, 28, 10);

        canvas.refresh();
      }
    }

    // 2. Sir Ossos (Papyrus style)
    if (!scene.textures.exists('enemy_sir_ossos')) {
      const canvas = scene.textures.createCanvas('enemy_sir_ossos', 128, 160);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Skull
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(48, 16, 32, 28);
        ctx.fillRect(44, 24, 40, 16);

        // Eye sockets & toothy grin
        ctx.fillStyle = '#000000';
        ctx.fillRect(52, 24, 8, 10);
        ctx.fillRect(68, 24, 8, 10);
        ctx.fillRect(52, 38, 24, 4);
        ctx.fillRect(56, 36, 4, 8);
        ctx.fillRect(64, 36, 4, 8);

        // Red Scarf / Cape
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(40, 44, 48, 14);
        ctx.fillRect(24, 52, 20, 32); // cape flowing
        ctx.fillRect(84, 50, 14, 24);

        // Battle Body Armor
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(44, 58, 40, 28);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(56, 64, 16, 12); // Star emblem

        // Spine & Ribs
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(60, 86, 8, 14);

        // Belt / Underwear
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(50, 100, 28, 10);

        // Long skeletal legs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(52, 110, 6, 24);
        ctx.fillRect(70, 110, 6, 24);

        // Big red boots
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(46, 134, 16, 20);
        ctx.fillRect(68, 134, 16, 20);

        // Gloved Hands on hips
        ctx.fillRect(30, 64, 14, 16);
        ctx.fillRect(84, 64, 14, 16);

        canvas.refresh();
      }
    }

    // 3. Bufao Caotico (Deltajester style)
    if (!scene.textures.exists('enemy_deltajester')) {
      const canvas = scene.textures.createCanvas('enemy_deltajester', 128, 128);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Jester Hat (Purple & Black with golden bells)
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(40, 16, 48, 20);
        ctx.fillRect(24, 12, 20, 28);
        ctx.fillRect(84, 12, 20, 28);

        ctx.fillStyle = '#f1c40f'; // Bells
        ctx.fillRect(20, 36, 10, 10);
        ctx.fillRect(98, 36, 10, 10);
        ctx.fillRect(59, 10, 10, 10);

        // Face (White round mask)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(44, 36, 40, 32);

        // Sinister yellow eyes and wide black smile
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(50, 44, 8, 6);
        ctx.fillRect(70, 44, 8, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(52, 46, 4, 3);
        ctx.fillRect(72, 46, 4, 3);

        // Sharp smile
        ctx.fillRect(48, 56, 32, 6);
        ctx.fillRect(46, 54, 4, 4);
        ctx.fillRect(78, 54, 4, 4);

        // Collar
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(40, 68, 48, 10);

        // Body
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(48, 78, 32, 28);

        // Floating hands
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(28, 72, 14, 14);
        ctx.fillRect(86, 72, 14, 14);

        canvas.refresh();
      }
    }

    // 3b. Toriel Boss Battle Sprite (140x160)
    if (!scene.textures.exists('enemy_toriel')) {
      const canvas = scene.textures.createCanvas('enemy_toriel', 140, 160);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Horns
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 12, 10, 18);
        ctx.fillRect(80, 12, 10, 18);
        ctx.fillRect(46, 16, 6, 12);
        ctx.fillRect(88, 16, 6, 12);

        // Head
        ctx.fillRect(46, 26, 48, 40);
        ctx.fillRect(40, 34, 60, 28);

        // Floppy Ears
        ctx.fillRect(32, 38, 10, 36);
        ctx.fillRect(98, 38, 10, 36);
        ctx.fillRect(34, 72, 6, 6);
        ctx.fillRect(100, 72, 6, 6);

        // Eyes (pained, motherly droop)
        ctx.fillStyle = '#000000';
        ctx.fillRect(52, 42, 8, 8);
        ctx.fillRect(80, 42, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(54, 44, 3, 3);
        ctx.fillRect(82, 44, 3, 3);

        // Snout & Fangs
        ctx.fillStyle = '#000000';
        ctx.fillRect(66, 52, 8, 4); // nose
        ctx.fillRect(62, 60, 16, 2); // mouth line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(60, 62, 3, 4); // left fang
        ctx.fillRect(77, 62, 3, 4); // right fang

        // Robes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(34, 70, 72, 84); // robe body
        ctx.fillRect(24, 78, 14, 50); // left sleeve
        ctx.fillRect(102, 78, 14, 50); // right sleeve

        // Robe black contour & interior pattern
        ctx.fillStyle = '#000000';
        ctx.fillRect(38, 74, 64, 76);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(42, 78, 56, 68);

        // Delta Rune Emblem on Chest
        ctx.fillStyle = '#000000';
        // Winged Circle
        ctx.beginPath();
        ctx.arc(70, 92, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(52, 90, 10, 3); // left wing
        ctx.fillRect(78, 90, 10, 3); // right wing

        // 3 Triangles
        ctx.fillRect(62, 104, 6, 6);
        ctx.fillRect(72, 104, 6, 6);
        ctx.fillRect(67, 114, 6, 6);

        // White Paws / Hands clasped gently in front
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(58, 126, 10, 12);
        ctx.fillRect(72, 126, 10, 12);

        canvas.refresh();
      }
    }

    // 4. Flowey the Flower (Friendly)
    if (!scene.textures.exists('flowey_friendly')) {
      const canvas = scene.textures.createCanvas('flowey_friendly', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Stem & Leaf
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(30, 42, 4, 20); // stem
        ctx.fillRect(22, 50, 8, 4);  // left leaf
        ctx.fillRect(18, 48, 6, 4);
        ctx.fillRect(34, 52, 8, 4);  // right leaf
        ctx.fillRect(40, 50, 6, 4);

        // 6 Golden Petals
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(26, 6, 12, 14);  // Top
        ctx.fillRect(26, 38, 12, 14); // Bottom
        ctx.fillRect(8, 22, 14, 12);  // Left
        ctx.fillRect(42, 22, 14, 12); // Right
        ctx.fillRect(14, 12, 10, 10); // Top-left
        ctx.fillRect(40, 12, 10, 10); // Top-right
        ctx.fillRect(14, 34, 10, 10); // Bottom-left
        ctx.fillRect(40, 34, 10, 10); // Bottom-right

        // Center White Face
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 18, 24, 22);
        ctx.fillRect(18, 22, 28, 14);

        // Cute smiling eyes & mouth (:3 / happy smile)
        ctx.fillStyle = '#000000';
        ctx.fillRect(24, 24, 3, 5); // Left eye
        ctx.fillRect(37, 24, 3, 5); // Right eye

        // Cute smile
        ctx.fillRect(26, 33, 12, 2);
        ctx.fillRect(25, 31, 2, 2);
        ctx.fillRect(37, 31, 2, 2);

        // Cheeks
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(22, 28, 3, 2);
        ctx.fillRect(39, 28, 3, 2);

        canvas.refresh();
      }
    }

    // 4b. Flowey the Flower (Annoyed / Irritated upon dodging)
    if (!scene.textures.exists('flowey_annoyed')) {
      const canvas = scene.textures.createCanvas('flowey_annoyed', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Stem & Leaf
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(30, 42, 4, 20);
        ctx.fillRect(22, 50, 8, 4);
        ctx.fillRect(18, 48, 6, 4);
        ctx.fillRect(34, 52, 8, 4);
        ctx.fillRect(40, 50, 6, 4);

        // Petals slightly angled
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(26, 6, 12, 14);
        ctx.fillRect(26, 38, 12, 14);
        ctx.fillRect(8, 22, 14, 12);
        ctx.fillRect(42, 22, 14, 12);
        ctx.fillRect(14, 12, 10, 10);
        ctx.fillRect(40, 12, 10, 10);
        ctx.fillRect(14, 34, 10, 10);
        ctx.fillRect(40, 34, 10, 10);

        // Center White Face
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 18, 24, 22);
        ctx.fillRect(18, 22, 28, 14);

        // Annoyed angled eyebrows
        ctx.fillStyle = '#000000';
        ctx.fillRect(23, 21, 5, 2);
        ctx.fillRect(36, 21, 5, 2);

        // Glaring eyes
        ctx.fillRect(24, 24, 4, 4);
        ctx.fillRect(36, 24, 4, 4);

        // Gritted / tight flat mouth with twitching smile
        ctx.fillRect(25, 33, 14, 2);
        ctx.fillRect(24, 31, 2, 3);
        ctx.fillRect(38, 31, 2, 3);

        canvas.refresh();
      }
    }

    // 5. Flowey the Flower (Sinister / Evil)
    if (!scene.textures.exists('flowey_evil')) {
      const canvas = scene.textures.createCanvas('flowey_evil', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Stem
        ctx.fillStyle = '#1e8449';
        ctx.fillRect(30, 42, 4, 20);

        // Petals
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(26, 6, 12, 14);
        ctx.fillRect(26, 38, 12, 14);
        ctx.fillRect(8, 22, 14, 12);
        ctx.fillRect(42, 22, 14, 12);
        ctx.fillRect(14, 12, 10, 10);
        ctx.fillRect(40, 12, 10, 10);
        ctx.fillRect(14, 34, 10, 10);
        ctx.fillRect(40, 34, 10, 10);

        // Face
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(20, 18, 24, 22);
        ctx.fillRect(18, 22, 28, 14);

        // Creepy hollow eyes with white pinpricks
        ctx.fillStyle = '#000000';
        ctx.fillRect(23, 22, 6, 8);
        ctx.fillRect(35, 22, 6, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 25, 2, 2);
        ctx.fillRect(37, 25, 2, 2);

        // Sinister jagged wide mouth
        ctx.fillStyle = '#000000';
        ctx.fillRect(22, 32, 20, 6);
        ctx.fillRect(20, 30, 3, 3);
        ctx.fillRect(41, 30, 3, 3);
        // Sharp teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 32, 2, 3);
        ctx.fillRect(28, 32, 2, 3);
        ctx.fillRect(34, 32, 2, 3);
        ctx.fillRect(38, 32, 2, 3);

        canvas.refresh();
      }
    }

    // 6. Flowey Scorched / Hurt
    if (!scene.textures.exists('flowey_hurt')) {
      const canvas = scene.textures.createCanvas('flowey_hurt', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Stem
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(30, 44, 4, 18);

        // Wilting petals
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(26, 10, 12, 10);
        ctx.fillRect(26, 40, 12, 10);
        ctx.fillRect(10, 24, 10, 10);
        ctx.fillRect(44, 24, 10, 10);

        // Face
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 20, 24, 20);

        // Dazed mouth 'O' and wide eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(24, 24, 4, 4);
        ctx.fillRect(36, 24, 4, 4);
        ctx.fillRect(28, 32, 8, 6);

        canvas.refresh();
      }
    }
  }

  private static createTileTextures(scene: Phaser.Scene) {
    // 1. Ruins Floor
    if (!scene.textures.exists('tile_floor_ruins')) {
      const canvas = scene.textures.createCanvas('tile_floor_ruins', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#2d1b36'; // Dark purple
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#392244';
        ctx.fillRect(1, 1, 30, 30);
        ctx.fillStyle = '#4c2e5b';
        ctx.fillRect(2, 2, 6, 6);
        ctx.fillRect(18, 16, 6, 6);
        canvas.refresh();
      }
    }

    // 2. Ruins Wall
    if (!scene.textures.exists('tile_wall_ruins')) {
      const canvas = scene.textures.createCanvas('tile_wall_ruins', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#1c0f24';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#412252';
        ctx.fillRect(2, 2, 28, 12);
        ctx.fillRect(2, 16, 28, 14);
        ctx.fillStyle = '#552e6a';
        ctx.fillRect(4, 4, 8, 4);
        ctx.fillRect(18, 18, 10, 4);
        canvas.refresh();
      }
    }

    // 3. Flower Patch (Golden flowers)
    if (!scene.textures.exists('tile_flower_patch')) {
      const canvas = scene.textures.createCanvas('tile_flower_patch', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#1e3820'; // Grass
        ctx.fillRect(0, 0, 32, 32);

        // Golden flowers
        ctx.fillStyle = '#f1c40f';
        const spots = [[6, 8], [22, 6], [14, 18], [8, 24], [24, 22]];
        spots.forEach(([x, y]) => {
          ctx.fillRect(x - 2, y, 5, 2);
          ctx.fillRect(x, y - 2, 2, 5);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = '#f1c40f';
        });
        canvas.refresh();
      }
    }

    // 4. Save Star
    if (!scene.textures.exists('prop_save_star')) {
      const canvas = scene.textures.createCanvas('prop_save_star', 24, 24);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#ffff00';
        // 4 pointed star
        ctx.fillRect(10, 2, 4, 20);
        ctx.fillRect(2, 10, 20, 4);
        ctx.fillRect(6, 6, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 9, 6, 6);
        canvas.refresh();
      }
    }

    // 4b. Particle Star for Save sparkle effects
    if (!scene.textures.exists('particle_star')) {
      const canvas = scene.textures.createCanvas('particle_star', 10, 10);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#ffff33';
        ctx.fillRect(4, 0, 2, 10);
        ctx.fillRect(0, 4, 10, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3, 3, 4, 4);
        canvas.refresh();
      }
    }

    // 5. Chest
    if (!scene.textures.exists('prop_chest')) {
      const canvas = scene.textures.createCanvas('prop_chest', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(4, 8, 24, 20);
        ctx.fillStyle = '#8e5429';
        ctx.fillRect(6, 10, 20, 8);
        ctx.fillStyle = '#d35400';
        ctx.fillRect(6, 20, 20, 6);
        ctx.fillStyle = '#f1c40f'; // Lock
        ctx.fillRect(14, 16, 4, 6);
        canvas.refresh();
      }
    }

    // 6. Sign
    if (!scene.textures.exists('prop_sign')) {
      const canvas = scene.textures.createCanvas('prop_sign', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(14, 18, 4, 12); // Post
        ctx.fillStyle = '#a6703c';
        ctx.fillRect(4, 6, 24, 14); // Board
        ctx.fillStyle = '#e1b782';
        ctx.fillRect(6, 8, 20, 10);
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(8, 10, 16, 2);
        ctx.fillRect(8, 14, 12, 2);
        canvas.refresh();
      }
    }

    // 7. Puzzle Switch (Undertale Wall Lever)
    if (!scene.textures.exists('prop_switch_off')) {
      const canvas = scene.textures.createCanvas('prop_switch_off', 28, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark stone plate backing
        ctx.fillStyle = '#22152b';
        ctx.fillRect(2, 2, 24, 24);

        // Metal casing
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(4, 4, 20, 20);
        ctx.fillStyle = '#718096';
        ctx.fillRect(5, 5, 18, 2);
        ctx.fillRect(5, 5, 2, 18);

        // Corner mounting screws
        ctx.fillStyle = '#cbd5e0';
        ctx.fillRect(5, 5, 2, 2);
        ctx.fillRect(21, 5, 2, 2);
        ctx.fillRect(5, 21, 2, 2);
        ctx.fillRect(21, 21, 2, 2);

        // Center slot
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(12, 7, 4, 14);

        // Lever knob in UP position (Red - OFF)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(11, 7, 6, 8);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(12, 8, 4, 5);
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(13, 8, 2, 2);

        // Small indicator light (Red)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(7, 12, 2, 4);

        canvas.refresh();
      }
    }
    if (!scene.textures.exists('prop_switch_on')) {
      const canvas = scene.textures.createCanvas('prop_switch_on', 28, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark stone plate backing
        ctx.fillStyle = '#22152b';
        ctx.fillRect(2, 2, 24, 24);

        // Metal casing
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(4, 4, 20, 20);
        ctx.fillStyle = '#718096';
        ctx.fillRect(5, 5, 18, 2);
        ctx.fillRect(5, 5, 2, 18);

        // Corner mounting screws
        ctx.fillStyle = '#cbd5e0';
        ctx.fillRect(5, 5, 2, 2);
        ctx.fillRect(21, 5, 2, 2);
        ctx.fillRect(5, 21, 2, 2);
        ctx.fillRect(21, 21, 2, 2);

        // Center slot
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(12, 7, 4, 14);

        // Lever knob in DOWN position (Green - ON)
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(11, 13, 6, 8);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(12, 14, 4, 5);
        ctx.fillStyle = '#55efc4';
        ctx.fillRect(13, 15, 2, 2);

        // Small indicator light (Glowing Green)
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(7, 12, 2, 4);
        ctx.fillStyle = '#a8ff78';
        ctx.fillRect(7, 13, 1, 2);

        canvas.refresh();
      }
    }

    // 7b. Toriel's Yellow Chalk Marking on Wall (48x28)
    if (!scene.textures.exists('prop_chalk_marking')) {
      const canvas = scene.textures.createCanvas('prop_chalk_marking', 48, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Yellow chalk arrow pointing right: ---->
        ctx.fillStyle = '#f1c40f';
        // Arrow shaft
        ctx.fillRect(4, 12, 28, 4);
        ctx.fillRect(2, 13, 30, 2);
        // Arrow head
        ctx.fillRect(28, 8, 4, 12);
        ctx.fillRect(32, 10, 4, 8);
        ctx.fillRect(36, 12, 4, 4);

        // Cute chalk heart next to arrow
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(6, 2, 3, 3);
        ctx.fillRect(11, 2, 3, 3);
        ctx.fillRect(5, 4, 10, 3);
        ctx.fillRect(7, 7, 6, 2);
        ctx.fillRect(9, 9, 2, 2);

        // Chalk powder texture specks
        ctx.fillStyle = 'rgba(255, 234, 167, 0.7)';
        ctx.fillRect(14, 18, 2, 2);
        ctx.fillRect(24, 19, 3, 1);
        ctx.fillRect(34, 17, 2, 2);

        canvas.refresh();
      }
    }

    // 7c. Stone Bridge Railing (14x72)
    if (!scene.textures.exists('prop_bridge_rail')) {
      const canvas = scene.textures.createCanvas('prop_bridge_rail', 14, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Base post & parapet stone
        ctx.fillStyle = '#1c0f24';
        ctx.fillRect(0, 0, 14, 72);
        ctx.fillStyle = '#3f2150';
        ctx.fillRect(2, 2, 10, 68);
        ctx.fillStyle = '#5b3272';
        ctx.fillRect(2, 2, 10, 4);
        ctx.fillRect(2, 66, 10, 4);

        // Vertical balusters
        ctx.fillStyle = '#281335';
        ctx.fillRect(4, 10, 6, 52);
        ctx.fillStyle = '#6d3c88';
        ctx.fillRect(5, 14, 4, 44);

        canvas.refresh();
      }
    }

    // 8. Puzzle Spikes
    if (!scene.textures.exists('prop_spikes_up')) {
      const canvas = scene.textures.createCanvas('prop_spikes_up', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#bdc3c7';
        // Sharp metallic spikes
        ctx.beginPath();
        ctx.moveTo(4, 28);
        ctx.lineTo(10, 6);
        ctx.lineTo(16, 28);
        ctx.moveTo(16, 28);
        ctx.lineTo(22, 6);
        ctx.lineTo(28, 28);
        ctx.fill();
        canvas.refresh();
      }
    }
    if (!scene.textures.exists('prop_spikes_down')) {
      const canvas = scene.textures.createCanvas('prop_spikes_down', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(6, 10, 8, 8);
        ctx.fillRect(18, 10, 8, 8);
        canvas.refresh();
      }
    }

    // 9. NPC: Sans
    if (!scene.textures.exists('npc_sans')) {
      const canvas = scene.textures.createCanvas('npc_sans', 32, 40);
      if (canvas) {
        const ctx = canvas.getContext();
        // Skull
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 4, 16, 14);
        ctx.fillStyle = '#000000';
        ctx.fillRect(11, 8, 3, 4);
        ctx.fillRect(18, 8, 3, 4);
        ctx.fillRect(12, 14, 8, 2);
        // Blue Hoodie
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(6, 18, 20, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(13, 18, 6, 14);
        // Shorts & Pink Slippers
        ctx.fillStyle = '#111111';
        ctx.fillRect(8, 32, 16, 5);
        ctx.fillStyle = '#ff9ff3';
        ctx.fillRect(7, 36, 6, 4);
        ctx.fillRect(19, 36, 6, 4);
        canvas.refresh();
      }
    }

    // 9b. NPC: Sans Shadow Silhouette (Creeping behind Frisk in Snowdin woods)
    if (!scene.textures.exists('npc_sans_shadow')) {
      const canvas = scene.textures.createCanvas('npc_sans_shadow', 32, 40);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark shadowy outline
        ctx.fillStyle = '#080614';
        ctx.fillRect(8, 4, 16, 14); // head
        ctx.fillRect(5, 18, 22, 16); // body/hoodie
        ctx.fillRect(8, 34, 16, 6); // legs

        // Slightly luminous white eye dots in the dark
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 10, 2, 2);
        ctx.fillRect(18, 10, 2, 2);

        canvas.refresh();
      }
    }

    // 10. NPC: Toriel
    if (!scene.textures.exists('npc_toriel')) {
      const canvas = scene.textures.createCanvas('npc_toriel', 40, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        // Goat Horns & Ears
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 6, 16, 16);
        ctx.fillRect(8, 10, 6, 14); // Floppy ears
        ctx.fillRect(26, 10, 6, 14);
        ctx.fillStyle = '#000000';
        ctx.fillRect(15, 12, 2, 4);
        ctx.fillRect(23, 12, 2, 4);
        ctx.fillRect(18, 18, 4, 2);
        // Purple Robe
        ctx.fillStyle = '#6c5ce7';
        ctx.fillRect(8, 22, 24, 30);
        ctx.fillStyle = '#ffffff';
        // Delta rune crest
        ctx.fillRect(18, 26, 4, 4);
        ctx.fillRect(16, 32, 8, 2);
        ctx.fillRect(14, 36, 12, 2);
        canvas.refresh();
      }
    }

    // 10b. NPC: Toriel Facing Up / Walking North
    if (!scene.textures.exists('npc_toriel_up')) {
      const canvas = scene.textures.createCanvas('npc_toriel_up', 40, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Goat Horns & Head Back
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 6, 16, 16);
        ctx.fillRect(8, 10, 6, 14); // Floppy ears
        ctx.fillRect(26, 10, 6, 14);
        // Horn tips
        ctx.fillRect(13, 2, 3, 5);
        ctx.fillRect(24, 2, 3, 5);
        // Soft back head shading
        ctx.fillStyle = '#e4e4e4';
        ctx.fillRect(14, 8, 12, 12);

        // Purple Robe back (no face/delta rune visible from behind)
        ctx.fillStyle = '#5c4cd7';
        ctx.fillRect(8, 22, 24, 30);
        ctx.fillStyle = '#4a3ab8';
        ctx.fillRect(8, 48, 24, 4);

        // White sleeves at sides
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, 26, 3, 16);
        ctx.fillRect(31, 26, 3, 16);

        canvas.refresh();
      }
    }

    // 11. Large Bed of Golden Flowers (Undertale Room 1)
    if (!scene.textures.exists('prop_golden_flowerbed')) {
      const canvas = scene.textures.createCanvas('prop_golden_flowerbed', 144, 84);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Ground shadow & soft dark soil
        ctx.fillStyle = '#0f1f12';
        ctx.beginPath();
        ctx.ellipse(72, 44, 68, 38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lush dark foliage base
        ctx.fillStyle = '#1e3820';
        ctx.beginPath();
        ctx.ellipse(72, 42, 62, 34, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d5a27';
        ctx.beginPath();
        ctx.ellipse(72, 40, 56, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Clusters of golden buttercups
        const flowerCoords = [
          [72, 40], [60, 34], [84, 34], [52, 46], [92, 46],
          [72, 26], [72, 54], [42, 38], [102, 38], [60, 22],
          [84, 22], [58, 56], [86, 56], [32, 44], [112, 44],
          [48, 28], [96, 28], [72, 16], [72, 64], [40, 52],
          [104, 52], [24, 42], [120, 42], [50, 18], [94, 18],
          [34, 32], [110, 32], [62, 64], [82, 64], [52, 62],
          [92, 62], [28, 48], [116, 48], [66, 48], [78, 48]
        ];

        flowerCoords.forEach(([fx, fy]) => {
          // Petals (cross / clover pattern)
          ctx.fillStyle = '#d4ac0d';
          ctx.fillRect(fx - 4, fy - 4, 8, 8);

          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(fx - 5, fy - 2, 10, 4);
          ctx.fillRect(fx - 2, fy - 5, 4, 10);

          ctx.fillStyle = '#f9e79f';
          ctx.fillRect(fx - 2, fy - 2, 4, 4);

          // Orange pollen center
          ctx.fillStyle = '#d35400';
          ctx.fillRect(fx - 1, fy - 1, 2, 2);
        });

        // Loose petals scattered around the edges
        const loosePetals = [
          [12, 40], [18, 52], [16, 30], [128, 36], [124, 50],
          [132, 42], [70, 72], [76, 74], [64, 10], [80, 10]
        ];
        ctx.fillStyle = '#f39c12';
        loosePetals.forEach(([px, py]) => {
          ctx.fillRect(px, py, 3, 2);
          ctx.fillRect(px + 1, py + 1, 2, 2);
        });

        canvas.refresh();
      }
    }

    // 12. Ancient Ruins Archway Door
    if (!scene.textures.exists('prop_arch_door')) {
      const canvas = scene.textures.createCanvas('prop_arch_door', 64, 96);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark portal interior void
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, 20, 44, 76);
        ctx.beginPath();
        ctx.ellipse(32, 24, 22, 16, 0, Math.PI, 0);
        ctx.fill();

        // Left Pillar
        ctx.fillStyle = '#2d1b36';
        ctx.fillRect(0, 16, 12, 80);
        ctx.fillStyle = '#412252';
        ctx.fillRect(2, 18, 8, 76);
        ctx.fillStyle = '#5c2e73';
        ctx.fillRect(2, 20, 3, 72);
        // Pillar Base and Capital
        ctx.fillStyle = '#5c2e73';
        ctx.fillRect(0, 16, 14, 6);
        ctx.fillRect(0, 90, 14, 6);

        // Right Pillar
        ctx.fillStyle = '#2d1b36';
        ctx.fillRect(52, 16, 12, 80);
        ctx.fillStyle = '#412252';
        ctx.fillRect(54, 18, 8, 76);
        ctx.fillStyle = '#5c2e73';
        ctx.fillRect(54, 20, 3, 72);
        // Pillar Base and Capital
        ctx.fillStyle = '#5c2e73';
        ctx.fillRect(50, 16, 14, 6);
        ctx.fillRect(50, 90, 14, 6);

        // Stone Arch Top
        ctx.fillStyle = '#2d1b36';
        ctx.fillRect(4, 0, 56, 18);
        ctx.fillStyle = '#412252';
        ctx.fillRect(6, 2, 52, 14);
        ctx.fillStyle = '#5c2e73';
        ctx.fillRect(8, 4, 48, 6);

        // Center Keystone
        ctx.fillStyle = '#7d3c98';
        ctx.fillRect(28, 0, 8, 12);
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(30, 2, 4, 8);

        // Carved rune symbol on lintel
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(31, 14, 2, 2);

        canvas.refresh();
      }
    }

    // 12b. Autumn Leaf Pile (Undertale Ruins Room 3 - Iconic Crunchy Leaves)
    if (!scene.textures.exists('prop_leaf_pile')) {
      const canvas = scene.textures.createCanvas('prop_leaf_pile', 56, 36);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Ground shadow
        ctx.fillStyle = 'rgba(15, 8, 22, 0.65)';
        ctx.beginPath();
        ctx.ellipse(28, 22, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Base dark russet layer
        ctx.fillStyle = '#6e2114';
        ctx.beginPath();
        ctx.ellipse(28, 20, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Midtone red-orange leaf cluster
        ctx.fillStyle = '#b33927';
        ctx.beginPath();
        ctx.ellipse(28, 18, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Individual crisp autumn leaf shapes & flakes
        const leaves = [
          { x: 14, y: 18, color: '#c0392b', w: 6, h: 4 },
          { x: 22, y: 15, color: '#d35400', w: 7, h: 5 },
          { x: 30, y: 16, color: '#e67e22', w: 6, h: 4 },
          { x: 38, y: 19, color: '#c0392b', w: 7, h: 5 },
          { x: 18, y: 22, color: '#e74c3c', w: 5, h: 4 },
          { x: 26, y: 20, color: '#f39c12', w: 6, h: 4 },
          { x: 34, y: 21, color: '#d35400', w: 6, h: 4 },
          { x: 24, y: 12, color: '#f1c40f', w: 5, h: 3 },
          { x: 31, y: 13, color: '#e67e22', w: 5, h: 3 },
          { x: 10, y: 22, color: '#962d1c', w: 4, h: 3 },
          { x: 44, y: 22, color: '#962d1c', w: 4, h: 3 },
          { x: 20, y: 25, color: '#d35400', w: 5, h: 3 },
          { x: 36, y: 25, color: '#c0392b', w: 5, h: 3 },
        ];

        leaves.forEach((l) => {
          ctx.fillStyle = l.color;
          ctx.fillRect(l.x, l.y, l.w, l.h);
          ctx.fillStyle = '#f9ca24';
          ctx.fillRect(l.x + 1, l.y + 1, 2, 2);
        });

        // Loose scattered flakes around rim
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(6, 22, 3, 2);
        ctx.fillRect(48, 24, 3, 2);
        ctx.fillRect(28, 27, 3, 2);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(12, 14, 2, 2);
        ctx.fillRect(42, 16, 2, 2);

        canvas.refresh();
      }
    }

    // 12c. Ancient Ruins Stone Pillar with Climbing Vines (32x96)
    if (!scene.textures.exists('prop_ruins_pillar')) {
      const canvas = scene.textures.createCanvas('prop_ruins_pillar', 32, 96);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Pillar base
        ctx.fillStyle = '#22142b';
        ctx.fillRect(2, 80, 28, 16);
        ctx.fillStyle = '#442358';
        ctx.fillRect(4, 82, 24, 12);
        ctx.fillStyle = '#643780';
        ctx.fillRect(6, 82, 4, 10);

        // Pillar shaft (fluted vertical stone)
        ctx.fillStyle = '#2d1839';
        ctx.fillRect(6, 16, 20, 64);
        ctx.fillStyle = '#4b2861';
        ctx.fillRect(8, 16, 16, 64);

        // Fluted vertical ridges
        ctx.fillStyle = '#683985';
        ctx.fillRect(9, 16, 2, 64);
        ctx.fillRect(15, 16, 2, 64);
        ctx.fillRect(21, 16, 2, 64);

        // Capital (top crown)
        ctx.fillStyle = '#22142b';
        ctx.fillRect(2, 0, 28, 16);
        ctx.fillStyle = '#442358';
        ctx.fillRect(4, 2, 24, 12);
        ctx.fillStyle = '#643780';
        ctx.fillRect(6, 2, 20, 4);

        // Climbing green ivy vines wrapping around pillar
        ctx.fillStyle = '#144d21';
        ctx.fillRect(4, 74, 14, 3);
        ctx.fillRect(14, 62, 12, 3);
        ctx.fillRect(6, 48, 16, 3);
        ctx.fillRect(12, 34, 14, 3);
        ctx.fillRect(4, 20, 16, 3);

        ctx.fillStyle = '#27ae60';
        ctx.fillRect(6, 72, 4, 4);
        ctx.fillRect(18, 60, 4, 4);
        ctx.fillRect(8, 46, 5, 4);
        ctx.fillRect(20, 32, 5, 4);
        ctx.fillRect(6, 18, 4, 4);

        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(7, 73, 2, 2);
        ctx.fillRect(19, 61, 2, 2);
        ctx.fillRect(9, 47, 2, 2);
        ctx.fillRect(21, 33, 2, 2);

        canvas.refresh();
      }
    }

    // 12d. Grand Tiered Stone Stairs for Ruins Entrance (140x56)
    if (!scene.textures.exists('prop_ruins_stairs')) {
      const canvas = scene.textures.createCanvas('prop_ruins_stairs', 140, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Step 1 (Top - Highest level)
        ctx.fillStyle = '#251533';
        ctx.fillRect(14, 0, 112, 18);
        ctx.fillStyle = '#4f2b69';
        ctx.fillRect(16, 2, 108, 12);
        ctx.fillStyle = '#6f3d91';
        ctx.fillRect(16, 2, 108, 3); // top edge highlight
        // Tile seams on step
        ctx.fillStyle = '#2d183b';
        ctx.fillRect(42, 2, 1, 12);
        ctx.fillRect(70, 2, 1, 12);
        ctx.fillRect(98, 2, 1, 12);

        // Step 2 (Middle level)
        ctx.fillStyle = '#1f102b';
        ctx.fillRect(8, 18, 124, 18);
        ctx.fillStyle = '#46255e';
        ctx.fillRect(10, 20, 120, 12);
        ctx.fillStyle = '#673887';
        ctx.fillRect(10, 20, 120, 3);
        ctx.fillStyle = '#261336';
        ctx.fillRect(40, 20, 1, 12);
        ctx.fillRect(70, 20, 1, 12);
        ctx.fillRect(100, 20, 1, 12);

        // Step 3 (Bottom level)
        ctx.fillStyle = '#190c24';
        ctx.fillRect(2, 36, 136, 20);
        ctx.fillStyle = '#3c1f52';
        ctx.fillRect(4, 38, 132, 14);
        ctx.fillStyle = '#5c317a';
        ctx.fillRect(4, 38, 132, 3);
        ctx.fillStyle = '#210e30';
        ctx.fillRect(38, 38, 1, 14);
        ctx.fillRect(70, 38, 1, 14);
        ctx.fillRect(102, 38, 1, 14);

        // Left stone balustrade / railing
        ctx.fillStyle = '#2c163a';
        ctx.fillRect(0, 4, 12, 52);
        ctx.fillStyle = '#542b70';
        ctx.fillRect(2, 6, 8, 48);
        ctx.fillStyle = '#783e9f';
        ctx.fillRect(2, 4, 10, 4);

        // Right stone balustrade / railing
        ctx.fillStyle = '#2c163a';
        ctx.fillRect(128, 4, 12, 52);
        ctx.fillStyle = '#542b70';
        ctx.fillRect(130, 6, 8, 48);
        ctx.fillStyle = '#783e9f';
        ctx.fillRect(128, 4, 10, 4);

        canvas.refresh();
      }
    }

    // 12e. Delta Rune Carving Relief (72x48)
    if (!scene.textures.exists('prop_delta_rune_carving')) {
      const canvas = scene.textures.createCanvas('prop_delta_rune_carving', 72, 48);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Weathered stone plaque base
        ctx.fillStyle = '#22112e';
        ctx.fillRect(2, 2, 68, 44);
        ctx.fillStyle = '#3a1f4d';
        ctx.fillRect(4, 4, 64, 40);
        ctx.fillStyle = '#582e75';
        ctx.strokeRect(4, 4, 64, 40);

        // Delta Rune Symbol
        // 1. Central Solar Orb with Angel Wings
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(36, 18, 5, 0, Math.PI * 2);
        ctx.fill();

        // Left Wing
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(30, 18);
        ctx.lineTo(16, 11);
        ctx.lineTo(18, 21);
        ctx.lineTo(28, 20);
        ctx.fill();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(42, 18);
        ctx.lineTo(56, 11);
        ctx.lineTo(54, 21);
        ctx.lineTo(44, 20);
        ctx.fill();

        // Golden highlights on winged orb
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(35, 17, 2, 2);
        ctx.fillRect(22, 15, 4, 2);
        ctx.fillRect(46, 15, 4, 2);

        // 2. Three Triangles Below
        // Triangle Left (pointing UP)
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(24, 30);
        ctx.lineTo(20, 38);
        ctx.lineTo(28, 38);
        ctx.fill();

        // Triangle Right (pointing UP)
        ctx.beginPath();
        ctx.moveTo(48, 30);
        ctx.lineTo(44, 38);
        ctx.lineTo(52, 38);
        ctx.fill();

        // Triangle Middle (pointing DOWN)
        ctx.beginPath();
        ctx.moveTo(32, 30);
        ctx.lineTo(40, 30);
        ctx.lineTo(36, 38);
        ctx.fill();

        // Golden rune accents inside triangles
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(23, 34, 2, 2);
        ctx.fillRect(47, 34, 2, 2);
        ctx.fillRect(35, 32, 2, 2);

        canvas.refresh();
      }
    }

    // 12f. Hanging Ivy Vines (32x48)
    if (!scene.textures.exists('prop_hanging_vines')) {
      const canvas = scene.textures.createCanvas('prop_hanging_vines', 32, 48);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Main vine tendrils
        ctx.fillStyle = '#144d21';
        ctx.fillRect(6, 0, 3, 36);
        ctx.fillRect(16, 0, 3, 44);
        ctx.fillRect(24, 0, 3, 28);

        // Leaf clusters
        ctx.fillStyle = '#27ae60';
        const clusters = [
          { x: 3, y: 6 }, { x: 8, y: 14 }, { x: 3, y: 22 }, { x: 7, y: 32 },
          { x: 13, y: 8 }, { x: 18, y: 16 }, { x: 12, y: 26 }, { x: 17, y: 36 }, { x: 14, y: 42 },
          { x: 21, y: 6 }, { x: 26, y: 14 }, { x: 22, y: 22 }, { x: 25, y: 27 },
        ];
        clusters.forEach((c) => {
          ctx.fillStyle = '#27ae60';
          ctx.fillRect(c.x, c.y, 5, 4);
          ctx.fillStyle = '#2ecc71';
          ctx.fillRect(c.x + 1, c.y + 1, 2, 2);
        });

        canvas.refresh();
      }
    }

    // 12g. Falling Autumn Leaf Particle (8x8)
    if (!scene.textures.exists('particle_leaf')) {
      const canvas = scene.textures.createCanvas('particle_leaf', 8, 8);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(2, 1, 4, 5);
        ctx.fillRect(1, 2, 6, 3);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(3, 2, 2, 3);
        canvas.refresh();
      }
    }

    // 13. Training Dummy (Undertale Room 5)
    if (!scene.textures.exists('prop_dummy')) {
      const canvas = scene.textures.createCanvas('prop_dummy', 32, 48);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Wooden base stand
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(6, 42, 20, 4);
        ctx.fillStyle = '#7a4b21';
        ctx.fillRect(14, 30, 4, 14); // wooden post

        // Stuffed cloth body sack
        ctx.fillStyle = '#d7b899';
        ctx.fillRect(8, 18, 16, 16);
        ctx.fillStyle = '#c49c74';
        ctx.fillRect(10, 20, 12, 12);
        // Stitched cross patch on body
        ctx.fillStyle = '#8b6540';
        ctx.fillRect(18, 22, 4, 1);
        ctx.fillRect(19, 21, 2, 3);

        // Dummy head
        ctx.fillStyle = '#e6ceb5';
        ctx.fillRect(9, 6, 14, 13);
        ctx.fillRect(11, 4, 10, 2);
        ctx.fillStyle = '#d7b899';
        ctx.fillRect(10, 7, 12, 11);

        // Stitched button eyes (+)
        ctx.fillStyle = '#2c1e11';
        // Left eye
        ctx.fillRect(11, 10, 3, 1);
        ctx.fillRect(12, 9, 1, 3);
        // Right eye
        ctx.fillRect(18, 10, 3, 1);
        ctx.fillRect(19, 9, 1, 3);

        // Stitched mouth
        ctx.fillRect(13, 15, 6, 1);
        ctx.fillRect(14, 14, 1, 2);
        ctx.fillRect(17, 14, 1, 2);

        // Cotton stuffing tuft on top
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 2, 4, 2);
        ctx.fillRect(15, 1, 2, 2);

        canvas.refresh();
      }
    }

    // 14b. Defeated / Knocked-over Dummy (Undertale Ruins Room 5)
    if (!scene.textures.exists('prop_dummy_defeated')) {
      const canvas = scene.textures.createCanvas('prop_dummy_defeated', 40, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Fallen wooden base and broken stand pole on the ground
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(4, 24, 18, 4);
        ctx.fillStyle = '#7a4b21';
        ctx.fillRect(16, 22, 14, 3); // tilted wooden pole

        // Deflated cotton sack tipped sideways
        ctx.fillStyle = '#d7b899';
        ctx.fillRect(18, 16, 18, 10);
        ctx.fillStyle = '#c49c74';
        ctx.fillRect(20, 18, 14, 7);

        // Loose stitches on fallen head
        ctx.fillStyle = '#2c1e11';
        ctx.fillRect(24, 19, 2, 1);
        ctx.fillRect(29, 20, 2, 1);
        ctx.fillRect(25, 23, 4, 1);

        // Spilled white cotton puffs on stone floor
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 20, 5, 4);
        ctx.fillRect(12, 18, 4, 3);
        ctx.fillRect(34, 14, 5, 4);
        ctx.fillRect(36, 12, 3, 3);
        ctx.fillRect(2, 26, 3, 2);

        canvas.refresh();
      }
    }

    // 15. Toriel's Home Cottage Exterior (220x160)
    if (!scene.textures.exists('prop_toriel_house')) {
      const canvas = scene.textures.createCanvas('prop_toriel_house', 220, 160);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // 1. Stone Chimney
        ctx.fillStyle = '#4a2525';
        ctx.fillRect(150, 6, 26, 44);
        ctx.fillStyle = '#6b3636';
        ctx.fillRect(152, 8, 22, 40);
        ctx.fillStyle = '#8c4848';
        ctx.fillRect(148, 4, 30, 6);

        // Gentle chimney smoke puffs
        ctx.fillStyle = 'rgba(236, 240, 241, 0.45)';
        ctx.beginPath();
        ctx.arc(163, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // 2. Main Cottage Stone Body
        ctx.fillStyle = '#dcd4c8';
        ctx.fillRect(30, 58, 160, 96);
        ctx.fillStyle = '#eee7dc';
        ctx.fillRect(34, 62, 152, 90);

        // Stone brick pattern lines
        ctx.fillStyle = '#c5bbae';
        for (let y = 72; y < 150; y += 14) {
          ctx.fillRect(34, y, 152, 1);
        }
        for (let y = 65; y < 145; y += 14) {
          const offset = ((y - 65) / 14) % 2 === 0 ? 0 : 14;
          for (let x = 40 + offset; x < 180; x += 28) {
            ctx.fillRect(x, y, 1, 7);
          }
        }

        // 3. Cozy Pitched Red Roof
        ctx.fillStyle = '#4a1515';
        ctx.beginPath();
        ctx.moveTo(110, 8);
        ctx.lineTo(12, 64);
        ctx.lineTo(208, 64);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#782323';
        ctx.beginPath();
        ctx.moveTo(110, 12);
        ctx.lineTo(18, 60);
        ctx.lineTo(202, 60);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#9e3030';
        ctx.beginPath();
        ctx.moveTo(110, 16);
        ctx.lineTo(26, 56);
        ctx.lineTo(194, 56);
        ctx.closePath();
        ctx.fill();

        // Roof shingles texture
        ctx.fillStyle = '#5c1919';
        for (let ry = 26; ry < 58; ry += 8) {
          const w = (ry - 12) * 3;
          ctx.fillRect(110 - w / 2, ry, w, 2);
        }

        // Roof overhang trim
        ctx.fillStyle = '#380f0f';
        ctx.fillRect(10, 60, 200, 5);

        // 4. Arched Wooden Front Door
        ctx.fillStyle = '#261309';
        ctx.fillRect(92, 94, 36, 62);
        ctx.fillStyle = '#542c15';
        ctx.fillRect(95, 97, 30, 58);
        // Wood grain
        ctx.fillStyle = '#3e1f0e';
        ctx.fillRect(104, 98, 2, 56);
        ctx.fillRect(114, 98, 2, 56);
        // Brass doorknob
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(99, 126, 3, 3);
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(99, 129, 3, 1);

        // 5. Warm Glowing Windows with amber curtains
        const drawWindow = (wx: number, wy: number) => {
          ctx.fillStyle = '#261309';
          ctx.fillRect(wx - 2, wy - 2, 28, 28);
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(wx, wy, 24, 24);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(wx + 2, wy + 2, 20, 20);
          // Window crossframe
          ctx.fillStyle = '#542c15';
          ctx.fillRect(wx + 10, wy, 4, 24);
          ctx.fillRect(wx, wy + 10, 24, 4);
          // Glass shine
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(wx + 3, wy + 3, 6, 6);
        };
        drawWindow(48, 98);
        drawWindow(148, 98);

        // Small round window under gable
        ctx.fillStyle = '#261309';
        ctx.beginPath();
        ctx.arc(110, 38, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(110, 38, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#542c15';
        ctx.fillRect(109, 29, 2, 18);
        ctx.fillRect(101, 37, 18, 2);

        // 6. Porch entrance step
        ctx.fillStyle = '#9b9183';
        ctx.fillRect(86, 154, 48, 6);
        ctx.fillStyle = '#b7ada0';
        ctx.fillRect(88, 154, 44, 2);

        canvas.refresh();
      }
    }

    // 16. The Iconic Bare Black Tree of Home Exterior (160x180)
    if (!scene.textures.exists('prop_bare_tree')) {
      const canvas = scene.textures.createCanvas('prop_bare_tree', 160, 180);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Trunk base & roots
        ctx.fillStyle = '#120b18';
        ctx.fillRect(66, 100, 28, 70);
        ctx.fillRect(52, 152, 22, 20); // Left root
        ctx.fillRect(40, 164, 20, 12);
        ctx.fillRect(88, 152, 24, 20); // Right root
        ctx.fillRect(104, 164, 22, 12);

        // Bark shading
        ctx.fillStyle = '#20132c';
        ctx.fillRect(68, 102, 24, 66);
        ctx.fillStyle = '#331d45';
        ctx.fillRect(72, 104, 8, 60);

        // Massive gnarled branches stretching left, up, right
        // Left main branch
        ctx.fillStyle = '#120b18';
        ctx.beginPath();
        ctx.moveTo(70, 106);
        ctx.lineTo(24, 60);
        ctx.lineTo(20, 44);
        ctx.lineTo(32, 54);
        ctx.lineTo(60, 88);
        ctx.closePath();
        ctx.fill();

        // Far-left high twigs
        ctx.beginPath();
        ctx.moveTo(24, 60);
        ctx.lineTo(8, 38);
        ctx.lineTo(14, 34);
        ctx.lineTo(26, 52);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(28, 50);
        ctx.lineTo(38, 24);
        ctx.lineTo(44, 28);
        ctx.lineTo(34, 52);
        ctx.closePath();
        ctx.fill();

        // Center upright branch
        ctx.beginPath();
        ctx.moveTo(74, 100);
        ctx.lineTo(76, 32);
        ctx.lineTo(70, 14);
        ctx.lineTo(76, 14);
        ctx.lineTo(84, 36);
        ctx.lineTo(86, 100);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(80, 50);
        ctx.lineTo(96, 22);
        ctx.lineTo(102, 26);
        ctx.lineTo(84, 60);
        ctx.closePath();
        ctx.fill();

        // Right main branch
        ctx.beginPath();
        ctx.moveTo(88, 104);
        ctx.lineTo(132, 66);
        ctx.lineTo(146, 48);
        ctx.lineTo(140, 42);
        ctx.lineTo(124, 58);
        ctx.lineTo(84, 92);
        ctx.closePath();
        ctx.fill();

        // Far-right twigs
        ctx.beginPath();
        ctx.moveTo(132, 66);
        ctx.lineTo(154, 54);
        ctx.lineTo(156, 60);
        ctx.lineTo(134, 72);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(126, 60);
        ctx.lineTo(128, 28);
        ctx.lineTo(134, 30);
        ctx.lineTo(130, 56);
        ctx.closePath();
        ctx.fill();

        canvas.refresh();
      }
    }

    // 17. Autumn Leaves Ground Carpet (160x70)
    if (!scene.textures.exists('prop_autumn_carpet')) {
      const canvas = scene.textures.createCanvas('prop_autumn_carpet', 160, 70);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Base bed
        ctx.fillStyle = '#6e1f18';
        ctx.beginPath();
        ctx.ellipse(80, 35, 75, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#962d22';
        ctx.beginPath();
        ctx.ellipse(80, 35, 68, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rich scattered red, orange, and golden leaf specks
        const leafFlakes = [
          { x: 30, y: 30, c: '#c0392b' }, { x: 50, y: 22, c: '#d35400' }, { x: 70, y: 18, c: '#e67e22' },
          { x: 90, y: 20, c: '#f39c12' }, { x: 110, y: 26, c: '#c0392b' }, { x: 130, y: 34, c: '#d35400' },
          { x: 40, y: 44, c: '#e74c3c' }, { x: 60, y: 48, c: '#f39c12' }, { x: 80, y: 46, c: '#d35400' },
          { x: 100, y: 45, c: '#c0392b' }, { x: 120, y: 42, c: '#f1c40f' }, { x: 80, y: 32, c: '#e67e22' },
          { x: 65, y: 36, c: '#f39c12' }, { x: 95, y: 34, c: '#c0392b' }, { x: 55, y: 32, c: '#d35400' },
          { x: 105, y: 36, c: '#e67e22' }, { x: 22, y: 38, c: '#c0392b' }, { x: 138, y: 36, c: '#d35400' },
        ];
        leafFlakes.forEach((lf) => {
          ctx.fillStyle = lf.c;
          ctx.fillRect(lf.x, lf.y, 5, 4);
          ctx.fillStyle = '#f9ca24';
          ctx.fillRect(lf.x + 1, lf.y + 1, 2, 2);
        });

        canvas.refresh();
      }
    }

    // 18. Toriel's Fireplace (56x56)
    if (!scene.textures.exists('prop_fireplace')) {
      const canvas = scene.textures.createCanvas('prop_fireplace', 56, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Brick mantle outline & structure
        ctx.fillStyle = '#4a2511';
        ctx.fillRect(4, 8, 48, 48);

        // Brick body
        ctx.fillStyle = '#7a3b1e';
        ctx.fillRect(6, 10, 44, 46);

        // Mantle top shelf
        ctx.fillStyle = '#9b4f2c';
        ctx.fillRect(2, 6, 52, 6);
        ctx.fillStyle = '#ba6838';
        ctx.fillRect(4, 6, 48, 2);

        // Fireplace hearth cavity (black/dark charcoal)
        ctx.fillStyle = '#1c0f0a';
        ctx.fillRect(14, 22, 28, 34);

        // Brick lines pattern
        ctx.fillStyle = '#5c2d16';
        ctx.fillRect(6, 16, 44, 1);
        ctx.fillRect(6, 26, 8, 1);
        ctx.fillRect(42, 26, 8, 1);
        ctx.fillRect(6, 36, 8, 1);
        ctx.fillRect(42, 36, 8, 1);
        ctx.fillRect(6, 46, 8, 1);
        ctx.fillRect(42, 46, 8, 1);

        // Iron grate
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(16, 46, 24, 4);
        ctx.fillRect(18, 42, 3, 8);
        ctx.fillRect(26, 42, 4, 8);
        ctx.fillRect(35, 42, 3, 8);

        // Fiery coals & base glow
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(18, 45, 20, 4);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(20, 43, 16, 4);

        // Dancing golden flame
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(22, 36, 12, 10);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(24, 33, 8, 10);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(26, 30, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(27, 34, 2, 4);

        canvas.refresh();
      }
    }

    // 19. Toriel's Reading Armchair & Snail Book (48x48)
    if (!scene.textures.exists('prop_toriel_chair')) {
      const canvas = scene.textures.createCanvas('prop_toriel_chair', 48, 48);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark wooden frame & legs
        ctx.fillStyle = '#3a1f11';
        ctx.fillRect(4, 40, 5, 6);
        ctx.fillRect(31, 40, 5, 6);

        // Deep crimson velvet armchair backrest
        ctx.fillStyle = '#5c1018';
        ctx.fillRect(2, 6, 36, 24);
        ctx.fillStyle = '#941c27';
        ctx.fillRect(4, 8, 32, 20);
        ctx.fillStyle = '#ba2837';
        ctx.fillRect(6, 10, 28, 16);

        // Armrests
        ctx.fillStyle = '#6d131c';
        ctx.fillRect(0, 18, 7, 20);
        ctx.fillRect(33, 18, 7, 20);
        ctx.fillStyle = '#a62432';
        ctx.fillRect(1, 19, 5, 18);
        ctx.fillRect(34, 19, 5, 18);

        // Plush seat cushion
        ctx.fillStyle = '#801822';
        ctx.fillRect(6, 24, 28, 16);
        ctx.fillStyle = '#b32736';
        ctx.fillRect(8, 26, 24, 12);

        // Small wooden side-table with Snail Book
        ctx.fillStyle = '#4a2815';
        ctx.fillRect(38, 24, 10, 18);
        ctx.fillStyle = '#6b3d22';
        ctx.fillRect(37, 23, 11, 4);

        // Snail Facts Book (Golden-yellow cover with blue snail swirl)
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(38, 19, 8, 5);
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(41, 20, 3, 3);

        canvas.refresh();
      }
    }

    // 20. Dining Table with Vase (64x48)
    if (!scene.textures.exists('prop_dining_table')) {
      const canvas = scene.textures.createCanvas('prop_dining_table', 64, 48);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark wooden table legs
        ctx.fillStyle = '#2d180d';
        ctx.fillRect(8, 34, 6, 12);
        ctx.fillRect(50, 34, 6, 12);

        // Circular/oval polished wooden table top
        ctx.fillStyle = '#422414';
        ctx.beginPath();
        ctx.ellipse(32, 24, 30, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6e3c23';
        ctx.beginPath();
        ctx.ellipse(32, 23, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // White/cream lace table runner
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.ellipse(32, 23, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glass vase
        ctx.fillStyle = '#74b9ff';
        ctx.fillRect(29, 14, 6, 8);
        ctx.fillStyle = '#0984e3';
        ctx.fillRect(30, 16, 4, 5);

        // Golden yellow flower
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(28, 7, 8, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(30, 9, 4, 3);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(31, 14, 2, 4);

        canvas.refresh();
      }
    }

    // 21. Kitchen Counter & Butterscotch-Cinnamon Pie (56x40)
    if (!scene.textures.exists('prop_kitchen_counter')) {
      const canvas = scene.textures.createCanvas('prop_kitchen_counter', 56, 40);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Counter cabinet base (dark oak)
        ctx.fillStyle = '#3a1f11';
        ctx.fillRect(2, 12, 52, 28);
        ctx.fillStyle = '#5a341e';
        ctx.fillRect(4, 14, 48, 24);

        // Cabinet doors
        ctx.fillStyle = '#422414';
        ctx.fillRect(6, 17, 20, 18);
        ctx.fillRect(30, 17, 20, 18);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(23, 24, 2, 4);
        ctx.fillRect(31, 24, 2, 4);

        // Counter top slab (polished marble / ceramic)
        ctx.fillStyle = '#dfe6e9';
        ctx.fillRect(0, 8, 56, 6);
        ctx.fillStyle = '#b2bec3';
        ctx.fillRect(0, 13, 56, 2);

        // Baking pan with fresh Butterscotch-Cinnamon Pie
        ctx.fillStyle = '#636e72';
        ctx.beginPath();
        ctx.ellipse(28, 8, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden pie crust
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.ellipse(28, 7, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.ellipse(28, 6, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cinnamon dusting / lattice
        ctx.fillStyle = '#d35400';
        ctx.fillRect(26, 5, 4, 3);

        // Rising steam wisps
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 0, 2, 3);
        ctx.fillRect(29, 2, 2, 3);

        canvas.refresh();
      }
    }

    // 22. Toriel's Bookshelf (48x64)
    if (!scene.textures.exists('prop_bookshelf')) {
      const canvas = scene.textures.createCanvas('prop_bookshelf', 48, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark wood outer frame
        ctx.fillStyle = '#2c150a';
        ctx.fillRect(0, 0, 48, 64);
        ctx.fillStyle = '#4a2512';
        ctx.fillRect(3, 3, 42, 58);

        // Shelves
        ctx.fillStyle = '#68351c';
        ctx.fillRect(3, 18, 42, 4);
        ctx.fillRect(3, 36, 42, 4);
        ctx.fillRect(3, 54, 42, 4);

        // Books on top shelf
        const b1 = ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#d35400', '#16a085'];
        let bx = 5;
        b1.forEach((color) => {
          ctx.fillStyle = color;
          ctx.fillRect(bx, 5, 5, 13);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(bx, 7, 5, 1);
          bx += 6;
        });

        // Books on middle shelf
        const b2 = ['#34495e', '#e74c3c', '#1abc9c', '#f1c40f', '#9b59b6', '#e67e22'];
        bx = 5;
        b2.forEach((color) => {
          ctx.fillStyle = color;
          ctx.fillRect(bx, 23, 6, 13);
          ctx.fillStyle = '#ecf0f1';
          ctx.fillRect(bx + 1, 25, 4, 1);
          bx += 7;
        });

        // Books on bottom shelf
        const b3 = ['#8e44ad', '#2c3e50', '#27ae60', '#d35400', '#2980b9'];
        bx = 6;
        b3.forEach((color) => {
          ctx.fillStyle = color;
          ctx.fillRect(bx, 41, 7, 13);
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(bx + 1, 43, 5, 2);
          bx += 8;
        });

        canvas.refresh();
      }
    }

    // 23. Potted Fern / Cozy Houseplant (28x36)
    if (!scene.textures.exists('prop_cozy_plant')) {
      const canvas = scene.textures.createCanvas('prop_cozy_plant', 28, 36);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Terracotta flowerpot
        ctx.fillStyle = '#a04825';
        ctx.fillRect(6, 20, 16, 15);
        ctx.fillStyle = '#bf5b30';
        ctx.fillRect(4, 18, 20, 4);

        // Soil
        ctx.fillStyle = '#3d1d11';
        ctx.fillRect(6, 18, 16, 2);

        // Lush green fern leaves
        ctx.fillStyle = '#1e7e34';
        ctx.beginPath();
        ctx.arc(14, 12, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#28a745';
        ctx.fillRect(10, 6, 8, 10);
        ctx.fillRect(4, 10, 7, 6);
        ctx.fillRect(17, 10, 7, 6);
        ctx.fillStyle = '#55efc4';
        ctx.fillRect(12, 4, 4, 5);

        canvas.refresh();
      }
    }

    // 24. Cozy Living Room Rug (120x60)
    if (!scene.textures.exists('prop_cozy_rug')) {
      const canvas = scene.textures.createCanvas('prop_cozy_rug', 120, 60);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Deep burgundy outer oval
        ctx.fillStyle = '#4a111a';
        ctx.beginPath();
        ctx.ellipse(60, 30, 58, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gold ornamental border ring
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.ellipse(60, 30, 52, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm crimson inner carpet
        ctx.fillStyle = '#7a1924';
        ctx.beginPath();
        ctx.ellipse(60, 30, 46, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Center medallion
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.ellipse(60, 30, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#941c28';
        ctx.beginPath();
        ctx.ellipse(60, 30, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        canvas.refresh();
      }
    }

    // 25. Encounter Intro Static '!' Exclamation Mark (16x28)
    if (!scene.textures.exists('ui_encounter_exclamation')) {
      const canvas = scene.textures.createCanvas('ui_encounter_exclamation', 16, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Black outer outline for upper bar
        ctx.fillStyle = '#000000';
        ctx.fillRect(4, 1, 8, 17);
        // Black outer outline for bottom dot
        ctx.fillRect(4, 20, 8, 7);

        // Bright red upper bar
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(5, 2, 6, 15);

        // Highlight sheen on upper bar
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(5, 3, 2, 13);

        // Bright red dot
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(5, 21, 6, 5);

        // Highlight sheen on dot
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(5, 21, 2, 2);

        canvas.refresh();
      }
    }

    // 26. Hallway Bedroom Door (40x58)
    if (!scene.textures.exists('prop_hallway_door')) {
      const canvas = scene.textures.createCanvas('prop_hallway_door', 40, 58);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Outer dark wood door frame
        ctx.fillStyle = '#200f07';
        ctx.fillRect(0, 0, 40, 58);

        // Door arch / lintel trim
        ctx.fillStyle = '#42200f';
        ctx.fillRect(2, 2, 36, 56);
        ctx.fillStyle = '#5c2d15';
        ctx.fillRect(4, 4, 32, 54);

        // Inset wood panels
        ctx.fillStyle = '#3a1b0b';
        ctx.fillRect(7, 8, 26, 20); // Top panel
        ctx.fillRect(7, 32, 26, 22); // Bottom panel
        ctx.fillStyle = '#4e250f';
        ctx.fillRect(8, 9, 24, 18);
        ctx.fillRect(8, 33, 24, 20);

        // Brass doorknob with keyhole
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(30, 31, 3, 4);
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(30, 35, 3, 1);
        ctx.fillStyle = '#1e0c05';
        ctx.fillRect(31, 36, 1, 2);

        canvas.refresh();
      }
    }

    // 27. Basement Descending Staircase (56x56)
    if (!scene.textures.exists('prop_basement_stairs')) {
      const canvas = scene.textures.createCanvas('prop_basement_stairs', 56, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Dark stairwell opening (pitch black below)
        ctx.fillStyle = '#0a050d';
        ctx.fillRect(0, 0, 56, 56);

        // Stone steps descending down & left into the shadows
        const steps = [
          { y: 6, h: 8, c1: '#4a3b58', c2: '#2a1e35' },
          { y: 14, h: 8, c1: '#3e304b', c2: '#21162b' },
          { y: 22, h: 8, c1: '#33263e', c2: '#1a1023' },
          { y: 30, h: 8, c1: '#281d32', c2: '#130b1b' },
          { y: 38, h: 8, c1: '#1d1425', c2: '#0e0714' },
          { y: 46, h: 10, c1: '#140c1a', c2: '#08030c' },
        ];
        steps.forEach((st) => {
          ctx.fillStyle = st.c1;
          ctx.fillRect(2, st.y, 44, 3);
          ctx.fillStyle = st.c2;
          ctx.fillRect(2, st.y + 3, 44, st.h - 3);
        });

        // Wooden banister & railing on the right
        ctx.fillStyle = '#261207';
        ctx.fillRect(46, 0, 8, 56);
        ctx.fillStyle = '#542c13';
        ctx.fillRect(48, 2, 4, 52);
        // Railing posts
        ctx.fillStyle = '#783f1d';
        ctx.fillRect(47, 4, 6, 6);
        ctx.fillRect(47, 26, 6, 6);
        ctx.fillRect(47, 48, 6, 6);

        canvas.refresh();
      }
    }

    // 28. Basement Ascending Staircase (56x56)
    if (!scene.textures.exists('prop_stairs_up')) {
      const canvas = scene.textures.createCanvas('prop_stairs_up', 56, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Purple stone walls around stairwell
        ctx.fillStyle = '#241330';
        ctx.fillRect(0, 0, 56, 56);

        // Ascending steps leading upwards
        const steps = [
          { y: 42, h: 12, c1: '#362446', c2: '#23152f' },
          { y: 32, h: 10, c1: '#432e57', c2: '#2c1c3c' },
          { y: 22, h: 10, c1: '#543b6d', c2: '#39244d' },
          { y: 12, h: 10, c1: '#6b4c8a', c2: '#4a2f64' },
          { y: 2, h: 10, c1: '#8460aa', c2: '#5f3c80' },
        ];
        steps.forEach((st) => {
          ctx.fillStyle = st.c1;
          ctx.fillRect(4, st.y, 42, 3);
          ctx.fillStyle = st.c2;
          ctx.fillRect(4, st.y + 3, 42, st.h - 3);
        });

        // Warm light spill from Toriel's house at the top opening
        ctx.fillStyle = 'rgba(255, 215, 120, 0.45)';
        ctx.fillRect(4, 0, 42, 6);

        // Handrail on the left
        ctx.fillStyle = '#1c0c05';
        ctx.fillRect(46, 0, 8, 56);
        ctx.fillStyle = '#4c260f';
        ctx.fillRect(48, 2, 4, 52);

        canvas.refresh();
      }
    }

    // 29. Player's Bedroom Bed (52x64)
    if (!scene.textures.exists('prop_player_bed')) {
      const canvas = scene.textures.createCanvas('prop_player_bed', 52, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Headboard (dark warm oak)
        ctx.fillStyle = '#241108';
        ctx.fillRect(2, 0, 48, 14);
        ctx.fillStyle = '#4d2612';
        ctx.fillRect(4, 2, 44, 10);
        ctx.fillStyle = '#6e371a';
        ctx.fillRect(6, 4, 40, 4);

        // Mattress base
        ctx.fillStyle = '#1d0e06';
        ctx.fillRect(4, 14, 44, 48);

        // Fluffy white pillow
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(10, 10, 32, 14);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(12, 11, 28, 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 12, 24, 7);

        // Blue & Purple striped duvet (Frisk's iconic colors!)
        ctx.fillStyle = '#2980b9'; // Blue base
        ctx.fillRect(6, 24, 40, 38);

        // Purple stripes
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(6, 29, 40, 6);
        ctx.fillRect(6, 42, 40, 6);

        // Blanket folded top edge
        ctx.fillStyle = '#3498db';
        ctx.fillRect(6, 22, 40, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 22, 36, 1);

        // Footboard
        ctx.fillStyle = '#241108';
        ctx.fillRect(2, 58, 48, 6);
        ctx.fillStyle = '#4d2612';
        ctx.fillRect(4, 59, 44, 4);

        canvas.refresh();
      }
    }

    // 30. Flower Bedside Lamp (28x38)
    if (!scene.textures.exists('prop_flower_lamp')) {
      const canvas = scene.textures.createCanvas('prop_flower_lamp', 28, 38);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Wooden nightstand table base
        ctx.fillStyle = '#220e06';
        ctx.fillRect(2, 22, 24, 16);
        ctx.fillStyle = '#492310';
        ctx.fillRect(4, 23, 20, 14);
        ctx.fillStyle = '#683318';
        ctx.fillRect(2, 21, 24, 3);
        // Table drawer pull
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(13, 28, 2, 2);

        // Stem / Lamp post
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(13, 13, 2, 9);
        // Small green leaf
        ctx.fillRect(15, 16, 3, 2);

        // Golden Flower Lampshade
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(8, 4, 12, 10);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(6, 6, 16, 6);
        ctx.fillRect(10, 2, 8, 14);

        // Bright glowing bulb center
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 6, 6, 5);
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(12, 7, 4, 3);

        canvas.refresh();
      }
    }

    // 31. Child's Toy Box (40x28)
    if (!scene.textures.exists('prop_toy_box')) {
      const canvas = scene.textures.createCanvas('prop_toy_box', 40, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Wooden chest body
        ctx.fillStyle = '#261309';
        ctx.fillRect(2, 8, 36, 20);
        ctx.fillStyle = '#633519';
        ctx.fillRect(4, 9, 32, 18);

        // Iron corner brackets
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(2, 8, 4, 20);
        ctx.fillRect(34, 8, 4, 20);
        ctx.fillRect(18, 12, 4, 6); // Latch

        // Toys peeking out of open lid
        // Turquoise block
        ctx.fillStyle = '#1abc9c';
        ctx.fillRect(6, 3, 8, 7);
        ctx.fillStyle = '#16a085';
        ctx.fillRect(7, 4, 6, 5);

        // Red ribbon
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(16, 2, 6, 8);
        ctx.fillRect(20, 7, 4, 4);

        // Yellow block
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(24, 4, 7, 7);

        // Plush rabbit ear
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(31, 1, 4, 9);
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(32, 3, 2, 6);

        canvas.refresh();
      }
    }

    // 32. Wooden Dresser (44x50)
    if (!scene.textures.exists('prop_dresser')) {
      const canvas = scene.textures.createCanvas('prop_dresser', 44, 50);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Main cabinet frame
        ctx.fillStyle = '#1e0d05';
        ctx.fillRect(0, 8, 44, 42);
        ctx.fillStyle = '#47220e';
        ctx.fillRect(2, 9, 40, 40);

        // Top runner cloth
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(4, 6, 36, 4);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(6, 6, 32, 2);

        // Picture frame on top
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(8, 0, 10, 8);
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(10, 2, 6, 4);

        // 3 Pull-out drawers
        const drawDrawer = (dy: number) => {
          ctx.fillStyle = '#311709';
          ctx.fillRect(4, dy, 36, 10);
          ctx.fillStyle = '#572b12';
          ctx.fillRect(5, dy + 1, 34, 8);
          // Brass handles
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(12, dy + 4, 4, 2);
          ctx.fillRect(28, dy + 4, 4, 2);
        };
        drawDrawer(12);
        drawDrawer(24);
        drawDrawer(36);

        canvas.refresh();
      }
    }

    // 33. Toriel's Queen Bed (68x68)
    if (!scene.textures.exists('prop_toriel_bed')) {
      const canvas = scene.textures.createCanvas('prop_toriel_bed', 68, 68);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Tall arched wooden headboard with carved horn motif
        ctx.fillStyle = '#220e06';
        ctx.fillRect(2, 0, 64, 18);
        ctx.fillStyle = '#4c2410';
        ctx.fillRect(4, 2, 60, 14);
        ctx.fillStyle = '#6f3718';
        ctx.fillRect(6, 4, 56, 6);

        // Carved horn peaks on headboard
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(12, 1, 4, 4);
        ctx.fillRect(52, 1, 4, 4);
        ctx.fillRect(32, 2, 4, 4);

        // Bed frame base
        ctx.fillStyle = '#1c0c05';
        ctx.fillRect(4, 18, 60, 48);

        // Two large fluffy white pillows
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(8, 14, 24, 14);
        ctx.fillRect(36, 14, 24, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 15, 20, 11);
        ctx.fillRect(38, 15, 20, 11);

        // Royal purple quilted duvet
        ctx.fillStyle = '#4e287a';
        ctx.fillRect(6, 26, 56, 40);
        ctx.fillStyle = '#6c3cb4';
        ctx.fillRect(8, 28, 52, 36);

        // Quilted crosshatch pattern
        ctx.fillStyle = '#5a3099';
        for (let qy = 32; qy < 62; qy += 8) {
          ctx.fillRect(8, qy, 52, 1);
        }
        for (let qx = 16; qx < 56; qx += 10) {
          ctx.fillRect(qx, 28, 1, 36);
        }

        // White lace trim at top of duvet
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 27, 52, 2);

        // Footboard
        ctx.fillStyle = '#220e06';
        ctx.fillRect(2, 62, 64, 6);
        ctx.fillStyle = '#4c2410';
        ctx.fillRect(4, 63, 60, 4);

        canvas.refresh();
      }
    }

    // 34. Toriel's Joke Diary on Stand (32x36)
    if (!scene.textures.exists('prop_toriel_diary')) {
      const canvas = scene.textures.createCanvas('prop_toriel_diary', 32, 36);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Wooden stand table
        ctx.fillStyle = '#220e06';
        ctx.fillRect(2, 18, 28, 18);
        ctx.fillStyle = '#4d2411';
        ctx.fillRect(4, 20, 24, 15);
        ctx.fillStyle = '#683318';
        ctx.fillRect(2, 17, 28, 3);

        // Open Joke Journal (red leather cover, ivory pages)
        ctx.fillStyle = '#962d22';
        ctx.fillRect(4, 7, 24, 12);
        // Pages
        ctx.fillStyle = '#fcf3cf';
        ctx.fillRect(6, 6, 10, 11);
        ctx.fillRect(16, 6, 10, 11);
        // Binding seam
        ctx.fillStyle = '#78281f';
        ctx.fillRect(15, 6, 2, 11);

        // Scribbled joke text lines & funny doodles
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(7, 8, 7, 1);
        ctx.fillRect(7, 10, 8, 1);
        ctx.fillRect(7, 12, 6, 1);
        ctx.fillRect(17, 8, 7, 1);
        ctx.fillRect(17, 10, 5, 1);
        // Snail doodle
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(19, 12, 4, 3);

        canvas.refresh();
      }
    }

    // 35. Toriel's Clothes Wardrobe (50x70)
    if (!scene.textures.exists('prop_toriel_wardrobe')) {
      const canvas = scene.textures.createCanvas('prop_toriel_wardrobe', 50, 70);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Main wardrobe body
        ctx.fillStyle = '#1c0c05';
        ctx.fillRect(0, 0, 50, 70);
        ctx.fillStyle = '#3e1c0c';
        ctx.fillRect(2, 2, 46, 66);

        // Top decorative pediment
        ctx.fillStyle = '#5c2b14';
        ctx.fillRect(0, 0, 50, 8);
        ctx.fillStyle = '#f1c40f'; // carved crest
        ctx.fillRect(23, 2, 4, 4);

        // Double panel doors
        ctx.fillStyle = '#291207';
        ctx.fillRect(4, 10, 20, 54);
        ctx.fillRect(26, 10, 20, 54);

        ctx.fillStyle = '#4c230e';
        ctx.fillRect(6, 12, 16, 24); // Left upper panel
        ctx.fillRect(6, 38, 16, 24); // Left lower panel
        ctx.fillRect(28, 12, 16, 24); // Right upper panel
        ctx.fillRect(28, 38, 16, 24); // Right lower panel

        // Brass handles
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(22, 34, 2, 6);
        ctx.fillRect(26, 34, 2, 6);

        canvas.refresh();
      }
    }

    // 36. Monumental Ruins Exit Gate (96x96)
    if (!scene.textures.exists('prop_basement_gate')) {
      const canvas = scene.textures.createCanvas('prop_basement_gate', 96, 96);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Ancient stone frame / portal
        ctx.fillStyle = '#170b20';
        ctx.fillRect(0, 0, 96, 96);

        // Heavy purple stone archway
        ctx.fillStyle = '#2c153d';
        ctx.fillRect(4, 4, 88, 90);
        ctx.fillStyle = '#3e1e56';
        ctx.fillRect(8, 8, 80, 86);

        // Arch stones lintel
        ctx.fillStyle = '#4f276e';
        ctx.fillRect(4, 4, 88, 12);
        ctx.fillStyle = '#65338d';
        ctx.fillRect(44, 2, 8, 16); // Central keystone

        // Inner massive double doors (deep ancient purple)
        ctx.fillStyle = '#1d0c2b';
        ctx.fillRect(14, 18, 68, 76);

        // Left and Right door leaves
        ctx.fillStyle = '#2c1340';
        ctx.fillRect(16, 20, 31, 74);
        ctx.fillStyle = '#371850';
        ctx.fillRect(49, 20, 31, 74);

        // Door dividing crevice
        ctx.fillStyle = '#0f0517';
        ctx.fillRect(47, 18, 2, 78);

        // Huge carved Delta Rune emblem across both door halves
        // Winged orb
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(48, 42, 6, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.beginPath();
        ctx.moveTo(40, 42);
        ctx.lineTo(24, 34);
        ctx.lineTo(28, 46);
        ctx.lineTo(38, 44);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(56, 42);
        ctx.lineTo(72, 34);
        ctx.lineTo(68, 46);
        ctx.lineTo(58, 44);
        ctx.fill();

        // 3 Triangles below orb
        // Left
        ctx.beginPath();
        ctx.moveTo(32, 54);
        ctx.lineTo(26, 64);
        ctx.lineTo(38, 64);
        ctx.fill();
        // Right
        ctx.beginPath();
        ctx.moveTo(64, 54);
        ctx.lineTo(58, 64);
        ctx.lineTo(70, 64);
        ctx.fill();
        // Center (inverted)
        ctx.beginPath();
        ctx.moveTo(42, 54);
        ctx.lineTo(54, 54);
        ctx.lineTo(48, 64);
        ctx.fill();

        // Golden rune accents
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(47, 41, 2, 2);
        ctx.fillRect(31, 58, 2, 2);
        ctx.fillRect(63, 58, 2, 2);
        ctx.fillRect(47, 56, 2, 2);

        // Heavy iron door studs / rivets
        ctx.fillStyle = '#170c24';
        [20, 30, 66, 76].forEach((rx) => {
          [26, 74, 86].forEach((ry) => {
            ctx.fillRect(rx, ry, 3, 3);
          });
        });

        // Cold blue/white mist threshold at bottom
        ctx.fillStyle = 'rgba(180, 210, 255, 0.25)';
        ctx.fillRect(10, 88, 76, 8);

        canvas.refresh();
      }
    }

    // 37. Hallway Carpet Runner (280x28)
    if (!scene.textures.exists('prop_hallway_runner')) {
      const canvas = scene.textures.createCanvas('prop_hallway_runner', 280, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Rich burgundy base
        ctx.fillStyle = '#54121b';
        ctx.fillRect(0, 0, 280, 28);

        // Gold fringe borders
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(0, 1, 280, 2);
        ctx.fillRect(0, 25, 280, 2);

        // Warm crimson inner field
        ctx.fillStyle = '#821e2b';
        ctx.fillRect(0, 3, 280, 22);

        // Gold diamond pattern repeats
        ctx.fillStyle = '#f1c40f';
        for (let dx = 14; dx < 280; dx += 28) {
          ctx.beginPath();
          ctx.moveTo(dx, 8);
          ctx.lineTo(dx + 6, 14);
          ctx.lineTo(dx, 20);
          ctx.lineTo(dx - 6, 14);
          ctx.closePath();
          ctx.fill();
        }

        canvas.refresh();
      }
    }

    // --- Snowdin Forest Textures ---
    // 25. Snowdin Forest Floor Tile (32x32)
    if (!scene.textures.exists('tile_floor_snow')) {
      const canvas = scene.textures.createCanvas('tile_floor_snow', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#171829'; // Deep indigo night snow
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#22243d';
        ctx.fillRect(1, 1, 30, 30);
        ctx.fillStyle = '#34385e';
        ctx.fillRect(4, 4, 8, 8);
        ctx.fillRect(18, 16, 10, 8);
        // Soft white snowflake glints
        ctx.fillStyle = '#c7d2fe';
        ctx.fillRect(8, 8, 2, 2);
        ctx.fillRect(22, 20, 2, 2);
        canvas.refresh();
      }
    }

    // 26. Snowdin Forest Wall Tile (32x32)
    if (!scene.textures.exists('tile_wall_snow')) {
      const canvas = scene.textures.createCanvas('tile_wall_snow', 32, 32);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#151726';
        ctx.fillRect(2, 2, 28, 28);
        ctx.fillStyle = '#21243b';
        ctx.fillRect(4, 4, 12, 12);
        ctx.fillRect(18, 18, 10, 10);
        canvas.refresh();
      }
    }

    // 27. Snowy Pine Tree Prop (48x64)
    if (!scene.textures.exists('prop_snow_pine')) {
      const canvas = scene.textures.createCanvas('prop_snow_pine', 48, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Trunk
        ctx.fillStyle = '#3d2716';
        ctx.fillRect(21, 46, 6, 18);

        // Bough 3 (Bottom)
        ctx.fillStyle = '#1e3025';
        ctx.beginPath();
        ctx.moveTo(24, 28);
        ctx.lineTo(44, 48);
        ctx.lineTo(4, 48);
        ctx.closePath();
        ctx.fill();
        // Snow on Bough 3
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(6, 44, 36, 5);

        // Bough 2 (Middle)
        ctx.fillStyle = '#243b2e';
        ctx.beginPath();
        ctx.moveTo(24, 16);
        ctx.lineTo(38, 34);
        ctx.lineTo(10, 34);
        ctx.closePath();
        ctx.fill();
        // Snow on Bough 2
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(12, 30, 24, 4);

        // Bough 1 (Top)
        ctx.fillStyle = '#2e4c3b';
        ctx.beginPath();
        ctx.moveTo(24, 4);
        ctx.lineTo(32, 20);
        ctx.lineTo(16, 20);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(21, 4, 6, 4);
        ctx.fillRect(18, 16, 12, 3);

        canvas.refresh();
      }
    }

    // 28. Heavy Fallen Branch on Snow (36x14)
    if (!scene.textures.exists('prop_heavy_branch')) {
      const canvas = scene.textures.createCanvas('prop_heavy_branch', 36, 14);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        // Branch log
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(2, 4, 32, 6);
        ctx.fillStyle = '#6b411b';
        ctx.fillRect(4, 5, 28, 2);
        // Twigs
        ctx.fillRect(8, 1, 3, 4);
        ctx.fillRect(22, 9, 3, 4);
        // Light snow dusting on top
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(6, 3, 20, 2);
        canvas.refresh();
      }
    }

    // 28b. Broken Branch (Snapped into pieces with crack sound)
    if (!scene.textures.exists('prop_heavy_branch_broken')) {
      const canvas = scene.textures.createCanvas('prop_heavy_branch_broken', 36, 14);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        // Left piece
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(1, 5, 14, 6);
        // Splintered end
        ctx.fillStyle = '#d2a679';
        ctx.fillRect(14, 4, 3, 3);
        ctx.fillRect(15, 8, 2, 2);

        // Right piece (pushed slightly away)
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(20, 3, 15, 6);
        ctx.fillStyle = '#d2a679';
        ctx.fillRect(18, 3, 3, 3);
        ctx.fillRect(19, 7, 2, 2);

        canvas.refresh();
      }
    }

    // 29. Wooden Bar Bridge (Built by Papyrus with ridiculously wide bars)
    if (!scene.textures.exists('prop_snow_bridge')) {
      const canvas = scene.textures.createCanvas('prop_snow_bridge', 80, 56);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Bridge deck planks
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(0, 16, 80, 24);
        ctx.fillStyle = '#5d4037';
        for (let x = 2; x < 80; x += 10) {
          ctx.fillRect(x, 17, 8, 22);
        }

        // Bridge Top and Bottom Railings
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, 12, 80, 4);
        ctx.fillRect(0, 40, 80, 4);

        // Vertical posts with hilariously wide space in the center
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(4, 4, 6, 48);
        ctx.fillRect(70, 4, 6, 48);

        // Center wide bar (wide enough for anyone to walk through)
        ctx.fillRect(28, 4, 4, 48);
        ctx.fillRect(48, 4, 4, 48);

        // Snow patches on railing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3, 3, 8, 2);
        ctx.fillRect(27, 3, 6, 2);
        ctx.fillRect(47, 3, 6, 2);
        ctx.fillRect(69, 3, 8, 2);

        canvas.refresh();
      }
    }

    // 30. Monumental Grand Ruins Stone Door (64x64)
    if (!scene.textures.exists('prop_ruins_massive_door')) {
      const canvas = scene.textures.createCanvas('prop_ruins_massive_door', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        // Heavy stone arch
        ctx.fillStyle = '#22142d';
        ctx.fillRect(4, 2, 56, 60);
        ctx.fillStyle = '#3c224f';
        ctx.fillRect(8, 6, 48, 54);

        // Inner doorway darkness or light crack
        ctx.fillStyle = '#0d0614';
        ctx.fillRect(14, 14, 36, 46);

        // Winged Delta Rune crest above arch
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(22, 9, 6, 2);
        ctx.fillRect(36, 9, 6, 2);

        canvas.refresh();
      }
    }
  }

  private static createBattleEffects(scene: Phaser.Scene) {
    // 1. Bone Bullet
    if (!scene.textures.exists('bullet_bone')) {
      const canvas = scene.textures.createCanvas('bullet_bone', 14, 36);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#ffffff';
        // Top knobs
        ctx.fillRect(1, 0, 5, 5);
        ctx.fillRect(8, 0, 5, 5);
        // Shaft
        ctx.fillRect(4, 4, 6, 28);
        // Bottom knobs
        ctx.fillRect(1, 31, 5, 5);
        ctx.fillRect(8, 31, 5, 5);
        canvas.refresh();
      }
    }

    // 2. Blue Bone Bullet (stay still or take damage!)
    if (!scene.textures.exists('bullet_bone_blue')) {
      const canvas = scene.textures.createCanvas('bullet_bone_blue', 14, 36);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#00a8ff';
        ctx.fillRect(1, 0, 5, 5);
        ctx.fillRect(8, 0, 5, 5);
        ctx.fillRect(4, 4, 6, 28);
        ctx.fillRect(1, 31, 5, 5);
        ctx.fillRect(8, 31, 5, 5);
        canvas.refresh();
      }
    }

    // 3. Star Bullet
    if (!scene.textures.exists('bullet_star')) {
      const canvas = scene.textures.createCanvas('bullet_star', 16, 16);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(6, 0, 4, 16);
        ctx.fillRect(0, 6, 16, 4);
        ctx.fillRect(4, 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, 6, 4, 4);
        canvas.refresh();
      }
    }

    // 4. Fly Bullet (Froggit's flies)
    if (!scene.textures.exists('bullet_fly')) {
      const canvas = scene.textures.createCanvas('bullet_fly', 12, 12);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 4, 4, 4);
        ctx.fillStyle = '#00d2d3';
        ctx.fillRect(1, 1, 4, 3);
        ctx.fillRect(7, 1, 4, 3);
        canvas.refresh();
      }
    }

    // 4b. Flame Bullet (Toriel Fire Magic)
    if (!scene.textures.exists('bullet_flame')) {
      const canvas = scene.textures.createCanvas('bullet_flame', 16, 16);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(6, 1, 4, 14);
        ctx.fillRect(3, 4, 10, 10);
        ctx.fillRect(1, 7, 14, 6);
        ctx.fillStyle = '#ffa502';
        ctx.fillRect(4, 5, 8, 8);
        ctx.fillRect(5, 3, 6, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, 6, 4, 5);
        canvas.refresh();
      }
    }

    // 5. Slash attack effect (animation strip or single slice)
    if (!scene.textures.exists('fx_slash')) {
      const canvas = scene.textures.createCanvas('fx_slash', 80, 80);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(40, 40, 32, -Math.PI / 4, (3 * Math.PI) / 4);
        ctx.stroke();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();
        canvas.refresh();
      }
    }

    // 6. Target Bar Meter (Undertale fight target ellipse)
    if (!scene.textures.exists('target_meter')) {
      const canvas = scene.textures.createCanvas('target_meter', 460, 110);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 452, 102);

        // Target rings
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(230, 55, 180, 45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(230, 55, 100, 35, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Center sweet spot
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(226, 8, 8, 94);
        canvas.refresh();
      }
    }

    // 7. Flowey's Friendliness Pellets (white seeds)
    if (!scene.textures.exists('bullet_pellet')) {
      const canvas = scene.textures.createCanvas('bullet_pellet', 12, 12);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 2, 4, 8);
        ctx.fillRect(2, 4, 8, 4);
        ctx.fillStyle = '#dfe6e9';
        ctx.fillRect(4, 4, 4, 4);
        canvas.refresh();
      }
    }

    // 8. Toriel's Rescue Fireball
    if (!scene.textures.exists('fx_fireball')) {
      const canvas = scene.textures.createCanvas('fx_fireball', 28, 28);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(14, 14, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(14, 14, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14, 14, 4, 0, Math.PI * 2);
        ctx.fill();
        canvas.refresh();
      }
    }
  }

  private static createDialoguePortraits(scene: Phaser.Scene) {
    // 1. Flowey Happy Portrait (64x64)
    if (!scene.textures.exists('portrait_flowey_happy')) {
      const canvas = scene.textures.createCanvas('portrait_flowey_happy', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Petals
        ctx.fillStyle = '#f1c40f';
        const petalCoords = [
          [32, 10], [47, 17], [54, 32], [47, 47],
          [32, 54], [17, 47], [10, 32], [17, 17]
        ];
        petalCoords.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#f39c12';
        petalCoords.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Face circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 32, 16, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(25, 26, 4, 6);
        ctx.fillRect(35, 26, 4, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(26, 27, 2, 2);
        ctx.fillRect(36, 27, 2, 2);

        // Smile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(32, 34, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Cheeks
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(22, 35, 3, 2);
        ctx.fillRect(39, 35, 3, 2);

        canvas.refresh();
      }
    }

    // 2. Flowey Wink Portrait (64x64)
    if (!scene.textures.exists('portrait_flowey_wink')) {
      const canvas = scene.textures.createCanvas('portrait_flowey_wink', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Petals
        ctx.fillStyle = '#f1c40f';
        const petalCoords = [
          [32, 10], [47, 17], [54, 32], [47, 47],
          [32, 54], [17, 47], [10, 32], [17, 17]
        ];
        petalCoords.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = '#f39c12';
        petalCoords.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Face
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 32, 16, 0, Math.PI * 2);
        ctx.fill();

        // Left eye open
        ctx.fillStyle = '#000000';
        ctx.fillRect(25, 26, 4, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(26, 27, 2, 2);

        // Right eye winking ^
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(34, 30);
        ctx.lineTo(38, 27);
        ctx.lineTo(42, 30);
        ctx.stroke();

        // Smile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(32, 34, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.fillStyle = '#ff7675';
        ctx.fillRect(22, 35, 3, 2);
        ctx.fillRect(39, 35, 3, 2);

        canvas.refresh();
      }
    }

    // 3. Flowey Evil Portrait (64x64)
    if (!scene.textures.exists('portrait_flowey_evil')) {
      const canvas = scene.textures.createCanvas('portrait_flowey_evil', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Twisted dark petals
        ctx.fillStyle = '#b7950b';
        const petalCoords = [
          [32, 8], [49, 15], [56, 32], [49, 49],
          [32, 56], [15, 49], [8, 32], [15, 15]
        ];
        petalCoords.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
        });

        // Face pale ghastly
        ctx.fillStyle = '#f5f6fa';
        ctx.beginPath();
        ctx.arc(32, 32, 16, 0, Math.PI * 2);
        ctx.fill();

        // Black hollow sockets with tiny white dots
        ctx.fillStyle = '#000000';
        ctx.fillRect(22, 23, 7, 9);
        ctx.fillRect(35, 23, 7, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 27, 2, 2);
        ctx.fillRect(38, 27, 2, 2);

        // Twisted demonic grin with sharp teeth
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(32, 34, 11, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        for (let t = 24; t <= 40; t += 4) {
          ctx.fillRect(t, 34, 2, 4);
          ctx.fillRect(t + 1, 38, 2, 4);
        }

        canvas.refresh();
      }
    }

    // 4. Toriel Normal Portrait (64x64)
    if (!scene.textures.exists('portrait_toriel_normal')) {
      const canvas = scene.textures.createCanvas('portrait_toriel_normal', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Goat ears drooping down
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 22, 10, 26);
        ctx.fillRect(44, 22, 10, 26);
        ctx.fillStyle = '#fab1a0';
        ctx.fillRect(13, 26, 4, 18);
        ctx.fillRect(47, 26, 4, 18);

        // Small curved horns
        ctx.fillStyle = '#dcdde1';
        ctx.beginPath();
        ctx.moveTo(22, 18);
        ctx.lineTo(20, 8);
        ctx.lineTo(26, 14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(42, 18);
        ctx.lineTo(44, 8);
        ctx.lineTo(38, 14);
        ctx.fill();

        // Head fur
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(22, 30, 20, 18);

        // Caring eyes
        ctx.fillStyle = '#833471';
        ctx.fillRect(24, 26, 4, 6);
        ctx.fillRect(36, 26, 4, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 27, 2, 2);
        ctx.fillRect(37, 27, 2, 2);

        // Snout & mouth
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(30, 36, 4, 2);
        ctx.fillRect(31, 38, 2, 3);
        ctx.fillRect(28, 41, 8, 2);

        // Fangs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(27, 39, 2, 2);
        ctx.fillRect(35, 39, 2, 2);

        canvas.refresh();
      }
    }

    // 5. Toriel Warm Smiling Portrait (64x64)
    if (!scene.textures.exists('portrait_toriel_warm')) {
      const canvas = scene.textures.createCanvas('portrait_toriel_warm', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Ears
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 22, 10, 26);
        ctx.fillRect(44, 22, 10, 26);
        ctx.fillStyle = '#fab1a0';
        ctx.fillRect(13, 26, 4, 18);
        ctx.fillRect(47, 26, 4, 18);

        // Horns
        ctx.fillStyle = '#dcdde1';
        ctx.beginPath();
        ctx.moveTo(22, 18);
        ctx.lineTo(20, 8);
        ctx.lineTo(26, 14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(42, 18);
        ctx.lineTo(44, 8);
        ctx.lineTo(38, 14);
        ctx.fill();

        // Head fur
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(22, 30, 20, 18);

        // Motherly closed eye smile ^ ^
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(22, 29);
        ctx.lineTo(26, 25);
        ctx.lineTo(30, 29);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(34, 29);
        ctx.lineTo(38, 25);
        ctx.lineTo(42, 29);
        ctx.stroke();

        // Cheeks blush
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(19, 33, 4, 3);
        ctx.fillRect(41, 33, 4, 3);

        // Snout & warm smile
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(30, 36, 4, 2);
        ctx.fillRect(31, 38, 2, 3);
        ctx.fillRect(27, 41, 10, 2);

        // Fangs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(27, 39, 2, 2);
        ctx.fillRect(35, 39, 2, 2);

        canvas.refresh();
      }
    }

    // 6. Sans Normal Portrait (64x64)
    if (!scene.textures.exists('portrait_sans_normal')) {
      const canvas = scene.textures.createCanvas('portrait_sans_normal', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Round skull
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 28, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(20, 30, 24, 18);

        // Hollow sockets with pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(20, 22, 9, 12);
        ctx.fillRect(35, 22, 9, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 26, 3, 3);
        ctx.fillRect(37, 26, 3, 3);

        // Nose
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(32, 33);
        ctx.lineTo(30, 37);
        ctx.lineTo(34, 37);
        ctx.fill();

        // Toothy grin
        ctx.fillStyle = '#000000';
        ctx.fillRect(18, 41, 28, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(19, 42, 26, 4);
        ctx.fillStyle = '#000000';
        for (let tx = 23; tx <= 43; tx += 4) {
          ctx.fillRect(tx, 41, 1, 6);
        }

        canvas.refresh();
      }
    }

    // 7. Sans Wink Portrait (64x64)
    if (!scene.textures.exists('portrait_sans_wink')) {
      const canvas = scene.textures.createCanvas('portrait_sans_wink', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 28, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(20, 30, 24, 18);

        // Left socket open
        ctx.fillStyle = '#000000';
        ctx.fillRect(20, 22, 9, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 26, 3, 3);

        // Right eye winking line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(35, 28);
        ctx.lineTo(44, 28);
        ctx.stroke();

        // Nose
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(32, 33);
        ctx.lineTo(30, 37);
        ctx.lineTo(34, 37);
        ctx.fill();

        // Grin
        ctx.fillStyle = '#000000';
        ctx.fillRect(18, 41, 28, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(19, 42, 26, 4);
        ctx.fillStyle = '#000000';
        for (let tx = 23; tx <= 43; tx += 4) {
          ctx.fillRect(tx, 41, 1, 6);
        }

        canvas.refresh();
      }
    }

    // 8. Froggit Portrait (64x64)
    if (!scene.textures.exists('portrait_froggit')) {
      const canvas = scene.textures.createCanvas('portrait_froggit', 64, 64);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(32, 36, 24, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spots
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.arc(22, 40, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(42, 38, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eye bumps
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(20, 22, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(44, 22, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(20, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(44, 22, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(19, 20, 2, 2);
        ctx.fillRect(43, 20, 2, 2);

        // Mouth
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(26, 44, 12, 2);

        canvas.refresh();
      }
    }
  }
}
