// --- Sistema de Introdução (Intro / Splash Screen) ---

(function () {
  'use strict';

  const INTRO_DURATION_MS = 2400; // Tempo total da intro automática
  let isClosing = false;
  let progressInterval = null;

  function initIntro() {
    const overlay = document.getElementById('site-intro-overlay');
    const enterBtn = document.getElementById('intro-enter-btn');
    const skipBtn = document.getElementById('intro-skip-btn');
    const progressBar = document.getElementById('intro-progress-bar');
    const statusText = document.getElementById('intro-status-text');
    const replayBtn = document.getElementById('btn-replay-intro');

    if (!overlay) return;

    // Mensagens de progresso dinâmico
    const steps = [
      { at: 0.15, text: 'Carregando setores escolares...' },
      { at: 0.45, text: 'Sincronizando Laptops, Tablets e Professores...' },
      { at: 0.80, text: 'Preparando painéis e base de dados...' },
      { at: 0.98, text: 'Sistema pronto para uso!' }
    ];

    let startTime = performance.now();

    function updateProgress(now) {
      if (isClosing) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / INTRO_DURATION_MS, 1);

      if (progressBar) {
        progressBar.style.width = (progress * 100) + '%';
      }

      // Atualizar texto de status conforme o progresso
      if (statusText) {
        for (let i = steps.length - 1; i >= 0; i--) {
          if (progress >= steps[i].at) {
            statusText.textContent = steps[i].text;
            break;
          }
        }
      }

      if (progress < 1) {
        progressInterval = requestAnimationFrame(updateProgress);
      } else {
        // Concluiu a barra: se o usuário não fechou, aguarda brevemente e fecha suavemente
        setTimeout(() => {
          if (!isClosing) {
            closeIntro();
          }
        }, 350);
      }
    }

    progressInterval = requestAnimationFrame(updateProgress);

    function closeIntro() {
      if (isClosing) return;
      isClosing = true;
      if (progressInterval) cancelAnimationFrame(progressInterval);

      overlay.classList.add('intro-closing');

      setTimeout(() => {
        overlay.classList.add('intro-hidden');
        overlay.classList.remove('intro-closing');
        // Aciona evento de redimensionamento e foco para a interface principal
        window.dispatchEvent(new Event('resize'));
        const globalSearch = document.getElementById('sector-global-search');
        if (globalSearch && window.innerWidth > 768) {
          globalSearch.focus();
        }
      }, 480);
    }

    function replayIntro() {
      if (progressInterval) cancelAnimationFrame(progressInterval);
      isClosing = false;

      overlay.classList.remove('intro-hidden', 'intro-closing');
      if (progressBar) progressBar.style.width = '0%';
      if (statusText) statusText.textContent = 'Inicializando sistema de inventário...';

      startTime = performance.now();
      progressInterval = requestAnimationFrame(updateProgress);
    }

    // Eventos de clique
    if (enterBtn) {
      enterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeIntro();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeIntro();
      });
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        replayIntro();
      });
    }

    // Atalhos de teclado para sair da intro instantaneamente
    window.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('intro-hidden')) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          closeIntro();
        }
      }
    });

    // Expor função globalmente
    window.replayIntro = replayIntro;
    window.closeIntro = closeIntro;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntro);
  } else {
    initIntro();
  }
})();

