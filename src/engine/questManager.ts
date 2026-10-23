import { soundManager } from '../services/soundSynthesizer';
import { Quest, QuestNotification } from '../types/quest';
import { gameState } from './gameState';

type QuestListener = (quests: Quest[]) => void;
type NotificationListener = (notification: QuestNotification) => void;

class QuestManager {
  private listeners: Set<QuestListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private completedObjectivesCache: Set<string> = new Set();
  private completedQuestsCache: Set<string> = new Set();
  private initialized = false;

  constructor() {
    // Subscribe to gameState changes to re-evaluate quests in real time
    gameState.subscribe(() => {
      this.evaluateAndNotify();
    });
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Pre-populate completed cache without spamming notifications on first load
    const current = this.computeQuests();
    current.forEach((q) => {
      if (q.status === 'completed') {
        this.completedQuestsCache.add(q.id);
      }
      q.objectives.forEach((obj) => {
        if (obj.isCompleted) {
          this.completedObjectivesCache.add(`${q.id}_${obj.id}`);
        }
      });
    });
  }

  public subscribe(fn: QuestListener): () => void {
    this.listeners.add(fn);
    fn(this.getQuests());
    return () => this.listeners.delete(fn);
  }

  public onNotification(fn: NotificationListener): () => void {
    this.notificationListeners.add(fn);
    return () => this.notificationListeners.delete(fn);
  }

  public getQuests(): Quest[] {
    return this.computeQuests();
  }

  public getQuestById(id: string): Quest | undefined {
    return this.computeQuests().find((q) => q.id === id);
  }

  public getActiveQuests(): Quest[] {
    return this.computeQuests().filter((q) => q.status === 'active');
  }

  public getCompletedQuests(): Quest[] {
    return this.computeQuests().filter((q) => q.status === 'completed');
  }

  public getSummaryStats() {
    const list = this.computeQuests();
    const active = list.filter((q) => q.status === 'active').length;
    const completed = list.filter((q) => q.status === 'completed').length;
    return {
      total: list.length,
      active,
      completed,
      completionRate: Math.round((completed / Math.max(1, list.length)) * 100),
    };
  }

