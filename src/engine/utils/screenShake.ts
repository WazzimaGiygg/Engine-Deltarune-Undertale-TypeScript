import Phaser from 'phaser';
import { gameState } from '../gameState';

export type ScreenShakePreset =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'critical'
  | 'boss'
  | 'earthquake'
  | 'transition'
  | 'boss_hit'
  | 'boss_super';

export interface ScreenShakeOptions {
  duration?: number;
  intensity?: number;
  force?: boolean;
  flash?: {
    duration?: number;
    red?: number;
    green?: number;
    blue?: number;
  };
  onComplete?: () => void;
}

export const SHAKE_PRESETS: Record<
  ScreenShakePreset,
  { duration: number; intensity: number; flash?: ScreenShakeOptions['flash'] }
> = {
  light: {
    duration: 120,
    intensity: 0.007,
  },
  medium: {
    duration: 220,
    intensity: 0.015,
  },
  heavy: {
    duration: 320,
    intensity: 0.024,
    flash: { duration: 80, red: 255, green: 220, blue: 220 },
  },
  critical: {
    duration: 360,
    intensity: 0.032,
    flash: { duration: 110, red: 255, green: 255, blue: 255 },
  },
  boss: {
    duration: 540,
    intensity: 0.04,
    flash: { duration: 160, red: 255, green: 120, blue: 60 },
  },
  earthquake: {
    duration: 850,
    intensity: 0.028,
  },
  transition: {
    duration: 180,
    intensity: 0.007,
  },
  boss_hit: {
    duration: 480,
    intensity: 0.038,
    flash: { duration: 140, red: 255, green: 100, blue: 60 },
  },
  boss_super: {
    duration: 650,
    intensity: 0.05,
    flash: { duration: 200, red: 255, green: 80, blue: 40 },
  },
};

/**
 * Triggers a screen shake on the given Phaser Scene's main camera,
 * with optional camera flash and guaranteed cleanup.
 */
export function triggerScreenShake(
  scene: Phaser.Scene | undefined | null,
  presetOrOptions: ScreenShakePreset | ScreenShakeOptions = 'medium'
): void {
  if (!scene || !scene.cameras || !scene.cameras.main) return;

  const camera = scene.cameras.main;
  let duration: number;
  let intensity: number;
  let force = true;
  let flashOpt: ScreenShakeOptions['flash'] | undefined;
  let onComplete: (() => void) | undefined;

  if (typeof presetOrOptions === 'string') {
    const preset = SHAKE_PRESETS[presetOrOptions] || SHAKE_PRESETS.medium;
    duration = preset.duration;
    intensity = preset.intensity;
    flashOpt = preset.flash;
  } else {
    duration = presetOrOptions.duration ?? 220;
    intensity = presetOrOptions.intensity ?? 0.015;
    force = presetOrOptions.force ?? true;
    flashOpt = presetOrOptions.flash;
    onComplete = presetOrOptions.onComplete;
  }

  const userSetting = gameState.getScreenShake();
  if (userSetting === 'off') {
    if (onComplete) onComplete();
    return;
  }
  if (userSetting === 'reduced') {
    intensity *= 0.4;
    duration *= 0.7;
  }

  // Visual screen flash if requested
  if (flashOpt && typeof camera.flash === 'function' && gameState.getGraphicsQuality() !== 'performance') {
    const flashDur = flashOpt.duration ?? 90;
    const r = flashOpt.red ?? 255;
    const g = flashOpt.green ?? 255;
    const b = flashOpt.blue ?? 255;
    camera.flash(flashDur, r, g, b, true);
  }

  // Trigger camera shake
  camera.shake(duration, intensity, force, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
    if (progress >= 1) {
      if (onComplete) {
        onComplete();
      }
    }
  });
}

/** Shorthand alias */
export const screenShake = triggerScreenShake;

/**
 * Triggers camera shake during high-impact events like boss hits or screen transitions.
 */
export function triggerImpactShake(
  scene: Phaser.Scene | undefined | null,
  eventType: 'boss_hit' | 'boss_super' | 'transition' | 'critical' | 'heavy'
): void {
  triggerScreenShake(scene, eventType);
}
