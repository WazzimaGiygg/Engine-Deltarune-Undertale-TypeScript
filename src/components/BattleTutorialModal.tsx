import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../services/soundSynthesizer';

interface BattleTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BulletHellTip {
  id: string;
  category: 'mecanica' | 'cores' | 'estrategia' | 'mindset';
  title: string;
  badge: string;
  description: string;
  proTip: string;
}

const BULLET_HELL_TIPS: BulletHellTip[] = [
  {
    id: 'hitbox',
    category: 'mecanica',
    title: 'A Hitbox Central da Alma (♥)',
    badge: 'FUNDAMENTAL',
    description:
      'Sua Alma vermelha possui um formato de coração, mas o ponto de detecção de dano (hitbox) fica estritamente no núcleo central.',
    proTip:
      'Você pode "raspar" de raspão as bordas exteriores das balas inimigas sem sofrer dano. Isso permite manobras milimétricas em espaços apertados.',
  },
  {
    id: 'blue_bullets',
    category: 'cores',
    title: 'Ataques Azuis: Fique Imóvel!',
    badge: 'COR AZUL',
    description:
      'Projéteis e lasers de cor azul-clara só causam dano se a sua Alma estiver se movimentando.',
    proTip:
      'Solte todas as teclas de direção quando um projétil azul estiver prestes a te atravessar! Ficar completamente parado faz a bala atravessar seu coração sem machucar.',
  },
  {
    id: 'orange_bullets',
    category: 'cores',
    title: 'Ataques Laranjas: Mova-se Sempre!',
    badge: 'COR LARANJA',
    description:
      'Projéteis de fogo ou energia laranja funcionam de modo oposto aos azuis: eles machucam se você parar.',
    proTip:
      'Mantenha o coração em movimento constante ao atravessar projéteis laranjas. Não hesite — atravesse o rastro laranja sem parar de andar!',
  },
  {
    id: 'green_bullets',
    category: 'cores',
    title: 'Projéteis Verdes: Cura Instantânea!',
    badge: 'COR VERDE',
    description:
      'Alguns monstros (e magias benevolentes) disparam pequenas esferas verde-esmeralda.',
    proTip:
      'Vá em direção a essas balas! Tocar em um projétil verde restaura instantaneamente seus pontos de vida (HP) durante o próprio turno de defesa.',
  },
  {
    id: 'peripheral_vision',
    category: 'mindset',
    title: 'Foco na Alma, Não no Monstro',
    badge: 'VISÃO ESPACIAL',
    description:
      'O erro mais comum de novos jogadores é fixar o olhar no monstro ou nas bordas da caixa de batalha.',
    proTip:
      'Mantenha seu foco 100% concentrado no espaço de 30 pixels ao redor do seu coração (♥). Use visão periférica para notar de onde vêm as balas e busque corredores livres.',
  },
  {
    id: 'micro_tapping',
    category: 'mecanica',
    title: 'Toques Curtos (Micro-Taps)',
    badge: 'PRECISÃO',
    description:
      'Segurar as teclas de movimento pode fazer sua Alma acelerar demais e colidir contra as paredes ou outros tiros.',
    proTip:
      'Dê toques rápidos e rítmicos nas setas/WASD. Movimentar-se aos poucos em pulos de 3 a 5 pixels garante controle cirúrgico.',
  },
  {
    id: 'mercy_peace',
    category: 'estrategia',
    title: 'A Arte da Misericórdia (Piedade)',
    badge: 'PACIFISTA',
    description:
      'Nenhum monstro em Undertale precisa ser destruído para vencer o combate.',
    proTip:
      'Experimente todas as opções em "AGIR" (Checar, Conversar, Elogiar, Confortar). Quando o nome do inimigo mudar para a cor AMARELA no menu PIEDADE, selecione POUPAR!',
  },
  {
    id: 'corners_trap',
    category: 'estrategia',
    title: 'Cuidado com os Cantos da Caixa',
    badge: 'SOBREVIVÊNCIA',
    description:
      'Ficar encurralado nos quatro cantos da caixa de batalha é a causa número 1 de mortes rápidas.',
    proTip:
      'Procure se posicionar no terço inferior-central da caixa, mantendo sempre rotas de fuga para esquerda, direita e para cima.',
  },
];

