import React, { useEffect, useMemo, useState } from 'react';
import { gameState, PositionState } from '../engine/gameState';

interface RoomMeta {
  id: string;
  shortName: string;
  floorPolygon?: string; // SVG polygon points if irregular
  walkableRect?: { x: number; y: number; w: number; h: number };
  obstacles?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    shape?: 'rect' | 'circle';
    label?: string;
  }>;
  doors: Array<{ x: number; y: number; label: string; dir: 'N' | 'S' | 'E' | 'W' }>;
  pois: Array<{
    x: number;
    y: number;
    type: 'save' | 'npc' | 'chest' | 'switch' | 'spikes' | 'flowers' | 'sign';
    label: string;
  }>;
}

const ROOM_METAS: Record<string, RoomMeta> = {
  room_awakening: {
    id: 'room_awakening',
    shortName: 'O Despertar',
    // Authentic non-square chamber + corridor path
    floorPolygon:
      '46,162 72,130 180,130 220,165 240,205 580,205 580,275 240,275 220,315 180,345 72,345 46,315 26,240',
    doors: [{ x: 576, y: 240, label: 'Saída Leste (Clareira)', dir: 'E' }],
    pois: [
      { x: 130, y: 240, type: 'flowers', label: 'Flores Douradas' },
      { x: 130, y: 160, type: 'sign', label: 'Placa de Controles' },
    ],
  },

  room_flowey: {
    id: 'room_flowey',
    shortName: 'Clareira de Flowey',
    // Authentic stepped cavern with west corridor and north doorway
    floorPolygon:
      '42,222 186,222 192,160 224,128 286,128 286,72 354,72 354,128 416,128 448,160 464,192 464,288 448,320 416,352 224,352 192,320 186,258 42,258',
    doors: [
      { x: 54, y: 240, label: 'Voltar ao Despertar', dir: 'W' },
      { x: 320, y: 80, label: 'Entrada das Ruínas', dir: 'N' },
    ],
    pois: [
      { x: 320, y: 240, type: 'flowers', label: 'Mound de Flores' },
      { x: 320, y: 230, type: 'npc', label: 'Flowey' },
    ],
  },

  room_toriel_entrance: {
    id: 'room_toriel_entrance',
    shortName: 'Ruínas - Entrada',
    // Authentic non-square main hall with north stairs passage and south entry corridor
    floorPolygon:
      '235,64 405,64 405,165 505,165 505,370 372,370 372,455 268,455 268,370 135,370 135,165 235,165',
    obstacles: [
      { x: 195, y: 95, w: 25, h: 35, label: 'Pilar Esquerdo' },
      { x: 415, y: 95, w: 25, h: 35, label: 'Pilar Direito' },
    ],
    doors: [
      { x: 320, y: 445, label: 'Voltar à Clareira de Flowey', dir: 'S' },
      { x: 320, y: 72, label: 'Sala dos Interruptores', dir: 'N' },
    ],
    pois: [
      { x: 235, y: 275, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 190, y: 280, type: 'sign', label: 'Folhas de Outono' },
      { x: 320, y: 44, type: 'sign', label: 'Emblema Delta Rune' },
      { x: 430, y: 275, type: 'sign', label: 'Placa Antiga' },
      { x: 320, y: 165, type: 'npc', label: 'Toriel' },
    ],
  },

  ruins_switch_chamber: {
    id: 'ruins_switch_chamber',
    shortName: 'Sala dos Interruptores',
    walkableRect: { x: 140, y: 64, w: 360, h: 382 },
    obstacles: [
      { x: 140, y: 180, w: 130, h: 80, label: 'Canal de Água (Oeste)' },
      { x: 370, y: 180, w: 130, h: 80, label: 'Canal de Água (Leste)' },
    ],
    doors: [
      { x: 320, y: 445, label: 'Voltar à Entrada', dir: 'S' },
      { x: 320, y: 72, label: 'Sala do Manequim', dir: 'N' },
    ],
    pois: [
      { x: 210, y: 125, type: 'switch', label: 'Interruptor com Giz' },
      { x: 430, y: 125, type: 'switch', label: 'Interruptor Comum' },
      { x: 320, y: 145, type: 'spikes', label: 'Espinhos Retráteis' },
      { x: 400, y: 145, type: 'npc', label: 'Toriel' },
      { x: 480, y: 350, type: 'sign', label: 'Placa de Enigma' },
    ],
  },

  ruins_dummy_room: {
    id: 'ruins_dummy_room',
    shortName: 'Sala do Manequim',
    walkableRect: { x: 140, y: 64, w: 360, h: 382 },
    obstacles: [
      { x: 165, y: 105, w: 20, h: 30, label: 'Pilar Esquerdo' },
      { x: 455, y: 105, w: 20, h: 30, label: 'Pilar Direito' },
    ],
    doors: [
      { x: 320, y: 445, label: 'Voltar aos Interruptores', dir: 'S' },
      { x: 320, y: 72, label: 'Enigma dos Espinhos', dir: 'N' },
    ],
    pois: [
      { x: 370, y: 220, type: 'npc', label: 'Manequim de Treino' },
      { x: 260, y: 220, type: 'npc', label: 'Toriel' },
      { x: 175, y: 360, type: 'sign', label: 'Pilha de Folhas' },
      { x: 480, y: 170, type: 'sign', label: 'Conselho de Combate' },
    ],
  },

  ruins_puzzle: {
    id: 'ruins_puzzle',
    shortName: 'Enigma dos Espinhos',
    walkableRect: { x: 128, y: 64, w: 352, h: 352 },
    doors: [
      { x: 320, y: 416, label: 'Voltar ao Manequim', dir: 'S' },
      { x: 320, y: 64, label: 'Longo Corredor', dir: 'N' },
    ],
    pois: [
      { x: 250, y: 300, type: 'switch', label: 'Alavanca (com Giz)' },
      { x: 370, y: 300, type: 'switch', label: 'Alavanca Comum' },
      { x: 320, y: 220, type: 'spikes', label: 'Barreira de Espinhos' },
      { x: 440, y: 160, type: 'chest', label: 'Baú (Faca de Brinquedo)' },
      { x: 450, y: 300, type: 'npc', label: 'Froggit' },
      { x: 320, y: 360, type: 'sign', label: 'Dica do Enigma' },
    ],
  },

  ruins_long_hall: {
    id: 'ruins_long_hall',
    shortName: 'O Longo Corredor',
    walkableRect: { x: 150, y: 64, w: 300, h: 352 },
    doors: [{ x: 320, y: 416, label: 'Voltar ao Enigma', dir: 'S' }],
    pois: [
      { x: 220, y: 280, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 320, y: 150, type: 'npc', label: 'Toriel' },
      { x: 400, y: 220, type: 'sign', label: 'Bilhete de Toriel' },
    ],
  },

  room_toriel_house_exterior: {
    id: 'room_toriel_house_exterior',
    shortName: 'Fachada da Casa',
    walkableRect: { x: 36, y: 140, w: 568, h: 305 },
    obstacles: [
      { x: 350, y: 70, w: 180, h: 110, label: 'Casa de Toriel' },
      { x: 175, y: 135, w: 32, h: 35, shape: 'circle', label: 'Árvore Ancestral' },
    ],
    doors: [
      { x: 40, y: 340, label: 'Voltar às Ruínas', dir: 'W' },
      { x: 440, y: 195, label: 'Entrar na Casa', dir: 'N' },
    ],
    pois: [
      { x: 285, y: 310, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 190, y: 265, type: 'flowers', label: 'Tapete de Folhas' },
      { x: 395, y: 215, type: 'npc', label: 'Toriel' },
      { x: 440, y: 130, type: 'sign', label: 'Casa de Toriel' },
    ],
  },

  room_toriel_house_interior: {
    id: 'room_toriel_house_interior',
    shortName: 'Casa de Toriel - Sala',
    floorPolygon:
      '100,118 144,118 144,145 520,145 520,440 350,440 350,455 290,455 290,440 95,440 95,145 100,145',
    doors: [
      { x: 122, y: 135, label: 'Corredor dos Quartos', dir: 'N' },
      { x: 320, y: 445, label: 'Sair para o Jardim', dir: 'S' },
    ],
    pois: [
      { x: 220, y: 340, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 320, y: 125, type: 'switch', label: 'Lareira Aconchegante' },
      { x: 230, y: 190, type: 'sign', label: 'Poltrona de Veludo' },
      { x: 165, y: 125, type: 'sign', label: 'Estante de Livros' },
      { x: 475, y: 130, type: 'chest', label: 'Torta de Caramelo' },
      { x: 420, y: 260, type: 'sign', label: 'Mesa de Jantar' },
      { x: 300, y: 210, type: 'npc', label: 'Toriel' },
      { x: 155, y: 270, type: 'sign', label: 'Samambaia' },
    ],
  },

  room_toriel_hallway: {
    id: 'room_toriel_hallway',
    shortName: 'Casa de Toriel - Corredor',
    floorPolygon:
      '50,170 280,170 280,145 320,145 320,170 420,170 420,145 460,145 460,170 615,170 615,240 630,240 630,280 615,280 615,330 50,330 50,280 35,280 35,240 50,240',
    doors: [
      { x: 70, y: 260, label: 'Escadaria Subterrânea', dir: 'W' },
      { x: 605, y: 260, label: 'Sala de Estar', dir: 'E' },
      { x: 440, y: 155, label: 'Quarto da Criança', dir: 'N' },
      { x: 300, y: 155, label: 'Quarto de Toriel', dir: 'N' },
    ],
    pois: [
      { x: 490, y: 310, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 180, y: 155, type: 'sign', label: 'Quarto em Reforma' },
      { x: 525, y: 140, type: 'sign', label: 'Espelho' },
      { x: 235, y: 160, type: 'sign', label: 'Planta no Corredor' },
    ],
  },

  room_player_bedroom: {
    id: 'room_player_bedroom',
    shortName: 'Quarto da Criança',
    walkableRect: { x: 120, y: 165, w: 400, h: 280 },
    doors: [{ x: 320, y: 445, label: 'Voltar ao Corredor', dir: 'S' }],
    pois: [
      { x: 440, y: 195, type: 'switch', label: 'Cama Aconchegante' },
      { x: 375, y: 180, type: 'sign', label: 'Luminária Flor' },
      { x: 215, y: 195, type: 'chest', label: 'Caixa de Brinquedos' },
      { x: 140, y: 195, type: 'sign', label: 'Cômoda de Roupas' },
      { x: 505, y: 285, type: 'sign', label: 'Planta' },
    ],
  },

  room_toriel_bedroom: {
    id: 'room_toriel_bedroom',
    shortName: 'Quarto de Toriel',
    walkableRect: { x: 100, y: 165, w: 430, h: 280 },
    doors: [{ x: 320, y: 445, label: 'Voltar ao Corredor', dir: 'S' }],
    pois: [
      { x: 440, y: 200, type: 'switch', label: 'Cama de Casal' },
      { x: 350, y: 180, type: 'sign', label: 'Diário de Piadas' },
      { x: 175, y: 180, type: 'sign', label: 'Guarda-Roupa' },
      { x: 115, y: 270, type: 'sign', label: 'Estante de Caracóis' },
      { x: 505, y: 290, type: 'sign', label: 'Cacto Independente' },
    ],
  },

  room_toriel_basement: {
    id: 'room_toriel_basement',
    shortName: 'Ruínas - Saída Subterrânea',
    walkableRect: { x: 65, y: 168, w: 500, h: 132 },
    doors: [{ x: 90, y: 195, label: 'Subir para a Casa', dir: 'W' }],
    pois: [
      { x: 270, y: 260, type: 'save', label: 'Ponto de Salvar ★' },
      { x: 435, y: 220, type: 'npc', label: 'Toriel' },
      { x: 535, y: 200, type: 'switch', label: 'Portão das Ruínas' },
      { x: 150, y: 170, type: 'sign', label: 'Placa da Escadaria' },
    ],
  },
};

