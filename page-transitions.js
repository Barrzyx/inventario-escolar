// --- Sistema de Transição Suave e Fluida entre Abas (SPA Slide Navigator) ---

(function () {
  'use strict';

  const PAGE_ORDER = {
    'index.html': 0,
    '': 0,
    '/': 0,
    'tablets.html': 1,
    'professores.html': 2
  };

  const PAGE_SCRIPTS = {
    'index.html': 'app.js',
    '': 'app.js',
    '/': 'app.js',
    'tablets.html': 'tablets.js',
    'professores.html': 'professores.js'
  };

  const PAGE_INITS = {
    'index.html': 'initLaptops',
    '': 'initLaptops',
    '/': 'initLaptops',
    'tablets.html': 'initTablets',
    'professores.html': 'initProfessores'
  };

  function getPageName(pathname) {
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  let isTransitioning = false;
  let pageCache = {};

  // Prefetch das páginas para transição instantânea (0ms de espera)
  function prefetchPages() {
    ['index.html', 'tablets.html', 'professores.html'].forEach(page => {
      fetch(page)
        .then(res => res.text())
        .then(html => {
          pageCache[page] = html;
        })
        .catch(() => {});
    });
  }

  function setupGlobalNav() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('.global-nav a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

      const currentPage = getPageName(window.location.pathname);
      const targetPage = getPageName(href);

      if (currentPage === targetPage) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      navigateTo(href, targetPage, currentPage);
    });

    window.addEventListener('popstate', function () {
      const targetPage = getPageName(window.location.pathname);
      navigateTo(targetPage, targetPage, null, true);
    });
  }

  function navigateTo(url, targetPage, fromPage, isPopState = false) {
    if (isTransitioning) return;
    isTransitioning = true;

    const currentIndex = PAGE_ORDER[fromPage || getPageName(window.location.pathname)] ?? 0;
    const targetIndex = PAGE_ORDER[targetPage] ?? 0;
    const isMovingRight = targetIndex > currentIndex;

    const outAnimClass = isMovingRight ? 'slide-out-left' : 'slide-out-right';
    const inAnimClass = isMovingRight ? 'slide-in-right' : 'slide-in-left';

    const container = document.querySelector('.app-container');
    if (!container) {
      window.location.href = url;
      return;
    }

    // Identificar a área de conteúdo que vai transicionar
    let contentToAnimate = container.querySelector('.page-view-container');
    if (!contentToAnimate) {
      // Se ainda não tiver wrapper, agrupa tudo exceto a global-nav
      const nav = container.querySelector('.global-nav');
      const headerContent = container.querySelector('.header-content');
      const otherElements = Array.from(container.children).filter(el => el !== nav);
      contentToAnimate = container;
    }

    contentToAnimate.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
    contentToAnimate.classList.add(outAnimClass);

    const fetchPromise = pageCache[targetPage]
      ? Promise.resolve(pageCache[targetPage])
      : fetch(url).then(res => res.text());

    fetchPromise.then(html => {
      setTimeout(() => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Atualizar Título
        document.title = doc.title;

        // Atualizar Conteúdo da Página
        const newContainer = doc.querySelector('.app-container');
        if (newContainer) {
          container.innerHTML = newContainer.innerHTML;
        }

        // Atualizar URL sem reload
        if (!isPopState) {
          window.history.pushState(null, '', url);
        }

        // Atualizar classe ativa nas tabs
        const navLinks = container.querySelectorAll('.global-nav .nav-tab-item');
        navLinks.forEach(item => {
          const itemHref = getPageName(item.getAttribute('href') || '');
          item.classList.remove('active', 'active-tablets', 'active-professores');
          if (itemHref === targetPage || (targetPage === 'index.html' && itemHref === '')) {
            item.classList.add('active');
            if (targetPage === 'tablets.html') item.classList.add('active-tablets');
            if (targetPage === 'professores.html') item.classList.add('active-professores');
          }
        });

        // Aplicar animação de entrada
        container.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
        container.classList.add(inAnimClass);

        // Inicializar os scripts e gráficos do novo módulo
        const initFnName = PAGE_INITS[targetPage];
        if (window[initFnName] && typeof window[initFnName] === 'function') {
          window[initFnName]();
        } else {
          // Carrega o script caso ainda não esteja em memória
          const scriptSrc = PAGE_SCRIPTS[targetPage];
          if (scriptSrc) {
            const newScript = document.createElement('script');
            newScript.src = scriptSrc;
            document.body.appendChild(newScript);
          }
        }

        setTimeout(() => {
          container.classList.remove(inAnimClass);
          isTransitioning = false;
        }, 250);
      }, 150);
    }).catch(err => {
      console.error('Erro na transição suave:', err);
      window.location.href = url;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupGlobalNav();
      prefetchPages();
    });
  } else {
    setupGlobalNav();
    prefetchPages();
  }
})();