export function BattleTutorialModal({ isOpen, onClose }: BattleTutorialModalProps) {
  const [activeTab, setActiveTab] = useState<'dica' | 'guia' | 'simulador'>('dica');

  // Daily tip calculation based on day of year
  const getTodayTipIndex = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % BULLET_HELL_TIPS.length;
  };

  const [currentTipIndex, setCurrentTipIndex] = useState(getTodayTipIndex());

  // Practice mini-simulator state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceTime, setPracticeTime] = useState(0);
  const [practiceHits, setPracticeHits] = useState(0);
  const [practiceDodges, setPracticeDodges] = useState(0);

  const soulPosRef = useRef({ x: 150, y: 120 });
  const keysPressedRef = useRef<{ [k: string]: boolean }>({});
  const bulletsRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string; kind: 'normal' | 'orange' | 'blue' | 'green' }>
  >([]);

  // Next Tip action
  const handleNextTip = () => {
    soundManager.playMenuMove();
    setCurrentTipIndex((prev) => (prev + 1) % BULLET_HELL_TIPS.length);
  };

  // Switch tabs
  const handleSelectTab = (tab: 'dica' | 'guia' | 'simulador') => {
    soundManager.playMenuSelect();
    setActiveTab(tab);
    if (tab === 'simulador') {
      startPractice();
    } else {
      setPracticeActive(false);
    }
  };

  const startPractice = () => {
    soulPosRef.current = { x: 150, y: 120 };
    bulletsRef.current = [];
    setPracticeActive(true);
    setPracticeTime(0);
    setPracticeHits(0);
    setPracticeDodges(0);
  };

  // Keyboard listener for simulator
  useEffect(() => {
    if (!isOpen || activeTab !== 'simulador') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault();
      }
      keysPressedRef.current[k] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressedRef.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, activeTab]);

  // Mini-simulator loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'simulador' || !practiceActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let spawnTimer = 0;
    let hitCooldown = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      setPracticeTime((t) => t + dt);
      if (hitCooldown > 0) hitCooldown -= dt;

      // Soul movement
      const speed = 150;
      let dx = 0;
      let dy = 0;
      const keys = keysPressedRef.current;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      const soul = soulPosRef.current;
      soul.x = Math.max(12, Math.min(288, soul.x + dx * speed * dt));
      soul.y = Math.max(12, Math.min(168, soul.y + dy * speed * dt));

      // Spawner
      spawnTimer += dt;
      if (spawnTimer > 0.45) {
        spawnTimer = 0;
        const side = Math.floor(Math.random() * 3); // 0: top, 1: left, 2: right
        let bx = 0;
        let by = 0;
        let bvx = 0;
        let bvy = 0;

        const bulletTypeRoll = Math.random();
        let kind: 'normal' | 'orange' | 'blue' | 'green' = 'normal';
        let color = '#ffffff';

        if (bulletTypeRoll < 0.12) {
          kind = 'blue';
          color = '#00f0ff';
        } else if (bulletTypeRoll < 0.24) {
          kind = 'orange';
          color = '#ff9900';
        } else if (bulletTypeRoll < 0.32) {
          kind = 'green';
          color = '#00ff66';
        }

        if (side === 0) {
          bx = 20 + Math.random() * 260;
          by = 0;
          bvx = (Math.random() - 0.5) * 60;
          bvy = 75 + Math.random() * 70;
        } else if (side === 1) {
          bx = 0;
          by = 20 + Math.random() * 140;
          bvx = 75 + Math.random() * 70;
          bvy = (Math.random() - 0.5) * 60;
        } else {
          bx = 300;
          by = 20 + Math.random() * 140;
          bvx = -(75 + Math.random() * 70);
          bvy = (Math.random() - 0.5) * 60;
        }

        bulletsRef.current.push({
          x: bx,
          y: by,
          vx: bvx,
          vy: bvy,
          radius: kind === 'normal' ? 4 : 5,
          color,
          kind,
        });
      }

      // Update bullets
      const remaining: typeof bulletsRef.current = [];
      const isMoving = dx !== 0 || dy !== 0;

      bulletsRef.current.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Check collision with Soul center
        const dist = Math.hypot(b.x - soul.x, b.y - soul.y);
        const hitDistance = b.radius + 3.5; // tight Undertale hitbox

        if (dist < hitDistance) {
          // Process hit according to color
          if (b.kind === 'green') {
            soundManager.playSave();
            setPracticeDodges((d) => d + 2);
            return; // absorbed
          }

          if (b.kind === 'blue' && !isMoving) {
            // Safe! Blue bypasses when standing still
            setPracticeDodges((d) => d + 1);
            remaining.push(b);
            return;
          }

          if (b.kind === 'orange' && isMoving) {
            // Safe! Orange bypasses when moving
            setPracticeDodges((d) => d + 1);
            remaining.push(b);
            return;
          }

          // Damage hit
          if (hitCooldown <= 0) {
            soundManager.playHurt();
            setPracticeHits((h) => h + 1);
            hitCooldown = 0.6;
          }
          return;
        }

        // Out of bounds cleanup
        if (b.x < -10 || b.x > 310 || b.y < -10 || b.y > 190) {
          setPracticeDodges((d) => d + 1);
        } else {
          remaining.push(b);
        }
      });

      bulletsRef.current = remaining;

      // Render Canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 300, 180);

      // Box border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, 297, 177);

      // Draw bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw Soul (Red Heart)
      const hx = soul.x;
      const hy = soul.y;
      const isInvuln = hitCooldown > 0 && Math.floor(now / 80) % 2 === 0;

      if (!isInvuln) {
        ctx.fillStyle = '#ff0000';
        // Simple crisp heart drawing
        ctx.beginPath();
        ctx.moveTo(hx, hy + 5);
        ctx.bezierCurveTo(hx - 7, hy - 2, hx - 7, hy - 7, hx, hy - 4);
        ctx.bezierCurveTo(hx + 7, hy - 7, hx + 7, hy - 2, hx, hy + 5);
        ctx.fill();

        // Hitbox center dot indicator
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - 1, hy - 1, 2, 2);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, practiceActive]);

  if (!isOpen) return null;

  const currentTip = BULLET_HELL_TIPS[currentTipIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-pixel"
    >
      <div className="relative w-full max-w-2xl bg-black border-4 border-white text-white p-4 sm:p-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        {/* Header with Undertale branding */}
        <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-red-500 text-base animate-pulse">♥</span>
            <h2 id="tutorial-modal-title" className="text-xs sm:text-sm font-bold tracking-wider text-yellow-300">
              TUTORIAL DE BATALHA & BULLET-HELL
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="text-neutral-400 hover:text-white hover:border-white border border-neutral-700 px-2.5 py-0.5 text-xs transition-colors cursor-pointer"
            aria-label="Fechar tutorial"
          >
            [X]
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2 overflow-x-auto">
          <button
            onClick={() => handleSelectTab('dica')}
            className={`px-3 py-1.5 text-xs transition-colors cursor-pointer border ${
              activeTab === 'dica'
                ? 'border-yellow-400 bg-yellow-950/40 text-yellow-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            💡 DICA DO DIA
          </button>
          <button
            onClick={() => handleSelectTab('guia')}
            className={`px-3 py-1.5 text-xs transition-colors cursor-pointer border ${
              activeTab === 'guia'
                ? 'border-yellow-400 bg-yellow-950/40 text-yellow-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            🎨 CORES DE BALAS
          </button>
          <button
            onClick={() => handleSelectTab('simulador')}
            className={`px-3 py-1.5 text-xs transition-colors cursor-pointer border ${
              activeTab === 'simulador'
                ? 'border-yellow-400 bg-yellow-950/40 text-yellow-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            🕹️ MINI-SIMULADOR
          </button>
        </div>

        {/* Tab 1: DICA DO DIA */}
        {activeTab === 'dica' && (
          <div className="space-y-4">
            <div className="border-2 border-yellow-400/80 bg-neutral-950 p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-yellow-400 text-black font-bold tracking-wider">
                  {currentTip.badge}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Dica #{currentTipIndex + 1} de {BULLET_HELL_TIPS.length}
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-red-500">♥</span>
                <span>{currentTip.title}</span>
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                {currentTip.description}
              </p>

              <div className="bg-neutral-900 border-l-2 border-yellow-400 p-2.5 text-[11px] text-yellow-200">
                <span className="font-bold text-yellow-400">★ Dica Pro: </span>
                <span>{currentTip.proTip}</span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleNextTip}
                className="px-3 py-1.5 text-xs border border-neutral-600 hover:border-yellow-400 text-neutral-200 hover:text-yellow-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>PRÓXIMA DICA</span>
              </button>

              <button
                onClick={() => handleSelectTab('simulador')}
                className="px-3.5 py-1.5 text-xs border border-yellow-400 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>PRATICAR NO SIMULADOR</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: GUIA DE CORES DE BALAS */}
        {activeTab === 'guia' && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            <div className="border border-neutral-700 bg-neutral-950 p-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white shrink-0 mt-0.5 shadow-[0_0_8px_#ffffff]" />
              <div>
                <div className="text-xs font-bold text-white mb-1">PROJÉTEIS BRANCOS (PADRÃO)</div>
                <div className="text-[11px] text-neutral-300 leading-relaxed">
                  Causam dano regular em qualquer contato. Desvie a todo custo utilizando micro-toques.
                </div>
              </div>
            </div>

            <div className="border border-cyan-800 bg-cyan-950/20 p-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-cyan-400 shrink-0 mt-0.5 shadow-[0_0_8px_#22d3ee]" />
              <div>
                <div className="text-xs font-bold text-cyan-300 mb-1">PROJÉTEIS AZUIS CLAROS (FIQUE PARADO)</div>
                <div className="text-[11px] text-neutral-300 leading-relaxed">
                  Não se mexa! Se a sua Alma estiver 100% imóvel quando o projétil azul colidir, ele passará direto sem causar nenhum dano.
                </div>
              </div>
            </div>

            <div className="border border-orange-800 bg-orange-950/20 p-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-[0_0_8px_#f97316]" />
              <div>
                <div className="text-xs font-bold text-amber-300 mb-1">PROJÉTEIS LARANJAS (MOVA-SE)</div>
                <div className="text-[11px] text-neutral-300 leading-relaxed">
                  Mantenha-se em movimento! Se você estiver andando e atravessar um ataque laranja, não sofrerá dano. Pare e você se machucará.
                </div>
              </div>
            </div>

            <div className="border border-emerald-800 bg-emerald-950/20 p-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-400 shrink-0 mt-0.5 shadow-[0_0_8px_#34d399]" />
              <div>
                <div className="text-xs font-bold text-emerald-300 mb-1">PROJÉTEIS VERDES (CURA)</div>
                <div className="text-[11px] text-neutral-300 leading-relaxed">
                  Raros e valiosos! Toque neles intencionalmente para recuperar pontos de vida durante a esquiva do monstro.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: MINI-SIMULADOR INTERATIVO */}
        {activeTab === 'simulador' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full max-w-[300px] text-[10px] text-neutral-400">
              <span>TEMPO: {practiceTime.toFixed(1)}s</span>
              <span className="text-emerald-400">DESVIOS: {practiceDodges}</span>
              <span className="text-red-400">DANO: {practiceHits}</span>
            </div>

            {/* Interactive Canvas Box */}
            <div className="relative border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <canvas
                ref={canvasRef}
                width={300}
                height={180}
                className="block bg-black cursor-crosshair"
              />
            </div>

            {/* Controls guide */}
            <div className="text-center text-[10px] text-neutral-400">
              Controle: [Setas] ou [W A S D] para desviar
            </div>

            {/* Reset Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  startPractice();
                }}
                className="px-3 py-1 text-xs border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer"
              >
                ★ REINICIAR TREINO
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500">
          <span>Undertale T.S · Manual de Sobrevivência</span>
          <span>Mantenha sua Determinação ♥</span>
        </div>
      </div>
    </div>
  );
}