export const MiniMapOverlay: React.FC = () => {
  const [posState, setPosState] = useState<PositionState>(gameState.getPositionState());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [opacityLevel, setOpacityLevel] = useState<'medium' | 'high'>('high');

  useEffect(() => {
    const unsub = gameState.subscribePosition((newPos) => {
      setPosState(newPos);
    });
    return () => unsub();
  }, []);

  // Global 'M' hotkey to toggle mini-map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        setIsMinimized((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Only display in the Overworld scene
  if (posState.activeScene !== 'OverworldScene') {
    return null;
  }

  const currentMeta =
    ROOM_METAS[posState.room] || {
      id: posState.room,
      shortName: posState.room.replace(/^room_|^ruins_/, '').replace(/_/g, ' '),
      walkableRect: { x: 80, y: 80, w: 480, h: 320 },
      doors: [],
      pois: [],
    };

  // Clamped coordinates for soul inside 640x480 space
  const clampedX = Math.max(16, Math.min(624, posState.x));
  const clampedY = Math.max(16, Math.min(464, posState.y));

  const bgOpacityClass = opacityLevel === 'high' ? 'bg-black/85' : 'bg-black/65';

  if (isMinimized) {
    return (
      <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto select-none font-pixel">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-2 py-1 bg-black/85 border border-neutral-600 hover:border-yellow-400 text-[10px] text-neutral-300 hover:text-yellow-300 shadow-md backdrop-blur-xs transition-colors cursor-pointer rounded-xs"
          title="Pressione [M] ou clique para abrir o Mini-mapa"
        >
          <span className="text-red-500 font-bold">♥</span>
          <span className="text-[9px] tracking-wider font-bold">MAPA [M]</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`absolute top-2.5 right-2.5 z-20 pointer-events-auto select-none font-pixel border-2 border-neutral-700/90 hover:border-yellow-400/80 rounded-xs shadow-2xl backdrop-blur-xs transition-all w-[156px] sm:w-[172px] ${bgOpacityClass}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-neutral-900/90 border-b border-neutral-800 text-[9px] leading-tight">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <span className="text-red-500 text-[10px] shrink-0">♥</span>
          <span
            className="text-yellow-300 font-bold truncate text-[8.5px] uppercase tracking-wider"
            title={currentMeta.shortName}
          >
            {currentMeta.shortName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Opacity toggle */}
          <button
            onClick={() => setOpacityLevel((prev) => (prev === 'high' ? 'medium' : 'high'))}
            className="text-neutral-400 hover:text-white px-1 text-[8px] transition-colors"
            title="Alternar transparência"
          >
            ◐
          </button>

          {/* Legend toggle */}
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className={`px-1 text-[8px] transition-colors ${
              showLegend ? 'text-yellow-300' : 'text-neutral-400 hover:text-white'
            }`}
            title="Exibir/Ocultar Legenda"
          >
            ?
          </button>

          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="text-neutral-400 hover:text-yellow-400 px-1 text-[9px] font-bold transition-colors"
            title="Minimizar Mini-mapa [M]"
          >
            _
          </button>
        </div>
      </div>

      {/* Map Viewport Area (Maintains 4:3 Aspect Ratio) */}
      <div className="relative w-full aspect-[4/3] bg-neutral-950/90 overflow-hidden p-1.5 flex items-center justify-center">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '16px 12px',
          }}
        />

        <svg
          viewBox="0 0 640 480"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Room Walkable Area */}
          {currentMeta.floorPolygon ? (
            <polygon
              points={currentMeta.floorPolygon}
              fill="#2a163e"
              stroke="#593282"
              strokeWidth="10"
              strokeLinejoin="round"
            />
          ) : currentMeta.walkableRect ? (
            <rect
              x={currentMeta.walkableRect.x}
              y={currentMeta.walkableRect.y}
              width={currentMeta.walkableRect.w}
              height={currentMeta.walkableRect.h}
              fill="#2a163e"
              stroke="#593282"
              strokeWidth="10"
              rx="8"
            />
          ) : null}

          {/* Obstacles / Special Room Geometry */}
          {currentMeta.obstacles?.map((obs, idx) => {
            const isWater = obs.label?.toLowerCase().includes('água') || obs.label?.toLowerCase().includes('canal');
            if (obs.shape === 'circle') {
              const radius = Math.min(obs.w, obs.h) / 2;
              return (
                <circle
                  key={`obs-${idx}`}
                  cx={obs.x + obs.w / 2}
                  cy={obs.y + obs.h / 2}
                  r={radius}
                  fill="#180e25"
                  stroke="#3d215b"
                  strokeWidth="3"
                />
              );
            }
            return (
              <rect
                key={`obs-${idx}`}
                x={obs.x}
                y={obs.y}
                width={obs.w}
                height={obs.h}
                fill={isWater ? '#1e3a8a' : '#180e25'}
                stroke={isWater ? '#38bdf8' : '#4a286d'}
                strokeWidth={isWater ? 2 : 3}
                fillOpacity={isWater ? 0.75 : 0.9}
                rx={isWater ? 2 : 4}
              />
            );
          })}

          {/* Doorways */}
          {currentMeta.doors.map((door, idx) => {
            const isNorthOrSouth = door.dir === 'N' || door.dir === 'S';
            const width = isNorthOrSouth ? 48 : 16;
            const height = isNorthOrSouth ? 16 : 48;
            return (
              <g key={`door-${idx}`}>
                <rect
                  x={door.x - width / 2}
                  y={door.y - height / 2}
                  width={width}
                  height={height}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  rx="3"
                />
                <circle
                  cx={door.x}
                  cy={door.y}
                  r="6"
                  fill="#e0f2fe"
                  className="animate-pulse"
                />
              </g>
            );
          })}

          {/* POIs / Interactive Elements */}
          {currentMeta.pois.map((poi, idx) => {
            if (poi.type === 'save') {
              return (
                <g key={`poi-${idx}`}>
                  <circle
                    cx={poi.x}
                    cy={poi.y}
                    r="14"
                    fill="#facc15"
                    fillOpacity="0.3"
                    className="animate-ping"
                  />
                  <text
                    x={poi.x}
                    y={poi.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fef08a"
                    fontSize="24"
                    fontWeight="bold"
                    style={{ filter: 'drop-shadow(0 0 4px #eab308)' }}
                  >
                    ★
                  </text>
                </g>
              );
            }

            if (poi.type === 'flowers') {
              return (
                <ellipse
                  key={`poi-${idx}`}
                  cx={poi.x}
                  cy={poi.y}
                  rx="34"
                  ry="20"
                  fill="#eab308"
                  fillOpacity="0.45"
                  stroke="#fde047"
                  strokeWidth="3"
                  strokeDasharray="4 2"
                />
              );
            }

            if (poi.type === 'npc') {
              return (
                <g key={`poi-${idx}`}>
                  <circle
                    cx={poi.x}
                    cy={poi.y}
                    r="10"
                    fill="#c084fc"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <circle cx={poi.x} cy={poi.y} r="3" fill="#ffffff" />
                </g>
              );
            }

            if (poi.type === 'switch') {
              return (
                <g key={`poi-${idx}`}>
                  <rect
                    x={poi.x - 9}
                    y={poi.y - 9}
                    width="18"
                    height="18"
                    fill="#f59e0b"
                    stroke="#fde68a"
                    strokeWidth="2"
                    rx="3"
                  />
                  <circle cx={poi.x} cy={poi.y} r="4" fill="#ffffff" />
                </g>
              );
            }

            if (poi.type === 'chest') {
              return (
                <rect
                  key={`poi-${idx}`}
                  x={poi.x - 12}
                  y={poi.y - 10}
                  width="24"
                  height="20"
                  fill="#10b981"
                  stroke="#6ee7b7"
                  strokeWidth="2.5"
                  rx="3"
                />
              );
            }

            if (poi.type === 'spikes') {
              return (
                <g key={`poi-${idx}`}>
                  <rect
                    x={poi.x - 32}
                    y={poi.y - 7}
                    width="64"
                    height="14"
                    fill="#ef4444"
                    fillOpacity="0.75"
                    stroke="#fca5a5"
                    strokeWidth="2"
                    rx="2"
                  />
                </g>
              );
            }

            // Fallback (e.g. signs)
            return (
              <circle
                key={`poi-${idx}`}
                cx={poi.x}
                cy={poi.y}
                r="6"
                fill="#60a5fa"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Real-time Player Soul ♥ Marker */}
          <g
            transform={`translate(${clampedX}, ${clampedY})`}
            className="transition-transform duration-75 ease-out"
          >
            {/* Pulsing determination halo */}
            <circle
              r="16"
              fill="#ef4444"
              fillOpacity="0.35"
              className="animate-ping"
            />
            {/* Undertale Red Soul Heart */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ff2222"
              fontSize="24"
              fontWeight="bold"
              style={{
                filter: 'drop-shadow(0 0 5px #ff0000)',
              }}
            >
              ♥
            </text>
          </g>
        </svg>

        {/* Real-time Coordinates overlay in bottom corner */}
        <div className="absolute bottom-1 left-1.5 text-[7px] text-neutral-400 font-mono tracking-tight bg-black/60 px-1 py-0.5 rounded-xs pointer-events-none">
          X:{Math.round(clampedX)} Y:{Math.round(clampedY)}
        </div>
      </div>

      {/* Collapsible Mini Legend */}
      {showLegend && (
        <div className="px-2 py-1.5 bg-neutral-950/95 border-t border-neutral-800 text-[7.5px] text-neutral-300 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-red-500 font-bold">♥</span> Frisk
            </span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400 font-bold">★</span> Salvar
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-sky-400 font-bold">■</span> Porta
            </span>
            <span className="flex items-center gap-1">
              <span className="text-purple-400 font-bold">●</span> NPC
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-neutral-900">
            <span>[M] Ocultar</span>
            <span className="text-yellow-400/90 font-mono">Ruínas</span>
          </div>
        </div>
      )}
    </div>
  );
};
