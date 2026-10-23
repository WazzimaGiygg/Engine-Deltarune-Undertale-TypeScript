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

    // 7. Puzzle Switch
    if (!scene.textures.exists('prop_switch_off')) {
      const canvas = scene.textures.createCanvas('prop_switch_off', 24, 24);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(4, 4, 16, 16);
        ctx.fillStyle = '#e74c3c'; // Red off
        ctx.fillRect(8, 8, 8, 8);
        canvas.refresh();
      }
    }
    if (!scene.textures.exists('prop_switch_on')) {
      const canvas = scene.textures.createCanvas('prop_switch_on', 24, 24);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(4, 4, 16, 16);
        ctx.fillStyle = '#2ecc71'; // Green on
        ctx.fillRect(7, 7, 10, 10);
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
