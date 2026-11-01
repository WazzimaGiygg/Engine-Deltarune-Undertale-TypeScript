import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { triggerScreenShake } from './screenShake';

export interface HitParticleOptions {
  x: number;
  y: number;
  isCritical?: boolean;
  damage?: number;
  color?: number;
}

export interface DefeatExplosionOptions {
  enemySprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  enemyId?: string;
  onComplete?: () => void;
}

/**
 * Ensures fallback particle textures exist in the current scene's cache.
 */
function ensureParticleTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('fx_spark_pixel')) {
    const canvas = scene.textures.createCanvas('fx_spark_pixel', 6, 6);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 0, 4, 6);
      ctx.fillRect(0, 1, 6, 4);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('fx_dust_speck')) {
    const canvas = scene.textures.createCanvas('fx_dust_speck', 6, 6);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, 5, 5);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('fx_crit_star')) {
    const canvas = scene.textures.createCanvas('fx_crit_star', 12, 12);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#fff455';
      ctx.fillRect(5, 0, 2, 12);
      ctx.fillRect(0, 5, 12, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 4, 4);
      canvas.refresh();
    }
  }
}

/**
 * Spawns an energetic burst of hit sparks, slash streaks, and expanding shockwave ring
 * when the player connects an attack against an enemy.
 */
