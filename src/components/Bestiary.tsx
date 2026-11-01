import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENEMIES } from '../data/defaultData';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';
import { EnemyAct, EnemyData, MonsterBestiaryData } from '../types/game';

export interface BestiaryMonsterEntry {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  atk: number;
  def: number;
  expReward: number;
  goldReward: number;
  checkText: string;
  loreNote: string;
  tacticsNote: string;
  acts: EnemyAct[];
  bulletPatterns: string[];
  dialogueQuotes: string[];
  location: string;
  encounterData: MonsterBestiaryData;
  isEncountered: boolean;
}

const MONSTER_LORE_NOTES: Record<
  string,
  {
    title: string;
    location: string;
    loreNote: string;
    tacticsNote: string;
  }
> = {
  dummy: {
    title: 'Manequim de Treinamento',
    location: 'Câmara de Treino das Ruínas',
    loreNote:
      'Um boneco inanimado feito de pano de algodão grosso e estopa, montado sobre um pedestal de carvalho. Toriel o colocou nas Ruínas para instruir humanos sobre a arte pacífica da conversação com monstros.',
    tacticsNote:
      'Não possui ataques e não concede EXP. Se você apenas conversar amigavelmente ou abraçá-lo com gentileza, Toriel ficará imensamente orgulhosa de sua doçura.',
  },
  froggit: {
    title: 'Sapo Filosófico das Ruínas',
    location: 'Corredores & Salas das Ruínas',
    loreNote:
      'Uma criatura anfíbia icônica do subterrâneo. Embora tenha dentes pontiagudos e olhar sério, é surpreendentemente tímido e questionador sobre o cosmos. Seus coaxares ocultam reflexões existenciais profundas.',
    tacticsNote:
      'Dispara pequenas moscas mágicas e saltos rápidos. Elogiar suas manchas ou coaxar de volta estabelece respeito mútuo instantâneo, permitindo poupá-lo.',
  },
  sir_ossos: {
    title: 'Aspirante da Guarda Real',
    location: 'Salão dos Espinhos & Câmara Secreta',
    loreNote:
      'Um guerreiro esqueleto esguio e de sorriso radiante. Usa uma armadura leve estilosa e um cachecol vermelho esvoaçante. Seu maior sonho é cozinhar um espaguete magistral e ser aceito na Guarda Real por Asgore.',
    tacticsNote:
      'Utiliza ossos deslizantes e magia azul! Se o ataque ou o osso brilhar em azul, fique TOTALMENTE PARADO para não sofrer nenhum dano. Elogiar seu molho de macarrão amolece seu coração imediatamente.',
  },
  deltajester: {
    title: 'Bufão Caótico das Sombras',
    location: 'Catacumbas Esquecidas das Ruínas',
    loreNote:
      'Um bobo da corte enigmático e hiperativo que desafia as leis da gravidade. Ele acredita que o mundo inteiro é apenas um parque de diversões caótico onde todos deveriam dançar sem parar.',
    tacticsNote:
      'Dispara estrelas explosivas em espiral e cartas giratórias velozes. Dançar em harmonia com suas piruetas ou desafiá-lo com enigmas e charadas deixa-o fascinado e apto para poupar.',
  },
  flowey: {
    title: 'A Flor Dourada & Hostil',
    location: 'Entrada das Ruínas',
    loreNote:
      'Uma pequena flor senciente de pétalas douradas e expressão aparentemente dócil. Rapidamente revela sua crença implacável de "Neste mundo é MATAR ou MORRER!". Dispara "Pétalas da Amizade" letais em anel cerrado.',
    tacticsNote:
      'Seu confronto inicial exige resiliência e foco no desvio até a intervenção flamejante salvadora de Toriel. Não é possível derrotá-lo com armas comuns durante a emboscada inicial das Ruínas.',
  },
};

interface BestiaryProps {
  onClose?: () => void;
  inModal?: boolean;
}

