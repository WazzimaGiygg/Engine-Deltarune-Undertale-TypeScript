import Phaser from 'phaser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BattleSimulatorModal } from './components/BattleSimulatorModal';
import { OverworldMenuModal } from './components/OverworldMenuModal';
import { PhaserGame } from './components/PhaserGame';
import { SoundSettings } from './components/SoundSettings';
import { VirtualController } from './components/VirtualController';
import { gameState } from './engine/gameState';
import { OverworldScene } from './engine/scenes/OverworldScene';
import { soundManager } from './services/soundSynthesizer';
import { PlayerStats } from './types/game';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(gameState.getStats());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [showVirtualPad, setShowVirtualPad] = useState(true);
  const [activeSection, setActiveSection] = useState<'game' | 'guide' | 'lore'>('game');

  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const unsub = gameState.subscribe((newStats) => {
      setStats(newStats);
    });
    return () => unsub();
  }, []);

  const handleOpenMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleGameRef = useCallback((game: Phaser.Game | null) => {
    gameRef.current = game;
  }, []);

  const handleVirtualAction = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => {
    if (key === 'C') {
      setIsMenuOpen((prev) => !prev);
      return;
    }

    if (!gameRef.current) return;
    const activeScenes = gameRef.current.scene.getScenes(true);
    activeScenes.forEach((s) => {
      s.events.emit('virtual_action', key);
    });
  };

  const handleSelectBattle = (enemyId: string) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    soundManager.playBattleStart();
    sceneManager.stop('OverworldScene');
    sceneManager.start('BattleScene', { enemyId });
  };

  const handleWarpRoom = (roomId: string, x: number, y: number) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    const overworld = sceneManager.getScene('OverworldScene') as OverworldScene;
    if (overworld && sceneManager.isActive('OverworldScene')) {
      overworld.switchRoom(roomId, x, y);
    } else {
      sceneManager.stop('BattleScene');
      sceneManager.start('OverworldScene');
      setTimeout(() => {
        const ow = sceneManager.getScene('OverworldScene') as OverworldScene;
        if (ow) ow.switchRoom(roomId, x, y);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-pixel selection:bg-yellow-400 selection:text-black">
      {/* Top Bar Contract: 3 zones (Brand wordmark, nav links, primary action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-neutral-800 bg-black shrink-0">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#game"
          onClick={() => setActiveSection('game')}
          className="text-sm font-bold tracking-wider text-yellow-300 hover:text-yellow-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="text-red-500">♥</span>
          <span>UNDERTALE ENGINE</span>
        </a>

        {/* Zone 2: Single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400">
          <button
            onClick={() => setActiveSection('game')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'game' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            Jogar Ruínas
          </button>
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Batalhas Rápidas
          </button>
          <button
            onClick={() => handleOpenMenu()}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Equipamentos
          </button>
          <button
            onClick={() => setActiveSection('guide')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'guide' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            Guia de Teclas
          </button>
          <button
            onClick={() => setActiveSection('lore')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'lore' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            Sobre o Motor
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <SoundSettings />
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-300 transition-colors whitespace-nowrap shrink-0 shadow cursor-pointer"
          >
            Arena de Batalha
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-neutral-950 border border-neutral-800 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold">{stats.name}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-yellow-300">LV {stats.lv}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-red-400">
              HP {stats.hp}/{stats.maxHp}
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-yellow-400 font-tabular">{stats.gold} G</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            <span>
              Arma: <strong className="text-emerald-400">{stats.weapon.name}</strong>
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>
              Armadura: <strong className="text-blue-400">{stats.armor.name}</strong>
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="text-yellow-300 hover:underline cursor-pointer"
            >
              [C] Abrir Menu
            </button>
          </div>
        </div>

        {/* Game Canvas Container */}
        {activeSection === 'game' && (
          <div className="flex flex-col items-center gap-3">
            <PhaserGame
              onOpenMenu={handleOpenMenu}
              gameRefCallback={handleGameRef}
            />

            {/* Quick action bar under screen */}
            <div className="w-full max-w-[800px] flex items-center justify-between text-xs text-neutral-400 px-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowVirtualPad((prev) => !prev)}
                  className="hover:text-white transition-colors text-[10px]"
                >
                  {showVirtualPad ? '▼ Ocultar Controle Virtual' : '▲ Exibir Controle Virtual'}
                </button>
                <span aria-hidden="true" className="text-neutral-700">·</span>
                <button
                  onClick={() => {
                    soundManager.playSave();
                    gameState.saveGame();
                  }}
                  className="text-emerald-400 hover:text-emerald-300 text-[10px]"
                >
                  Salvar Progresso
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                <span>Setas / WASD: Mover</span>
                <span>·</span>
                <span>Z: Interagir</span>
                <span>·</span>
                <span>C: Menu</span>
              </div>
            </div>

            {/* Virtual Touch Controller */}
            {showVirtualPad && (
              <div className="w-full mt-1">
                <VirtualController onAction={handleVirtualAction} />
              </div>
            )}
          </div>
        )}

        {/* Guide Section */}
        {activeSection === 'guide' && (
          <div className="border-2 border-neutral-800 bg-neutral-950 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-sm text-yellow-300 font-bold">GUIA DE JOGABILIDADE & CONTROLES</h2>
              <button
                onClick={() => setActiveSection('game')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Voltar ao Jogo →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-neutral-300">
              <div className="space-y-3">
                <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[11px]">
                  1. Exploração no Mapa (Overworld)
                </h3>
                <p>• <strong>Setas Direcionais ou W, A, S, D</strong>: Move o humano Frisk pelas ruínas em 4 direções com colisão em paredes e enigmas.</p>
                <p>• <strong>Tecla Z ou Enter / Espaço</strong>: Interage com placas, abre baús de tesouro, pisa em interruptores para retrair espinhos e conversa com Toriel, Sans e monstros.</p>
                <p>• <strong>Estrelas Douradas de Ponto de Salve</strong>: Pisem nelas e pressione Z para curar todo o seu HP e salvar o progresso no armazenamento local.</p>
                <p>• <strong>Tecla C ou ESC</strong>: Abre o menu clássico com Inventário, Dados de LV/EXP/ATK/DEF, Telefone e Equipamentos.</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[11px]">
                  2. Batalhas e Desvio de Projéteis (Bullet-Hell)
                </h3>
                <p>• <strong>LUTAR (Fight)</strong>: Mini-game do alvo com barra deslizante. Aperte Z exatamente no centro para desferir um Golpe Crítico!</p>
                <p>• <strong>AGIR (Act)</strong>: Elogie, flerte ou decifre os gostos de cada monstro. Ao atingir 100% de misericórdia, o nome do monstro fica <strong>AMARELO</strong>!</p>
                <p>• <strong>POUPAR (Mercy)</strong>: Permite poupar monstros de nome amarelo, ganhando Ouro sem derramar sangue (Rota Pacifista).</p>
                <p>• <strong>Fase de Defesa</strong>: Controle sua Alma (Coração Vermelho ♥) dentro do retângulo para desviar de ossos, moscas e estrelas. Nos <strong>Ataques Azuis</strong>, fique imóvel para não tomar dano!</p>
              </div>
            </div>
          </div>
        )}

        {/* Lore Section */}
        {activeSection === 'lore' && (
          <div className="border-2 border-neutral-800 bg-neutral-950 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-sm text-yellow-300 font-bold">SOBRE O MOTOR (TYPESCRIPT + PHASER 3)</h2>
              <button
                onClick={() => setActiveSection('game')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Voltar ao Jogo →
              </button>
            </div>

            <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
              <p>
                Este motor foi construído sob medida com <strong>TypeScript</strong> e o framework <strong>Phaser 3</strong>, reproduzindo com fidelidade a jogabilidade dos clássicos cult <em>Undertale</em> e <em>Deltarune</em> criados por Toby Fox.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3 border border-neutral-800 bg-black">
                  <h4 className="text-yellow-400 font-bold mb-1 text-[11px]">Renderizador Procedural</h4>
                  <p className="text-[10px] text-neutral-400">Sprites dos personagens, inimigos e tiles gerados via código canvas pixel-art, garantindo nitidez e ausência de dependências quebradas.</p>
                </div>
                <div className="p-3 border border-neutral-800 bg-black">
                  <h4 className="text-red-400 font-bold mb-1 text-[11px]">Bullet Hell Soul Arena</h4>
                  <p className="text-[10px] text-neutral-400">Caixa de combate com resizing dinâmico, física de projéteis, colisão de alma com i-frames (tempo de invulnerabilidade) e ataques mecânicos especiais.</p>
                </div>
                <div className="p-3 border border-neutral-800 bg-black">
                  <h4 className="text-purple-400 font-bold mb-1 text-[11px]">Sintetizador Chiptune</h4>
                  <p className="text-[10px] text-neutral-400">Áudio sintetizado em tempo real com osciladores Web Audio API para falas dos personagens, passos, acertos, jingle de vitória e trilha musical.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Overworld Menu Modal (ITEM, STAT, PHONE, EQUIP) */}
      <OverworldMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        stats={stats}
      />

      {/* Battle & Warp Room Simulator Modal */}
      <BattleSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSelectBattle={handleSelectBattle}
        onWarpRoom={handleWarpRoom}
      />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-neutral-900 py-3 px-6 text-center text-[10px] text-neutral-500 flex items-center justify-between">
        <span>Tributo a Undertale & Deltarune · Motor em TypeScript + Phaser 3</span>
        <span>Mantenha sua Determinação</span>
      </footer>
    </div>
  );
}