  /**
   * Evaluates all quests against engine flags, player stats and inventory
   */
  private computeQuests(): Quest[] {
    const stats = gameState.getStats();
    const curRoom = gameState.getCurrentRoom();

    // Helper checks
    const hasAwoken = gameState.getFlag('frisk_awoken');
    const reachedFloweyRoom =
      gameState.getFlag('reached_room_flowey') ||
      curRoom === 'room_flowey' ||
      curRoom === 'room_toriel_entrance' ||
      curRoom === 'ruins_entrance' ||
      curRoom === 'ruins_puzzle' ||
      curRoom === 'ruins_crossroads' ||
      curRoom === 'ruins_boss_gate';

    const metFlowey = gameState.getFlag('flowey_met');

    const spokenToriel = gameState.getFlag('toriel_intro_spoken');
    const calledToriel = gameState.getFlag('called_toriel');

    const switchPressed = gameState.getFlag('switch_puzzle_1');
    const crossedSpikes =
      switchPressed &&
      (curRoom === 'ruins_crossroads' ||
        curRoom === 'ruins_boss_gate' ||
        gameState.getFlag('reached_ruins_crossroads'));

    const talkedFroggit = gameState.getFlag('froggit_talked');
    const hasSpared = stats.spares > 0;

    const chestToyKnife =
      gameState.getFlag('chest_toy_knife') ||
      stats.weapon.id === 'toy_knife' ||
      stats.inventory.some((i) => i.id === 'toy_knife');

    const chestFadedRibbon =
      gameState.getFlag('chest_faded_ribbon') ||
      stats.armor.id === 'faded_ribbon' ||
      stats.inventory.some((i) => i.id === 'faded_ribbon');

    const hasEquippedUpgrades =
      stats.weapon.id !== 'stick' || stats.armor.id !== 'bandage';

    const metSans = gameState.getFlag('sans_met');
    const calledSans = gameState.getFlag('called_sans');

    const readDeltaRune = gameState.getFlag('read_delta_rune');

    const savedAtLeastOnce = gameState.getFlag('game_saved_at_least_once');

    const sirOssosDefeated = gameState.getFlag('enemy_defeated_sir_ossos');
    const sirOssosSpared = gameState.getFlag('enemy_spared_sir_ossos');
    const sirOssosResolved =
      sirOssosDefeated || sirOssosSpared || gameState.getFlag('sir_ossos_resolved');

    const deltajesterResolved =
      gameState.getFlag('enemy_defeated_deltajester') ||
      gameState.getFlag('enemy_spared_deltajester') ||
      gameState.getFlag('deltajester_resolved');

    const rawQuests: Array<Omit<Quest, 'status' | 'progressPercent'>> = [
      {
        id: 'quest_awakening',
        title: 'O Despertar nas Flores',
        category: 'main',
        chapter: 'Prólogo: A Queda no Subterrâneo',
        flavorText:
          '* Um leito macio de flores douradas amorteceu sua queda do Monte Ebott. Levante-se e procure uma saída na escuridão da caverna.',
        summary: 'Desperte da inconsciência e explore a câmara inicial das Ruínas.',
        objectives: [
          {
            id: 'wake_up',
            description: 'Acordar do sono nas flores douradas brilhantes',
            isCompleted: hasAwoken,
          },
          {
            id: 'reach_exit',
            description: 'Cruzar o portal de pedra rumo à câmara seguinte',
            isCompleted: reachedFloweyRoom,
          },
        ],
        rewardText: 'Abertura dos Caminhos do Subterrâneo & Determinação',
      },
      {
        id: 'quest_flowey',
        title: 'Sua Melhor Amiga Flor',
        category: 'main',
        chapter: 'Prólogo: Primeiros Passos',
        flavorText:
          '* Uma florzinha amarela falante sorri para você na clareira. Ela parece muito empolgada para compartilhar "balinhas da amizade".',
        summary: 'Aprenda sobre a mecânica de combate e o valor da ALMA com Flowey.',
        objectives: [
          {
            id: 'talk_flowey',
            description: 'Conhecer e ouvir a apresentação de Flowey a Flor',
            isCompleted: metFlowey,
          },
          {
            id: 'escape_flowey',
            description: 'Descobrir a verdadeira natureza das "balinhas da amizade"',
            isCompleted: metFlowey,
          },
        ],
        rewardText: 'Compreensão de que neste mundo, ações têm consequências',
      },
      {
        id: 'quest_toriel_guide',
        title: 'A Guardiã Maternal das Ruínas',
        category: 'main',
        chapter: 'Capítulo 1: O Acolhimento',
        flavorText:
          '* Toriel afugentou a flor perigosa e ofereceu sua mão carinhosa para ensinar você a navegar com segurança pelos perigos.',
        summary: 'Siga Toriel pela entrada das Ruínas e aprenda a confiar na gentileza.',
        objectives: [
          {
            id: 'talk_toriel',
            description: 'Falar com Toriel na entrada adornada das Ruínas',
            isCompleted: spokenToriel,
          },
          {
            id: 'call_toriel',
            description: 'Entrar em contato com Toriel discando pelo menu CELULAR',
            isCompleted: calledToriel,
          },
        ],
        rewardText: 'O afeto de uma mãe e Dicas valiosas para a jornada',
      },
      {
        id: 'quest_spike_puzzle',
        title: 'O Enigma dos Espinhos Afiados',
        category: 'main',
        chapter: 'Capítulo 1: Antigos Mecanismos',
        flavorText:
          '* Uma fileira impenetrável de espinhos de aço reluzentes barra a travessia. O som de mecanismos ancestrais ecoa pelas paredes.',
        summary: 'Encontre o interruptor no piso de pedra para desarmar a armadilha de espinhos.',
        objectives: [
          {
            id: 'press_switch',
            description: 'Pressionar o botão antigo de pedra no chão da câmara',
            isCompleted: switchPressed,
          },
          {
            id: 'pass_spikes',
            description: 'Avançar em segurança pelos espinhos rebaixados',
            isCompleted: crossedSpikes,
          },
        ],
        rewardText: 'Acesso liberado para o Cruzamento dos Monstros',
      },
      {
        id: 'quest_mercy_path',
        title: 'A Filosofia da Piedade',
        category: 'side',
        chapter: 'Caminho Moral: Pacifismo',
        flavorText:
          '* Nem todo encontro no Subterrâneo precisa culminar em tragédia. Um pequeno sapo filósofo conhece a arte do diálogo.',
        summary: 'Aprenda como acalmar monstros através de [AGIR] e conceder [PIEDADE].',
        objectives: [
          {
            id: 'talk_froggit',
            description: 'Ouvir os ensinamentos de Froggit sobre nomes amarelos',
            isCompleted: talkedFroggit,
          },
          {
            id: 'spare_monster',
            description: 'Poupar um adversário durante o combate usando [PIEDADE]',
            isCompleted: hasSpared,
            currentCount: stats.spares,
            targetCount: 1,
          },
        ],
        rewardText: 'Consciência tranquila e reputação de humano bondoso',
      },
      {
        id: 'quest_ancient_armory',
        title: 'Arsenal Esquecido das Ruínas',
        category: 'exploration',
        chapter: 'Exploração: Baús Ancestrais',
        flavorText:
          '* Baús de madeira empoeirados guardam relíquias deixadas por aqueles que desceram ao Subterrâneo no passado.',
        summary: 'Encontre e equipe a Faca de Brinquedo e a Fita Desbotada.',
        objectives: [
          {
            id: 'find_knife',
            description: 'Recuperar a Faca de Brinquedo no baú da câmara do puzzle',
            isCompleted: chestToyKnife,
          },
          {
            id: 'find_ribbon',
            description: 'Resgatar a Fita Desbotada no Cruzamento dos Monstros',
            isCompleted: chestFadedRibbon,
          },
          {
            id: 'equip_gear',
            description: 'Equipar uma arma ou armadura através do menu de pausa',
            isCompleted: hasEquippedUpgrades,
          },
        ],
        rewardText: 'Bônus de ATK +3 e DEF +3 nos confrontos',
      },
      {
        id: 'quest_save_stars',
        title: 'A Luz da Determinação',
        category: 'exploration',
        chapter: 'Segredos: Gravação Temporal',
        flavorText:
          '* Pequenas estrelas douradas brilham intensamente na penumbra. Tocá-las restaura completamente sua saúde e grava sua alma no tempo.',
        summary: 'Interaja com uma Estrela de Salvamento para registrar seu progresso.',
        objectives: [
          {
            id: 'interact_save',
            description: 'Tocar em uma Estrela de Salvar e registrar sua jornada',
            isCompleted: savedAtLeastOnce,
          },
        ],
        rewardText: 'HP totalmente restaurado e Ponto de Retorno ativo',
      },
      {
        id: 'quest_sans_encounter',
        title: 'O Vigilante Esqueleto',
        category: 'side',
        chapter: 'Encontros Cômicos',
        flavorText:
          '* Um esqueleto baixinho com jaqueta azul vigia preguiçosamente o cruzamento. Ele adora piadas horríveis sobre esqueletos.',
        summary: 'Converse com Sans e descubra seu número para ligações de emergência.',
        objectives: [
          {
            id: 'meet_sans',
            description: 'Conversar com Sans no Cruzamento dos Monstros',
            isCompleted: metSans,
          },
          {
            id: 'call_sans',
            description: 'Discar para a dupla de irmãos esqueletos pelo CELULAR',
            isCompleted: calledSans,
          },
        ],
        rewardText: 'Trocadilhos sem graça e bom humor subterrâneo',
      },
      {
        id: 'quest_delta_prophecy',
        title: 'A Profecia do Delta Rune',
        category: 'secret',
        chapter: 'Lendas do Subterrâneo',
        flavorText:
          '* Gravado na pedra lavrada, o antigo emblema da realeza dos monstros carrega a lenda do anjo que esvaziará o reino.',
        summary: 'Examine a inscrição gravada na parede das Ruínas.',
        objectives: [
          {
            id: 'read_rune',
            description: 'Examinar o emblema do Delta Rune gravado na pedra',
            isCompleted: readDeltaRune,
          },
        ],
        rewardText: 'Vislumbre do destino compartilhado entre humanos e monstros',
      },
      {
        id: 'quest_gate_guardians',
        title: 'O Desafio da Guarda Real',
        category: 'main',
        chapter: 'Clímax: O Portão dos Guardiões',
        flavorText:
          '* O grande Sir Ossos e o Bufão Caótico guardam o portal final das Ruínas. Demonstre sua bravura e compaixão no campo de honra!',
        summary: 'Enfrente e supere o desafio de Sir Ossos ou do Bufão no Portão Real.',
        objectives: [
          {
            id: 'reach_gate',
            description: 'Chegar ao Salão dos Guardiões do Subterrâneo',
            isCompleted:
              curRoom === 'ruins_boss_gate' ||
              gameState.getFlag('reached_ruins_boss_gate') ||
              sirOssosResolved ||
              deltajesterResolved,
          },
          {
            id: 'resolve_boss',
            description: 'Superar o teste de Sir Ossos (Poupando com honra ou lutando)',
            isCompleted: sirOssosResolved || deltajesterResolved,
          },
        ],
        rewardText: 'A passagem definitiva para além dos portões das Ruínas!',
      },
    ];

    return rawQuests.map((q) => {
      const completedCount = q.objectives.filter((o) => o.isCompleted).length;
      const totalCount = q.objectives.length;
      const progressPercent = Math.round((completedCount / Math.max(1, totalCount)) * 100);

      let status: Quest['status'] = 'active';
      if (progressPercent === 100) {
        status = 'completed';
      }

      return {
        ...q,
        status,
        progressPercent,
      };
    });
  }

