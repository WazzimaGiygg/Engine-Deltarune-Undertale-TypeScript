import React, { useEffect, useRef, useState } from 'react';
import { gameState, PositionState } from '../engine/gameState';

interface ZoneMeta {
  zone: string;
  flavor: string;
}

const ZONE_METAS: Record<string, ZoneMeta> = {
  room_awakening: {
    zone: 'RUÍNAS SUBTERRÂNEAS',
    flavor: 'Flores douradas amorteceram sua queda do mundo da superfície.',
  },
  room_flowey: {
    zone: 'RUÍNAS SUBTERRÂNEAS',
    flavor: 'Uma clareira solitária sob o feixe suave de luz ancestral.',
  },
  room_toriel_entrance: {
    zone: 'RUÍNAS · ENTRADA',
    flavor: 'A imponente arquitetura púrpura e o símbolo do Delta Rune.',
  },
  ruins_switch_chamber: {
    zone: 'RUÍNAS · CATACUMBAS',
    flavor: 'Mecanismos ancestrais e alavancas marcadas com giz por Toriel.',
  },
  ruins_dummy_room: {
    zone: 'RUÍNAS · CATACUMBAS',
    flavor: 'Uma câmara pacífica de instrução sobre a arte da conversação.',
  },
  ruins_puzzle: {
    zone: 'RUÍNAS · CATACUMBAS',
    flavor: 'Espinhos retráteis e enigmas deixados pelos monstros das Ruínas.',
  },
  ruins_long_hall: {
    zone: 'RUÍNAS · CATACUMBAS',
    flavor: 'Um corredor extenso que testa sua independência e bravura.',
  },
  ruins_spider_bakery: {
    zone: 'RUÍNAS · REFÚGIO',
    flavor: 'Teias brilhantes e o doce aroma de quitutes preparados por aranhas.',
  },
  ruins_secret_catacomb: {
    zone: 'RUÍNAS · ESCONDERIJO',
    flavor: 'A câmara oculta do aspirante a guarda real e fã de espaguete.',
  },
  room_toriel_house_exterior: {
    zone: 'CASA DE TORIEL',
    flavor: 'Um lar acolhedor cercado por árvores de folhas carmesins.',
  },
  room_toriel_house_interior: {
    zone: 'CASA DE TORIEL',
    flavor: 'O calor reconfortante de uma lareira acesa e cheiro de torta.',
  },
  room_toriel_hallway: {
    zone: 'CASA DE TORIEL',
    flavor: 'O silêncio pacífico do corredor residencial das Ruínas.',
  },
  room_player_bedroom: {
    zone: 'CASA DE TORIEL',
    flavor: 'Um quarto aconchegante com uma cama sob medida para você.',
  },
  room_toriel_bedroom: {
    zone: 'CASA DE TORIEL',
    flavor: 'Diários de trocadilhos e enciclopédias sobre caracóis.',
  },
  room_toriel_basement: {
    zone: 'RUÍNAS · SUBTERRÂNEO',
    flavor: 'O caminho frio e imponente que leva às portas de Snowdin.',
  },
};

export const LocationBannerOverlay: React.FC = () => {
  const [posState, setPosState] = useState<PositionState>(() => gameState.getPositionState());
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>('');
  const [currentZone, setCurrentZone] = useState<string>('RUÍNAS');
  const [currentFlavor, setCurrentFlavor] = useState<string>('');

  const lastRoomRef = useRef<string>('');
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBanner = (roomId: string, roomName?: string) => {
    const meta = ZONE_METAS[roomId] || {
      zone: 'RUÍNAS',
      flavor: 'Explore os corredores ancestrais do Subterrâneo.',
    };

    const resolvedName = roomName || gameState.getCurrentRoomName() || 'Ruínas Antigas';

    setCurrentLocationName(resolvedName);
    setCurrentZone(meta.zone);
    setCurrentFlavor(meta.flavor);
    setIsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Display banner for 3.2 seconds then fade out smoothly
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3200);
  };

  useEffect(() => {
    const unsub = gameState.subscribePosition((newPos) => {
      setPosState(newPos);

      // Only display location banner when in the OverworldScene
      if (newPos.activeScene !== 'OverworldScene') {
        setIsVisible(false);
        return;
      }

      // If entered a new room or first load
      if (newPos.room && newPos.room !== lastRoomRef.current) {
        lastRoomRef.current = newPos.room;
        triggerBanner(newPos.room, newPos.roomName);
      }
    });

    // Initial trigger on mount if in overworld
    const initialPos = gameState.getPositionState();
    if (initialPos.activeScene === 'OverworldScene' && initialPos.room) {
      lastRoomRef.current = initialPos.room;
      triggerBanner(initialPos.room, initialPos.roomName);
    }

    return () => {
      unsub();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (posState.activeScene !== 'OverworldScene') {
    return null;
  }

  return (
    <div
      className={`absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20 font-pixel transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95'
      }`}
    >
      <div className="bg-black/95 border-2 border-white px-5 py-3 shadow-[0_0_24px_rgba(255,255,255,0.3)] text-center min-w-[280px] max-w-[460px] rounded-none">
        {/* Zone Category Subtitle */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-red-500 text-[10px] animate-pulse">♥</span>
          <span className="text-[9px] font-bold tracking-widest text-yellow-300 uppercase">
            {currentZone}
          </span>
          <span className="text-red-500 text-[10px] animate-pulse">♥</span>
        </div>

        {/* Room / Location Main Name */}
        <h2 className="text-sm sm:text-base font-bold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {currentLocationName}
        </h2>

        {/* Subtle Undertale Atmosphere Flavor Quote */}
        {currentFlavor && (
          <p className="text-[9px] text-neutral-400 mt-1 italic border-t border-neutral-900 pt-1 leading-snug">
            * {currentFlavor}
          </p>
        )}
      </div>
    </div>
  );
};
