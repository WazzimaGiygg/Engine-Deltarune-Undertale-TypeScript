import React, { useEffect, useMemo } from 'react';
import { gameState } from '../engine/gameState';

interface CRTShaderOverlayProps {
  enabled?: boolean;
}

export const CRTShaderOverlay: React.FC<CRTShaderOverlayProps> = ({ enabled = true }) => {
  const [active, setActive] = React.useState(enabled);
  const [quality, setQuality] = React.useState(gameState.getGraphicsQuality());

  useEffect(() => {
    return gameState.subscribeGraphics((settings) => {
      setActive(settings.crtFilter);
      setQuality(settings.quality);
    });
  }, []);

  // Generate an authentic 128x128 spherical radial barrel displacement map
  const displacementDataUri = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const center = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - center) / center;
        const dy = (y - center) / center;
        const r2 = dx * dx + dy * dy;

        // Spherical barrel distortion formula
        const distortion = 1 + r2 * 0.18;
        const warpedX = dx * distortion;
        const warpedY = dy * distortion;

        // Difference in coordinate mapped to 0..255 (128 = no displacement)
        const dispX = Math.min(255, Math.max(0, 128 + Math.round((warpedX - dx) * 110)));
        const dispY = Math.min(255, Math.max(0, 128 + Math.round((warpedY - dy) * 110)));

        const idx = (y * size + x) * 4;
        data[idx] = dispX; // Red = X offset
        data[idx + 1] = dispY; // Green = Y offset
        data[idx + 2] = 128; // Blue = Unused / neutral
        data[idx + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, []);

  if (!active) {
    return null;
  }

  // Adjust curvature intensity based on performance quality setting
  const displacementScale = quality === 'ultra' ? 14 : quality === 'balanced' ? 8 : 4;

  return (
    <>
      {/* SVG Displacement Filter definition for authentic glass tube curvature */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="crt-barrel-curvature" x="-5%" y="-5%" width="110%" height="110%">
            {displacementDataUri && (
              <feImage
                href={displacementDataUri}
                result="curvatureMap"
                preserveAspectRatio="none"
              />
            )}
            <feDisplacementMap
              in="SourceGraphic"
              in2="curvatureMap"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="warpedScreen"
            />
          </filter>
        </defs>
      </svg>

      {/* Main CRT Overlay Layers Container with authentic curved monitor bounds */}
      <div
        className={`absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-[22px] sm:rounded-[28px] ${
          quality !== 'performance' ? 'crt-flicker' : ''
        }`}
      >
        {/* Layer 1: Horizontal High-Definition Scanlines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(
              rgba(18, 16, 16, 0) 50%,
              rgba(0, 0, 0, ${quality === 'ultra' ? '0.32' : '0.22'}) 50%
            ), linear-gradient(
              90deg,
              rgba(255, 0, 0, 0.04),
              rgba(0, 255, 0, 0.015),
              rgba(0, 0, 255, 0.04)
            )`,
            backgroundSize: '100% 3px, 6px 100%',
          }}
        />

        {/* Layer 2: Dynamic Moving Electron Beam Refresh Scanline Sweep */}
        {quality !== 'performance' && (
          <div
            className="absolute left-0 right-0 h-24 crt-dynamic-sweep"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%)',
            }}
          />
        )}

        {/* Layer 3: Radial Curved Glass Vignette & Corner Shadow Falloff */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(
              circle at center,
              rgba(0, 0, 0, 0) 58%,
              rgba(0, 0, 0, 0.35) 80%,
              rgba(0, 0, 0, 0.85) 100%
            )`,
          }}
        />

        {/* Layer 4: Authentic CRT Monitor Corner Curves (Physical 4-Corner Bezel Cutouts) */}
        {/* Top-Left Corner Curve */}
        <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 pointer-events-none select-none z-40">
          <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
            {/* Bezel Corner Mask */}
            <path d="M 0 0 L 64 0 C 32 0, 0 32, 0 64 Z" fill="#0c0c10" />
            {/* Glass Rim Specular Highlight */}
            <path
              d="M 64 0 C 32 0, 0 32, 0 64"
              fill="none"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="2.5"
            />
            {/* Inner Recessed Shadow */}
            <path
              d="M 62 2 C 32 2, 2 32, 2 62"
              fill="none"
              stroke="rgba(0, 0, 0, 0.8)"
              strokeWidth="3"
            />
          </svg>
        </div>

        {/* Top-Right Corner Curve */}
        <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 pointer-events-none select-none z-40">
          <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
            {/* Bezel Corner Mask */}
            <path d="M 64 0 L 0 0 C 32 0, 64 32, 64 64 Z" fill="#0c0c10" />
            {/* Glass Rim Specular Highlight */}
            <path
              d="M 0 0 C 32 0, 64 32, 64 64"
              fill="none"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="2.5"
            />
            {/* Inner Recessed Shadow */}
            <path
              d="M 2 2 C 32 2, 62 32, 62 62"
              fill="none"
              stroke="rgba(0, 0, 0, 0.8)"
              strokeWidth="3"
            />
          </svg>
        </div>

        {/* Bottom-Left Corner Curve */}
        <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 pointer-events-none select-none z-40">
          <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
            {/* Bezel Corner Mask */}
            <path d="M 0 64 L 0 0 C 0 32, 32 64, 64 64 Z" fill="#0c0c10" />
            {/* Glass Rim Ambient Reflection */}
            <path
              d="M 0 0 C 0 32, 32 64, 64 64"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="2"
            />
            {/* Inner Recessed Shadow */}
            <path
              d="M 2 2 C 2 32, 32 62, 62 62"
              fill="none"
              stroke="rgba(0, 0, 0, 0.9)"
              strokeWidth="3.5"
            />
          </svg>
        </div>

        {/* Bottom-Right Corner Curve */}
        <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-16 sm:h-16 pointer-events-none select-none z-40">
          <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
            {/* Bezel Corner Mask */}
            <path d="M 64 64 L 64 0 C 64 32, 32 64, 0 64 Z" fill="#0c0c10" />
            {/* Glass Rim Ambient Reflection */}
            <path
              d="M 64 0 C 64 32, 32 64, 0 64"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="2"
            />
            {/* Inner Recessed Shadow */}
            <path
              d="M 62 2 C 62 32, 32 62, 2 62"
              fill="none"
              stroke="rgba(0, 0, 0, 0.9)"
              strokeWidth="3.5"
            />
          </svg>
        </div>

        {/* Layer 5: Inward CRT Tube Radial Corner Darkening */}
        <div className="absolute top-0 left-0 w-28 h-28 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.45)_55%,transparent_80%)]" />
        <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.45)_55%,transparent_80%)]" />
        <div className="absolute bottom-0 left-0 w-28 h-28 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.45)_55%,transparent_80%)]" />
        <div className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.45)_55%,transparent_80%)]" />

        {/* Layer 6: Heavy Curved Glass Bezel Edge Shadows */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow:
              'inset 0 0 35px 8px rgba(0, 0, 0, 0.95), inset 0 0 12px 2px rgba(0, 0, 0, 0.85)',
          }}
        />

        {/* Layer 7: Glass Surface Glare / Specular Highlight Arc */}
        <div
          className="absolute -top-12 -left-12 w-72 h-72 rounded-full opacity-15 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 70%)',
            transform: 'rotate(-25deg)',
          }}
        />
      </div>
    </>
  );
};