  private evaluateAndNotify() {
    const list = this.computeQuests();

    // Check for newly completed objectives & quests
    list.forEach((q) => {
      q.objectives.forEach((obj) => {
        const key = `${q.id}_${obj.id}`;
        if (obj.isCompleted && !this.completedObjectivesCache.has(key)) {
          this.completedObjectivesCache.add(key);

          // Only fire notification if initialized
          if (this.initialized) {
            this.emitNotification({
              questId: q.id,
              questTitle: q.title,
              objectiveText: obj.description,
              isCompletion: false,
              timestamp: Date.now(),
            });
          }
        }
      });

      if (q.status === 'completed' && !this.completedQuestsCache.has(q.id)) {
        this.completedQuestsCache.add(q.id);

        if (this.initialized) {
          soundManager.playSave();
          this.emitNotification({
            questId: q.id,
            questTitle: q.title,
            objectiveText: 'Todas as tarefas concluídas!',
            isCompletion: true,
            timestamp: Date.now(),
          });
        }
      }
    });

    // Notify UI listeners
    this.listeners.forEach((fn) => fn(list));
  }

  private emitNotification(notification: QuestNotification) {
    this.notificationListeners.forEach((fn) => fn(notification));
  }
}

export const questManager = new QuestManager();
questManager.init();
