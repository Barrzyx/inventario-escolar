// --- Gerenciador de Tema (Modo Escuro / Modo Claro) ---
(function () {
  'use strict';

  const STORAGE_KEY = 'inventario_theme';

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Preferência do sistema do usuário
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Atualizar visual do botão
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      const label = btn.querySelector('.theme-toggle-label');
      
      if (theme === 'dark') {
        if (icon) icon.className = 'fa-solid fa-sun';
        if (label) label.textContent = 'Claro';
        btn.setAttribute('title', 'Mudar para Modo Claro');
      } else {
        if (icon) icon.className = 'fa-solid fa-moon';
        if (label) label.textContent = 'Escuro';
        btn.setAttribute('title', 'Mudar para Modo Escuro');
      }
    });

    // Atualizar gráficos se Chart.js estiver disponível
    updateChartsTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateChartsTheme(theme) {
    if (typeof Chart === 'undefined') return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const borderColor = isDark ? '#111827' : '#FFFFFF';

    // Disparar evento para que os scripts dos módulos atualizem os gráficos
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme, isDark, textColor, borderColor } }));
  }

  // Aplicar imediatamente para evitar flash de estilo branco/escuro
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);

  // Inicializar listeners após o DOM carregar
  function init() {
    applyTheme(getPreferredTheme());

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.theme-toggle-btn');
      if (btn) {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Ouvir mudanças no tema do sistema
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