export function spawnHitExplosion(scene: Phaser.Scene, options: HitParticleOptions): void {
  ensureParticleTextures(scene);
  const { x, y, isCritical = false } = options;

  // 1. Trigger Screen Shake corresponding to impact weight
  if (isCritical) {
    triggerScreenShake(scene, 'critical');
  } else {
    triggerScreenShake(scene, 'light');
  }

  // 2. Shockwave expanding ring (drawn via Phaser Graphics)
  const ring = scene.add.graphics();
  ring.setDepth(35);
  const maxRadius = isCritical ? 65 : 40;
  const ringColor = isCritical ? 0xfff455 : 0xffffff;

  const ringAnim = { r: 5, alpha: 1, lineWidth: isCritical ? 4 : 2 };
  scene.tweens.add({
    targets: ringAnim,
    r: maxRadius,
    alpha: 0,
    lineWidth: 1,
    duration: isCritical ? 260 : 190,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      ring.clear();
      ring.lineStyle(ringAnim.lineWidth, ringColor, ringAnim.alpha);
      ring.strokeCircle(x, y, ringAnim.r);
    },
    onComplete: () => {
      ring.destroy();
    },
  });

  // 3. Slash flare cross / streak lines
  const crossLines = scene.add.graphics();
  crossLines.setDepth(34);
  const crossLength = isCritical ? 45 : 25;
  crossLines.lineStyle(isCritical ? 3 : 2, isCritical ? 0xff3333 : 0xffffff, 0.9);
  crossLines.lineBetween(x - crossLength, y - crossLength * 0.5, x + crossLength, y + crossLength * 0.5);
  crossLines.lineBetween(x - crossLength * 0.5, y + crossLength, x + crossLength * 0.5, y - crossLength);

  scene.tweens.add({
    targets: crossLines,
    scaleX: 1.6,
    scaleY: 1.6,
    alpha: 0,
    duration: 180,
    ease: 'Quad.easeOut',
    onComplete: () => crossLines.destroy(),
  });

  // 4. Spark Particle Burst
  const particleCount = isCritical ? 28 : 14;
  const colors = isCritical
    ? [0xfff455, 0xffffff, 0xff3b30, 0xff9500, 0x5856d6]
    : [0xffffff, 0xe0e0e0, 0xffe600];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = isCritical ? 90 + Math.random() * 160 : 50 + Math.random() * 110;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = isCritical ? (Math.random() > 0.5 ? 6 : 4) : 4;

    const spark = scene.add.rectangle(x, y, size, size, color);
    spark.setDepth(36);

    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed + (Math.random() * 20 - 5);

    scene.tweens.add({
      targets: spark,
      x: targetX,
      y: targetY,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      angle: Math.random() * 360,
      duration: isCritical ? 340 + Math.random() * 160 : 220 + Math.random() * 120,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  // 5. Critical star burst shapes
  if (isCritical) {
    for (let i = 0; i < 6; i++) {
      const star = scene.add.sprite(x, y, 'fx_crit_star');
      star.setDepth(37);
      const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 60 + Math.random() * 40;

      scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scaleX: 0.3,
        scaleY: 0.3,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 420,
        ease: 'Sine.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }
}

/**
 * Spawns an authentic Undertale/Deltarune monster dust disintegration explosion.
 * The enemy flashes, trembles, and dissolves into dozens of ascending magical dust particles.
 */
export function spawnMonsterDustExplosion(
  scene: Phaser.Scene,
  options: DefeatExplosionOptions
): void {
  ensureParticleTextures(scene);
  const { enemySprite, enemyId = 'generic', onComplete } = options;

  if (!enemySprite || !enemySprite.active) {
    if (onComplete) onComplete();
    return;
  }

  const originX = enemySprite.x;
  const originY = enemySprite.y;
  const bounds = enemySprite.getBounds ? enemySprite.getBounds() : {
    x: originX - 40,
    y: originY - 40,
    width: 80,
    height: 80,
  };

  // 1. Intense Screen Shake & Hurt Dissolve Audio
  triggerScreenShake(scene, 'boss');
  soundManager.playHurt();

  // 2. Initial Flash & Rapid Shiver on the enemy sprite
  scene.tweens.add({
    targets: enemySprite,
    x: originX + 8,
    duration: 40,
    yoyo: true,
    repeat: 6,
    onComplete: () => {
      // Enemy fades and disappears as the dust erupts
      scene.tweens.add({
        targets: enemySprite,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          if (enemySprite.active) {
            enemySprite.destroy();
          }
        },
      });
    },
  });

  // 3. Shockwave Dissolution Wave
  const shockwave = scene.add.graphics();
  shockwave.setDepth(35);
  const waveAnim = { radius: 10, alpha: 1 };
  scene.tweens.add({
    targets: waveAnim,
    radius: Math.max(bounds.width, bounds.height) * 1.2,
    alpha: 0,
    duration: 450,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      shockwave.clear();
      shockwave.lineStyle(3, 0xffffff, waveAnim.alpha);
      shockwave.strokeCircle(originX, originY, waveAnim.radius);
    },
    onComplete: () => shockwave.destroy(),
  });

  // 4. Monster Dust Particle Fountain (50 to 70 individual dust flakes)
  const particleCount = enemyId === 'sir_ossos' || enemyId === 'deltajester' ? 70 : 48;
  const dustColors = [0xffffff, 0xe6e6e6, 0xcccccc, 0xb3b3b3, 0xddddf0];

  for (let i = 0; i < particleCount; i++) {
    // Distribute particles across the bounding area of the monster
    const startX = bounds.x + Math.random() * bounds.width;
    const startY = bounds.y + Math.random() * bounds.height;

    const size = Math.random() > 0.7 ? 5 : 3;
    const color = dustColors[Math.floor(Math.random() * dustColors.length)];

    const dust = scene.add.rectangle(startX, startY, size, size, color);
    dust.setDepth(38);
    dust.setAlpha(0.9);

    // Dust floats upward and drifts sideways like magical Undertale monster ash
    const horizontalDrift = (Math.random() - 0.5) * 110;
    const verticalRise = -(40 + Math.random() * 90);
    const duration = 700 + Math.random() * 500;
    const delay = Math.random() * 150;

    scene.tweens.add({
      targets: dust,
      x: startX + horizontalDrift,
      y: startY + verticalRise,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      delay,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        dust.destroy();
      },
    });
  }

  // 5. Bright magical core sparkles that linger momentarily
  for (let i = 0; i < 8; i++) {
    const coreSpark = scene.add.sprite(
      originX + (Math.random() - 0.5) * 30,
      originY + (Math.random() - 0.5) * 30,
      'fx_crit_star'
    );
    coreSpark.setDepth(39);
    coreSpark.setScale(0.8);

    scene.tweens.add({
      targets: coreSpark,
      y: coreSpark.y - 35,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      rotation: Math.PI,
      duration: 500 + Math.random() * 300,
      ease: 'Sine.easeOut',
      onComplete: () => coreSpark.destroy(),
    });
  }

  // 6. Complete callback after dissolution
  scene.time.delayedCall(750, () => {
    if (onComplete) onComplete();
  });
}

/**
 * Spawns peaceful sparkling star particles when an enemy is spared.
 */
export function spawnMercySparkles(
  scene: Phaser.Scene,
  enemySprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
): void {
  ensureParticleTextures(scene);
  if (!enemySprite || !enemySprite.active) return;

  const originX = enemySprite.x;
  const originY = enemySprite.y;
  const colors = [0xffff77, 0x77ff77, 0x77ffff, 0xffffff];

  for (let i = 0; i < 18; i++) {
    const star = scene.add.sprite(
      originX + (Math.random() - 0.5) * 60,
      originY + (Math.random() - 0.5) * 50,
      'fx_crit_star'
    );
    star.setDepth(35);
    star.setScale(0.8 + Math.random() * 0.4);
    star.setTint(colors[Math.floor(Math.random() * colors.length)]);

    scene.tweens.add({
      targets: star,
      y: star.y - (30 + Math.random() * 50),
      x: star.x + (Math.random() - 0.5) * 40,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      rotation: Math.PI * 1.5,
      delay: Math.random() * 200,
      duration: 600 + Math.random() * 400,
      ease: 'Sine.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}
