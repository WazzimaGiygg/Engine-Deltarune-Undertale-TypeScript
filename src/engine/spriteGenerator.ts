import Phaser from 'phaser';

export class SpriteGenerator {
  public static generateAllTextures(scene: Phaser.Scene) {
    this.createPlayerTextures(scene);
    this.createSoulTextures(scene);
    this.createEnemyTextures(scene);
    this.createTileTextures(scene);
    this.createBattleEffects(scene);
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
  }
}