export const Bestiary: React.FC<BestiaryProps> = ({ onClose, inModal = false }) => {
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('');
  const [showUndiscovered, setShowUndiscovered] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'defeats' | 'info' | 'tactics' | 'stats'>('defeats');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load all monsters and filter by encountered state
  const bestiaryEntries = useMemo(() => {
    const ids = ['dummy', 'froggit', 'sir_ossos', 'deltajester', 'flowey'];
    const bestiaryMap = gameState.getBestiaryData();

    return ids.map((id): BestiaryMonsterEntry => {
      let enemyData: EnemyData;

      if (id === 'flowey') {
        enemyData = {
          id: 'flowey',
          name: 'Flowey',
          maxHp: 99,
          hp: 99,
          atk: 9,
          def: 0,
          expReward: 0,
          goldReward: 0,
          spriteKey: 'flowey',
          dialogueLines: [
            'Neste mundo, é MATAR ou MORRER!',
            'Você realmente é um idiota!',
            'Achou mesmo que conseguiria escapar?!',
          ],
          acts: [
            {
              name: 'Checar',
              description: 'Observar a misteriosa flor amarela.',
              mercyGain: 0,
              resultText: '* FLOWEY - ATK 9 DEF 0.\n* Uma flor dourada com um sorriso calculista. Não demonstra compaixão.',
              enemyReply: 'Você realmente acha que me conhece?',
            },
            {
              name: 'Pedir Piedade',
              description: 'Suplicar por clemência.',
              mercyGain: 0,
              resultText: '* Você implora por misericórdia.\n* Flowey solta uma risada sinistra: "Piedade?! Que piada!"',
              enemyReply: 'Neste mundo é MATAR ou MORRER!',
            },
          ],
          mercyProgress: 0,
          canSpare: false,
          introText: '* Flowey bloqueia seu caminho com um sorriso sinistro!',
          bulletPatterns: ['friendliness_pellets'],
        };
      } else {
        const factory = ENEMIES[id];
        enemyData = factory
          ? factory()
          : {
              id,
              name: id,
              maxHp: 20,
              hp: 20,
              atk: 2,
              def: 1,
              expReward: 10,
              goldReward: 10,
              spriteKey: '',
              dialogueLines: [],
              acts: [],
              mercyProgress: 0,
              canSpare: true,
              introText: '',
              bulletPatterns: [],
            };
      }

      const lore = MONSTER_LORE_NOTES[id] || {
        title: 'Criatura das Ruínas',
        location: 'Ruínas Antigas',
        loreNote: 'Um habitante do subterrâneo com magia única.',
        tacticsNote: 'Observe os padrões de projéteis e aja com prudência.',
      };

      const checkAct = enemyData.acts.find((a) => a.name.toLowerCase() === 'checar');
      const checkText =
        checkAct?.resultText ||
        `* ${enemyData.name.toUpperCase()} - ATK ${enemyData.atk} DEF ${enemyData.def}.`;

      const isEncountered = gameState.isMonsterEncountered(id);
      const encRecord = bestiaryMap[id] || {
        encounters: isEncountered ? 1 : 0,
        defeated: 0,
        spared: 0,
        fled: 0,
        lastEncounterTime: Date.now(),
      };

      return {
        id,
        name: enemyData.name,
        title: lore.title,
        maxHp: enemyData.maxHp,
        atk: enemyData.atk,
        def: enemyData.def,
        expReward: enemyData.expReward,
        goldReward: enemyData.goldReward,
        checkText,
        loreNote: lore.loreNote,
        tacticsNote: lore.tacticsNote,
        acts: enemyData.acts,
        bulletPatterns: enemyData.bulletPatterns,
        dialogueQuotes: enemyData.dialogueLines,
        location: lore.location,
        encounterData: encRecord,
        isEncountered,
      };
    });
  }, []);

  const encounteredMonsters = useMemo(
    () => bestiaryEntries.filter((m) => m.isEncountered),
    [bestiaryEntries]
  );

  // Set default selection
  useEffect(() => {
    if (!selectedMonsterId) {
      if (encounteredMonsters.length > 0) {
        setSelectedMonsterId(encounteredMonsters[0].id);
      } else if (bestiaryEntries.length > 0) {
        setSelectedMonsterId(bestiaryEntries[0].id);
      }
    } else {
      const stillExists = bestiaryEntries.some((m) => m.id === selectedMonsterId);
      if (!stillExists && encounteredMonsters.length > 0) {
        setSelectedMonsterId(encounteredMonsters[0].id);
      }
    }
  }, [encounteredMonsters, bestiaryEntries, selectedMonsterId]);

  const selectedMonster =
    bestiaryEntries.find((m) => m.id === selectedMonsterId) || encounteredMonsters[0] || null;

  // Global aggregate stats for defeated enemies
  const globalStats = useMemo(() => {
    let totalDefeated = 0;
    let totalSpared = 0;
    let totalFled = 0;
    let totalEncounters = 0;
    let totalExpFromKills = 0;
    let totalGoldFromEncounters = 0;

    bestiaryEntries.forEach((m) => {
      totalDefeated += m.encounterData.defeated;
      totalSpared += m.encounterData.spared;
      totalFled += m.encounterData.fled;
      totalEncounters += m.encounterData.encounters;
      totalExpFromKills += m.encounterData.defeated * m.expReward;
      totalGoldFromEncounters += (m.encounterData.defeated + m.encounterData.spared) * m.goldReward;
    });

    const catalogedCount = encounteredMonsters.length;
    const totalCount = bestiaryEntries.length;

    return {
      totalDefeated,
      totalSpared,
      totalFled,
      totalEncounters,
      totalExpFromKills,
      totalGoldFromEncounters,
      catalogedCount,
      totalCount,
    };
  }, [bestiaryEntries, encounteredMonsters]);

  // Keyboard navigation within bestiary
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      const listToNav = showUndiscovered ? bestiaryEntries : encounteredMonsters;
      if (listToNav.length === 0) return;

      const currentIdx = listToNav.findIndex((m) => m.id === selectedMonsterId);

      if (key === 'ARROWUP' || key === 'W') {
        e.preventDefault();
        soundManager.playMenuMove();
        const nextIdx = (currentIdx - 1 + listToNav.length) % listToNav.length;
        setSelectedMonsterId(listToNav[nextIdx].id);
      } else if (key === 'ARROWDOWN' || key === 'S') {
        e.preventDefault();
        soundManager.playMenuMove();
        const nextIdx = (currentIdx + 1) % listToNav.length;
        setSelectedMonsterId(listToNav[nextIdx].id);
      } else if (key === '1') {
        setActiveSubTab('defeats');
        soundManager.playMenuMove();
      } else if (key === '2') {
        setActiveSubTab('info');
        soundManager.playMenuMove();
      } else if (key === '3') {
        setActiveSubTab('tactics');
        soundManager.playMenuMove();
      } else if (key === '4') {
        setActiveSubTab('stats');
        soundManager.playMenuMove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMonsterId, showUndiscovered, bestiaryEntries, encounteredMonsters]);

  // Render authentic pixel art in canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedMonster) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Dark retro grid background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, w, h);

    // Subtle CRT scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    if (!selectedMonster.isEncountered) {
      // Silhouette of mystery
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(w / 2 - 24, h / 2 - 32, 48, 64);
      ctx.fillStyle = '#444444';
      ctx.font = '28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', w / 2, h / 2);
      return;
    }

    const id = selectedMonster.id;

    if (id === 'froggit') {
      // Froggit pixel sprite
      ctx.fillStyle = '#ffffff';

      // Antennas
      ctx.fillRect(w / 2 - 20, h / 2 - 40, 6, 16);
      ctx.fillRect(w / 2 + 14, h / 2 - 40, 6, 16);
      ctx.fillRect(w / 2 - 24, h / 2 - 44, 12, 6);
      ctx.fillRect(w / 2 + 12, h / 2 - 44, 12, 6);

      // Main body
      ctx.fillRect(w / 2 - 32, h / 2 - 24, 64, 40);
      ctx.fillRect(w / 2 - 38, h / 2 - 16, 76, 28);

      // Big black eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 20, h / 2 - 18, 10, 12);
      ctx.fillRect(w / 2 + 10, h / 2 - 18, 10, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 18, h / 2 - 16, 4, 4);
      ctx.fillRect(w / 2 + 12, h / 2 - 16, 4, 4);

      // Mouth
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 14, h / 2 + 4, 28, 4);
      ctx.fillRect(w / 2 - 16, h / 2 + 2, 4, 4);
      ctx.fillRect(w / 2 + 12, h / 2 + 2, 4, 4);

      // Legs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 44, h / 2 + 12, 14, 18);
      ctx.fillRect(w / 2 + 30, h / 2 + 12, 14, 18);
      ctx.fillRect(w / 2 - 46, h / 2 + 26, 20, 8);
      ctx.fillRect(w / 2 + 26, h / 2 + 26, 20, 8);
    } else if (id === 'sir_ossos') {
      // Sir Ossos (Papyrus style skull & scarf)
      // Skull
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 16, h / 2 - 46, 32, 26);
      ctx.fillRect(w / 2 - 20, h / 2 - 38, 40, 14);

      // Eye sockets & toothy smile
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 12, h / 2 - 38, 8, 10);
      ctx.fillRect(w / 2 + 4, h / 2 - 38, 8, 10);
      ctx.fillRect(w / 2 - 10, h / 2 - 24, 20, 3);
      ctx.fillRect(w / 2 - 8, h / 2 - 25, 3, 5);
      ctx.fillRect(w / 2 - 2, h / 2 - 25, 3, 5);
      ctx.fillRect(w / 2 + 4, h / 2 - 25, 3, 5);

      // Red scarf!
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(w / 2 - 24, h / 2 - 20, 48, 10);
      ctx.fillRect(w / 2 + 16, h / 2 - 14, 22, 18);
      ctx.fillRect(w / 2 + 26, h / 2 + 2, 16, 12);

      // Battle Body / Armor
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 16, h / 2 - 10, 32, 28);
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 10, h / 2 + 4, 20, 4);

      // Bones spine & legs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 5, h / 2 + 18, 10, 14);
      ctx.fillRect(w / 2 - 14, h / 2 + 30, 8, 20);
      ctx.fillRect(w / 2 + 6, h / 2 + 30, 8, 20);

      // Red boots
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(w / 2 - 18, h / 2 + 46, 14, 10);
      ctx.fillRect(w / 2 + 4, h / 2 + 46, 14, 10);
    } else if (id === 'deltajester') {
      // Bufão Caótico
      // Jester Hat (3 horns with gold bells)
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(w / 2 - 8, h / 2 - 46, 16, 20);
      ctx.fillRect(w / 2 - 26, h / 2 - 40, 20, 16);
      ctx.fillRect(w / 2 + 6, h / 2 - 40, 20, 16);

      // Bells
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(w / 2 - 32, h / 2 - 38, 6, 6);
      ctx.fillRect(w / 2 - 3, h / 2 - 50, 6, 6);
      ctx.fillRect(w / 2 + 26, h / 2 - 38, 6, 6);

      // Round Pale Face
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(w / 2 - 18, h / 2 - 26, 36, 24);

      // Wicked Eyes and Smile
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 12, h / 2 - 20, 8, 8);
      ctx.fillRect(w / 2 + 4, h / 2 - 20, 8, 8);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(w / 2 - 10, h / 2 - 18, 4, 4);
      ctx.fillRect(w / 2 + 6, h / 2 - 18, 4, 4);

      // Wide crescent smile
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 14, h / 2 - 8, 28, 4);
      ctx.fillRect(w / 2 - 16, h / 2 - 11, 4, 4);
      ctx.fillRect(w / 2 + 12, h / 2 - 11, 4, 4);

      // Cape and Ruffle
      ctx.fillStyle = '#34495e';
      ctx.fillRect(w / 2 - 22, h / 2 - 2, 44, 26);
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(w / 2 - 16, h / 2 + 4, 32, 16);

      // Floating card/star sparkle
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(w / 2 - 38, h / 2 + 10, 6, 6);
      ctx.fillRect(w / 2 + 32, h / 2 - 10, 6, 6);
    } else if (id === 'dummy') {
      // Manequim
      // Burlap Dummy head & body
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(w / 2 - 16, h / 2 - 40, 32, 28);
      ctx.fillRect(w / 2 - 20, h / 2 - 12, 40, 32);

      // Button eyes (x eyes)
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 10, h / 2 - 32, 6, 6);
      ctx.fillRect(w / 2 + 4, h / 2 - 32, 6, 6);

      // Stitched mouth
      ctx.fillRect(w / 2 - 8, h / 2 - 20, 16, 2);
      ctx.fillRect(w / 2 - 6, h / 2 - 22, 2, 6);
      ctx.fillRect(w / 2 + 4, h / 2 - 22, 2, 6);

      // Cloth patch on body
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(w / 2 - 12, h / 2 + 2, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 11, h / 2 + 3, 6, 6);

      // Wooden stand base
      ctx.fillStyle = '#795548';
      ctx.fillRect(w / 2 - 4, h / 2 + 20, 8, 22);
      ctx.fillRect(w / 2 - 24, h / 2 + 38, 48, 8);
    } else if (id === 'flowey') {
      // Flowey pixel sprite
      // Green Stem & Leaves
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(w / 2 - 4, h / 2 + 8, 8, 30);
      // Left Leaf
      ctx.fillRect(w / 2 - 24, h / 2 + 18, 20, 8);
      ctx.fillRect(w / 2 - 20, h / 2 + 14, 12, 6);
      // Right Leaf
      ctx.fillRect(w / 2 + 4, h / 2 + 22, 20, 8);
      ctx.fillRect(w / 2 + 8, h / 2 + 18, 12, 6);

      // Golden Petals (6 large surrounding petals)
      ctx.fillStyle = '#f1c40f';
      // Top
      ctx.fillRect(w / 2 - 10, h / 2 - 46, 20, 16);
      // Bottom
      ctx.fillRect(w / 2 - 10, h / 2 + 2, 20, 14);
      // Top-Left & Bottom-Left
      ctx.fillRect(w / 2 - 38, h / 2 - 34, 18, 16);
      ctx.fillRect(w / 2 - 38, h / 2 - 12, 18, 16);
      // Top-Right & Bottom-Right
      ctx.fillRect(w / 2 + 20, h / 2 - 34, 18, 16);
      ctx.fillRect(w / 2 + 20, h / 2 - 12, 18, 16);

      // White Face
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 20, h / 2 - 30, 40, 32);

      // Wicked Eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 14, h / 2 - 22, 8, 10);
      ctx.fillRect(w / 2 + 6, h / 2 - 22, 8, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 12, h / 2 - 20, 3, 3);
      ctx.fillRect(w / 2 + 8, h / 2 - 20, 3, 3);

      // Grin
      ctx.fillStyle = '#000000';
      ctx.fillRect(w / 2 - 12, h / 2 - 8, 24, 4);
      ctx.fillRect(w / 2 - 14, h / 2 - 11, 4, 5);
      ctx.fillRect(w / 2 + 10, h / 2 - 11, 4, 5);
      ctx.fillRect(w / 2 - 6, h / 2 - 4, 12, 3);
    }
  }, [selectedMonster]);

  const formatLastEncounter = (timestamp?: number) => {
    if (!timestamp) return 'Sem registro';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="w-full text-white font-pixel">
      {/* Bestiary Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-neutral-700 pb-3 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-sm">📖</span>
          <h2 className="text-sm sm:text-base font-bold text-yellow-300 tracking-wider">
            BESTIÁRIO & REGISTRO DE INIMIGOS
          </h2>
          <span className="text-[10px] px-2 py-0.5 border border-yellow-600 bg-yellow-950/50 text-yellow-300 font-bold">
            {globalStats.catalogedCount} / {globalStats.totalCount} CATALOGADOS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playMenuMove();
              setShowUndiscovered((prev) => !prev);
            }}
            className={`text-[10px] px-2 py-1 border transition-colors cursor-pointer ${
              showUndiscovered
                ? 'border-cyan-400 text-cyan-300 bg-neutral-900'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {showUndiscovered ? 'Exibindo Silhuetas' : 'Ocultar Não Vistos'}
          </button>

          {inModal && onClose && (
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onClose();
              }}
              className="text-[10px] px-2 py-1 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            >
              [X] Fechar
            </button>
          )}
        </div>
      </div>

      {/* Global Defeated Enemies & Combat Statistics Banner */}
      <div className="mb-4 p-3 border-2 border-neutral-800 bg-black/80 shadow-[0_0_12px_rgba(0,0,0,0.8)]">
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-1.5 mb-2 gap-2">
          <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <span>⚔️</span>
            <span>ESTATÍSTICAS GERAIS DE INIMIGOS DERROTADOS & CONFRONTOS</span>
          </span>
          <span className="text-[9px] text-neutral-400">
            Conduta Atual:{' '}
            <span
              className={`font-bold ${
                globalStats.totalDefeated === 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {globalStats.totalDefeated === 0
                ? 'PACIFISTA PURO (0 KILLS)'
                : `NEUTRO / COMBATIVO (${globalStats.totalDefeated} ABATIDOS)`}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="border border-red-900/60 bg-red-950/20 p-2">
            <span className="text-[8px] sm:text-[9px] text-red-400 block font-bold">
              INIMIGOS ABATIDOS
            </span>
            <span className="text-sm sm:text-base font-bold text-red-300">
              {globalStats.totalDefeated}
            </span>
          </div>

          <div className="border border-emerald-900/60 bg-emerald-950/20 p-2">
            <span className="text-[8px] sm:text-[9px] text-emerald-400 block font-bold">
              MONSTROS POUPADOS
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-300">
              {globalStats.totalSpared}
            </span>
          </div>

          <div className="border border-blue-900/60 bg-blue-950/20 p-2">
            <span className="text-[8px] sm:text-[9px] text-blue-400 block font-bold">
              TOTAL DE FUGAS
            </span>
            <span className="text-sm sm:text-base font-bold text-blue-300">
              {globalStats.totalFled}
            </span>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/40 p-2">
            <span className="text-[8px] sm:text-[9px] text-neutral-400 block font-bold">
              TOTAL DE BATALHAS
            </span>
            <span className="text-sm sm:text-base font-bold text-white">
              {globalStats.totalEncounters}
            </span>
          </div>

          <div className="border border-purple-900/60 bg-purple-950/20 p-2">
            <span className="text-[8px] sm:text-[9px] text-purple-400 block font-bold">
              EXP DE DERROTAS
            </span>
            <span className="text-sm sm:text-base font-bold text-purple-300">
              {globalStats.totalExpFromKills} XP
            </span>
          </div>

          <div className="border border-yellow-900/60 bg-yellow-950/20 p-2">
            <span className="text-[8px] sm:text-[9px] text-yellow-400 block font-bold">
              OURO OBTIDO
            </span>
            <span className="text-sm sm:text-base font-bold text-yellow-300">
              {globalStats.totalGoldFromEncounters} G
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Monster Index on Left, Detailed Dossier on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Monster Selector */}
        <div className="md:col-span-5 flex flex-col gap-2">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>ÍNDICE DE CRIATURAS:</span>
            <span className="text-[9px] text-neutral-500">Navegue com W, S ou Setas</span>
          </div>

          {/* List of Monsters */}
          <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
            {(showUndiscovered ? bestiaryEntries : encounteredMonsters).map((m) => {
              const isSelected = selectedMonster?.id === m.id;
              const isDiscovered = m.isEncountered;

              let statusBadge = (
                <span className="text-[8px] px-1 py-0.5 border border-neutral-700 text-neutral-500">
                  NÃO VISTO
                </span>
              );

              if (isDiscovered) {
                if (m.encounterData.defeated > 0) {
                  statusBadge = (
                    <span className="text-[8px] px-1.5 py-0.5 border border-red-500 text-red-300 bg-red-950/50 font-bold">
                      ABATIDO x{m.encounterData.defeated}
                    </span>
                  );
                } else if (m.encounterData.spared > 0) {
                  statusBadge = (
                    <span className="text-[8px] px-1.5 py-0.5 border border-emerald-500 text-emerald-300 bg-emerald-950/50 font-bold">
                      POUPADO x{m.encounterData.spared}
                    </span>
                  );
                } else if (m.encounterData.fled > 0) {
                  statusBadge = (
                    <span className="text-[8px] px-1.5 py-0.5 border border-blue-500 text-blue-300 bg-blue-950/50 font-bold">
                      FUGIU x{m.encounterData.fled}
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="text-[8px] px-1.5 py-0.5 border border-yellow-500 text-yellow-300 bg-yellow-950/50 font-bold">
                      AVISTADO
                    </span>
                  );
                }
              }

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    soundManager.playMenuSelect();
                    setSelectedMonsterId(m.id);
                  }}
                  className={`w-full p-2.5 text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-yellow-400 bg-neutral-900 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.2)]'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600 hover:bg-neutral-900 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        isSelected ? 'text-red-500 animate-pulse' : 'text-transparent'
                      }`}
                    >
                      ♥
                    </span>
                    <span className="text-xs font-bold">
                      {isDiscovered ? m.name : '??? (Não Descoberto)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isDiscovered && m.encounterData.encounters > 0 && (
                      <span className="text-[9px] text-neutral-400">
                        x{m.encounterData.encounters}
                      </span>
                    )}
                    {statusBadge}
                  </div>
                </button>
              );
            })}

            {!showUndiscovered && encounteredMonsters.length === 0 && (
              <div className="p-4 border border-dashed border-neutral-800 text-center bg-neutral-950">
                <span className="text-xs text-neutral-400 block mb-2 leading-relaxed">
                  * Nenhum monstro catalogado ainda.
                </span>
                <span className="text-[10px] text-neutral-500 block leading-relaxed mb-3">
                  Encontre criaturas explorando os corredores das Ruínas ou desafie o Manequim de
                  treino com Toriel.
                </span>
                <button
                  onClick={() => {
                    soundManager.playMenuSelect();
                    setShowUndiscovered(true);
                  }}
                  className="text-[10px] px-2 py-1 border border-yellow-500 text-yellow-300 hover:bg-yellow-950/40 cursor-pointer"
                >
                  Exibir Todas as Criaturas das Ruínas
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Monster Dossier */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {selectedMonster ? (
            <div className="border border-neutral-800 bg-neutral-950 p-4 min-h-[400px] flex flex-col justify-between">
              <div>
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-3 mb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-yellow-300">
                        {selectedMonster.isEncountered
                          ? selectedMonster.name.toUpperCase()
                          : '??? DESCONHECIDO'}
                      </h3>
                      {selectedMonster.isEncountered && (
                        <span className="text-[10px] text-neutral-400">
                          [{selectedMonster.title}]
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Habitat: {selectedMonster.location}
                    </span>
                  </div>

                  {/* Sub-tabs: Derrotas, Lore, Táticas, Padrões */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['defeats', 'info', 'tactics', 'stats'] as const).map((tab) => {
                      const labels = {
                        defeats: 'Derrotas & Lutas',
                        info: 'Lore',
                        tactics: 'Ações (ACT)',
                        stats: 'Projéteis',
                      };
                      return (
                        <button
                          key={tab}
                          onClick={() => {
                            soundManager.playMenuMove();
                            setActiveSubTab(tab);
                          }}
                          className={`text-[9px] px-2 py-1 border transition-colors cursor-pointer ${
                            activeSubTab === tab
                              ? 'border-yellow-400 bg-neutral-900 text-yellow-300 font-bold'
                              : 'border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monster Canvas & Core Combat Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
                  {/* Pixel Art Canvas */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center border border-neutral-800 bg-black p-2">
                    <canvas
                      ref={canvasRef}
                      width={128}
                      height={128}
                      className="w-28 h-28 pixelated object-contain"
                    />
                    <span className="text-[9px] text-neutral-500 mt-1">
                      {selectedMonster.isEncountered ? 'Registro Visual' : 'Sinal Não Detectado'}
                    </span>
                  </div>

                  {/* Core Combat Stats */}
                  <div className="sm:col-span-7 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="border border-neutral-900 p-2 bg-black/40">
                        <span className="text-[9px] text-neutral-500 block">VIDA MÁXIMA (HP)</span>
                        <span className="text-sm font-bold text-red-400">
                          {selectedMonster.isEncountered ? `${selectedMonster.maxHp} HP` : '???'}
                        </span>
                      </div>
                      <div className="border border-neutral-900 p-2 bg-black/40">
                        <span className="text-[9px] text-neutral-500 block">ATAQUE (ATK)</span>
                        <span className="text-sm font-bold text-orange-400">
                          {selectedMonster.isEncountered ? selectedMonster.atk : '???'}
                        </span>
                      </div>
                      <div className="border border-neutral-900 p-2 bg-black/40">
                        <span className="text-[9px] text-neutral-500 block">DEFESA (DEF)</span>
                        <span className="text-sm font-bold text-blue-400">
                          {selectedMonster.isEncountered ? selectedMonster.def : '???'}
                        </span>
                      </div>
                      <div className="border border-neutral-900 p-2 bg-black/40">
                        <span className="text-[9px] text-neutral-500 block">RECOMPENSA COMBATE</span>
                        <span className="text-sm font-bold text-yellow-400">
                          {selectedMonster.isEncountered
                            ? `${selectedMonster.goldReward}G · ${selectedMonster.expReward}XP`
                            : '???'}
                        </span>
                      </div>
                    </div>

                    {/* Official Check Text */}
                    <div className="mt-2 p-2 border border-neutral-900 bg-black/60 text-[10px] text-neutral-300 leading-relaxed font-mono">
                      <span className="text-yellow-400 font-bold block mb-0.5">DADOS DE CHECAGEM (*CHECK*):</span>
                      {selectedMonster.isEncountered ? (
                        <p className="whitespace-pre-line text-neutral-200">
                          {selectedMonster.checkText}
                        </p>
                      ) : (
                        <p className="text-neutral-500 italic">* Dados ainda não catalogados.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SubTab Content */}
                <div className="border-t border-neutral-800 pt-3">
                  {/* Tab 1: Defeats & Battles Statistics */}
                  {activeSubTab === 'defeats' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-yellow-300 font-bold uppercase">
                          ESTATÍSTICAS BÁSICAS DO INIMIGO:
                        </span>
                        {selectedMonster.isEncountered && (
                          <span className="text-[9px] text-neutral-400">
                            Último Encontro: {formatLastEncounter(selectedMonster.encounterData.lastEncounterTime)}
                          </span>
                        )}
                      </div>

                      {selectedMonster.isEncountered ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="border border-red-950 bg-red-950/30 p-2">
                              <span className="text-[8px] text-red-400 block font-bold">
                                VEZES DERROTADO
                              </span>
                              <span className="text-base font-bold text-red-300">
                                {selectedMonster.encounterData.defeated}
                              </span>
                              <span className="text-[8px] text-neutral-500 block">Abatido / Kill</span>
                            </div>

                            <div className="border border-emerald-950 bg-emerald-950/30 p-2">
                              <span className="text-[8px] text-emerald-400 block font-bold">
                                VEZES POUPADO
                              </span>
                              <span className="text-base font-bold text-emerald-300">
                                {selectedMonster.encounterData.spared}
                              </span>
                              <span className="text-[8px] text-neutral-500 block">Piedade / Mercy</span>
                            </div>

                            <div className="border border-blue-950 bg-blue-950/30 p-2">
                              <span className="text-[8px] text-blue-400 block font-bold">
                                VEZES QUE FUGIU
                              </span>
                              <span className="text-base font-bold text-blue-300">
                                {selectedMonster.encounterData.fled}
                              </span>
                              <span className="text-[8px] text-neutral-500 block">Escapou</span>
                            </div>

                            <div className="border border-neutral-800 bg-neutral-900/50 p-2">
                              <span className="text-[8px] text-neutral-400 block font-bold">
                                TOTAL DE LUTAS
                              </span>
                              <span className="text-base font-bold text-white">
                                {selectedMonster.encounterData.encounters}
                              </span>
                              <span className="text-[8px] text-neutral-500 block">Confrontos</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 border border-neutral-900 bg-black/40">
                              <span className="text-purple-300 font-bold block mb-1">
                                EXP Total Obtido por Derrotas:
                              </span>
                              <span className="text-xs font-mono text-purple-200">
                                {selectedMonster.encounterData.defeated * selectedMonster.expReward} EXP
                              </span>
                              <span className="text-[8px] text-neutral-500 block mt-0.5">
                                ({selectedMonster.expReward} EXP por cada inimigo derrotado)
                              </span>
                            </div>

                            <div className="p-2 border border-neutral-900 bg-black/40">
                              <span className="text-yellow-300 font-bold block mb-1">
                                Ouro Estimado em Lutas:
                              </span>
                              <span className="text-xs font-mono text-yellow-200">
                                {(selectedMonster.encounterData.defeated + selectedMonster.encounterData.spared) *
                                  selectedMonster.goldReward} G
                              </span>
                              <span className="text-[8px] text-neutral-500 block mt-0.5">
                                ({selectedMonster.goldReward} G concedido por resolução pacífica ou combate)
                              </span>
                            </div>
                          </div>

                          <div className="p-2 border border-neutral-900 bg-neutral-900/40 text-[10px] flex items-center justify-between">
                            <span className="text-neutral-400 font-bold">STATUS DE CONDUTA CONTRA O MONSTRO:</span>
                            <span
                              className={`font-bold px-2 py-0.5 border ${
                                selectedMonster.encounterData.defeated > 0
                                  ? 'border-red-500 text-red-300 bg-red-950/40'
                                  : selectedMonster.encounterData.spared > 0
                                  ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40'
                                  : selectedMonster.encounterData.fled > 0
                                  ? 'border-blue-500 text-blue-300 bg-blue-950/40'
                                  : 'border-yellow-500 text-yellow-300 bg-yellow-950/40'
                              }`}
                            >
                              {selectedMonster.encounterData.defeated > 0
                                ? 'LETAL / INIMIGO NEUTRALIZADO'
                                : selectedMonster.encounterData.spared > 0
                                ? 'PACÍFICO / POUPADO COM SUCESSO'
                                : selectedMonster.encounterData.fled > 0
                                ? 'FUGITIVO / CONFLITO EVITADO'
                                : 'AVISTADO RECENTEMENTE'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border border-dashed border-neutral-800 text-center text-[10px] text-neutral-500">
                          * As estatísticas de combate e derrotas deste inimigo serão registradas ao enfrentá-lo em batalha.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Lore */}
                  {activeSubTab === 'info' && (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-neutral-300 leading-relaxed">
                        <span className="text-yellow-300 font-bold block mb-1">
                          ANOTAÇÃO DE CAMPO & PERSONALIDADE:
                        </span>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">
                          {selectedMonster.isEncountered
                            ? selectedMonster.loreNote
                            : '* Esta criatura vaga pelas Ruínas subterrâneas, mas ainda não cruzou seu caminho diretamente. Explore novas salas para registrá-la.'}
                        </p>
                      </div>

                      {selectedMonster.isEncountered && selectedMonster.dialogueQuotes.length > 0 && (
                        <div className="mt-1 p-2 bg-neutral-900/60 border border-neutral-900 text-[10px]">
                          <span className="text-neutral-400 block mb-1 font-bold">
                            FALAS OUVIDAS EM COMBATE:
                          </span>
                          <div className="flex flex-col gap-1 text-neutral-300 italic">
                            {selectedMonster.dialogueQuotes.slice(0, 3).map((q, i) => (
                              <span key={i}>"{q}"</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Tactics */}
                  {activeSubTab === 'tactics' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-yellow-300 font-bold">
                        AÇÕES ESPECIAIS (ACT) & COMO POUPAR:
                      </span>
                      {selectedMonster.isEncountered ? (
                        <>
                          <div className="p-2 border border-neutral-900 bg-neutral-900/40 text-[10px] text-neutral-300">
                            <span className="text-yellow-400 font-bold block mb-0.5">GUIA TÁTICO:</span>
                            <p>{selectedMonster.tacticsNote}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            {selectedMonster.acts.map((act, i) => (
                              <div
                                key={i}
                                className="border border-neutral-800 p-2 bg-black/40 flex flex-col justify-between"
                              >
                                <div>
                                  <span className="text-yellow-300 font-bold block mb-0.5">
                                    ♥ {act.name}
                                  </span>
                                  <span className="text-neutral-400 text-[9px] block">
                                    {act.description}
                                  </span>
                                </div>
                                <div className="mt-1 pt-1 border-t border-neutral-900 flex items-center justify-between text-[8px] text-neutral-500">
                                  <span>Piedade: +{act.mercyGain}%</span>
                                  {act.specialAction && (
                                    <span className="text-orange-400">{act.specialAction}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic">
                          * As ações de interação serão reveladas ao iniciar combate com este monstro.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Bullet Patterns */}
                  {activeSubTab === 'stats' && (
                    <div className="flex flex-col gap-2 text-[10px]">
                      <span className="text-xs text-yellow-300 font-bold">
                        PADRÕES DE ATAQUE MÁGICO (BULLET HELL):
                      </span>
                      {selectedMonster.isEncountered ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {selectedMonster.bulletPatterns.map((pat, i) => {
                              const patternNames: Record<string, string> = {
                                froggit_hops: 'Saltos Rápidos de Sapo',
                                froggit_flies: 'Moscas Giratórias Erráticas',
                                bone_slider: 'Onda Rasteira de Ossos',
                                blue_attack: 'Ataque Azul (Imobilidade Obrigatória)',
                                bone_wave: 'Muralha de Ossos Cadenciada',
                                chaos_stars: 'Chuva de Estrelas em Espiral',
                                spinning_cards: 'Cartas Giratórias Cortantes',
                                laser_cross: 'Cruz de Feixes Laser',
                                dummy_still: 'Imobilidade Silenciosa (Sem Ataque)',
                                friendliness_pellets: 'Pétalas da Amizade (Anel Mortal)',
                              };
                              return (
                                <span
                                  key={i}
                                  className="px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-300 text-[9px]"
                                >
                                  ✦ {patternNames[pat] || pat}
                                </span>
                              );
                            })}
                          </div>

                          <div className="mt-2 p-2.5 border border-neutral-900 bg-black/40 text-[10px]">
                            <span className="text-yellow-400 font-bold block mb-1">
                              RECOMENDAÇÃO DEFENSIVA DE ALMA:
                            </span>
                            <p className="text-neutral-300 text-[9px] leading-relaxed">
                              Mantenha a Alma (♥) no centro da caixa e faça movimentos curtos. Nos
                              ataques azuis de esqueletos, ficar completamente imóvel impede dano. Em
                              emboscadas mortais como a de Flowey, desvie em pequenos arcos até o resgate!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic">
                          * Padrões mágicos desconhecidos.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dossier Footer Hint */}
              <div className="mt-4 pt-2 border-t border-neutral-900 flex items-center justify-between text-[9px] text-neutral-500">
                <span>Dica: Use 1, 2, 3, 4 para alternar entre Derrotas, Lore, Ações e Projéteis.</span>
                <span>Subterrâneo · Guia de Campo</span>
              </div>
            </div>
          ) : (
            <div className="border border-neutral-800 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
              Selecione uma criatura no índice ao lado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
