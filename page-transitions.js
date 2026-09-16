// --- Sistema SPA Instantâneo de Alternância entre Abas com Slide Suave ---

(function () {
  'use strict';

  const PANEL_ORDER = {
    'panel-laptops': 0,
    'panel-tablets': 1,
    'panel-professores': 2
  };

  const HASH_TO_PANEL = {
    '#laptops': 'panel-laptops',
    '#tablets': 'panel-tablets',
    '#professores': 'panel-professores'
  };

  const PANEL_TO_HASH = {
    'panel-laptops': '#laptops',
    'panel-tablets': '#tablets',
    'panel-professores': '#professores'
  };

  let currentPanelId = 'panel-laptops';
  let isSwitching = false;

  function switchTab(targetPanelId, animate = true) {
    if (isSwitching || targetPanelId === currentPanelId) return;

    const currentPanel = document.getElementById(currentPanelId);
    const targetPanel = document.getElementById(targetPanelId);

    if (!targetPanel) return;

    const currentIndex = PANEL_ORDER[currentPanelId] ?? 0;
    const targetIndex = PANEL_ORDER[targetPanelId] ?? 0;
    const isMovingRight = targetIndex > currentIndex;

    const outAnimClass = isMovingRight ? 'slide-out-left' : 'slide-out-right';
    const inAnimClass = isMovingRight ? 'slide-in-right' : 'slide-in-left';

    // Atualizar Abas Visuais
    const navButtons = document.querySelectorAll('.global-nav .nav-tab-item');
    navButtons.forEach(btn => {
      btn.classList.remove('active', 'active-tablets', 'active-professores');
      if (btn.getAttribute('data-target') === targetPanelId) {
        btn.classList.add('active');
        if (targetPanelId === 'panel-tablets') btn.classList.add('active-tablets');
        if (targetPanelId === 'panel-professores') btn.classList.add('active-professores');
      }
    });

    // Atualizar URL hash no histórico sem disparar recarregamento
    if (history.replaceState) {
      history.replaceState(null, '', PANEL_TO_HASH[targetPanelId] || '#laptops');
    }

    if (!animate || !currentPanel) {
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active-panel', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
      });
      targetPanel.classList.add('active-panel');
      currentPanelId = targetPanelId;
      window.dispatchEvent(new Event('resize'));
      return;
    }

    isSwitching = true;
    currentPanel.classList.add(outAnimClass);

    setTimeout(() => {
      currentPanel.classList.remove('active-panel', 'slide-out-left', 'slide-out-right');
      
      targetPanel.classList.remove('slide-in-right', 'slide-in-left');
      targetPanel.classList.add('active-panel', inAnimClass);
      
      currentPanelId = targetPanelId;
      window.dispatchEvent(new Event('resize'));

      setTimeout(() => {
        targetPanel.classList.remove('slide-in-right', 'slide-in-left');
        isSwitching = false;
      }, 230);
    }, 150);
  }

  function setupTabListeners() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.global-nav .nav-tab-item');
      if (!btn) return;

      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        e.preventDefault();
        switchTab(targetId);
      }
    });

    window.addEventListener('hashchange', function () {
      const hashTarget = HASH_TO_PANEL[window.location.hash];
      if (hashTarget && hashTarget !== currentPanelId && !isSwitching) {
        switchTab(hashTarget);
      }
    });
  }

  function init() {
    setupTabListeners();

    // Inicializar no painel indicado pelo hash ou padrão
    const initialTarget = HASH_TO_PANEL[window.location.hash] || 'panel-laptops';
    if (initialTarget !== 'panel-laptops') {
      switchTab(initialTarget, false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
