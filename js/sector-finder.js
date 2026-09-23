// --- Sistema da Barra de Setores & Localizador Global entre Setores ---

(function () {
  'use strict';

  const STORAGE_KEYS = {
    laptops: 'escola_inventario_equipamentos_v1',
    tablets: 'escola_inventario_tablets_v1',
    professores: 'escola_inventario_professores_v1'
  };

  const SECTOR_INFO = {
    'panel-laptops': {
      name: 'Laptops dos Alunos',
      icon: 'fa-solid fa-laptop',
      color: '#3b82f6',
      badgeId: 'badge-sector-laptops',
      searchId: 'search-input',
      tbodyId: 'inventory-tbody'
    },
    'panel-tablets': {
      name: 'Tablets Escolares',
      icon: 'fa-solid fa-tablet-screen-button',
      color: '#06b6d4',
      badgeId: 'badge-sector-tablets',
      searchId: 'tablets-search-input',
      tbodyId: 'tablets-inventory-tbody'
    },
    'panel-professores': {
      name: 'Laptops de Professor',
      icon: 'fa-solid fa-chalkboard-user',
      color: '#8b5cf6',
      badgeId: 'badge-sector-professores',
      searchId: 'prof-search-input',
      tbodyId: 'prof-inventory-tbody'
    }
  };

  function getStoredItems(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Erro ao ler ' + key, e);
      return [];
    }
  }

  // --- Atualização dos Badges de Contagem de Cada Setor ---
  function updateSectorBadges() {
    const laptops = getStoredItems(STORAGE_KEYS.laptops);
    const tablets = getStoredItems(STORAGE_KEYS.tablets);
    const professores = getStoredItems(STORAGE_KEYS.professores);

    const bLaptops = document.getElementById('badge-sector-laptops');
    const bTablets = document.getElementById('badge-sector-tablets');
    const bProf = document.getElementById('badge-sector-professores');

    if (bLaptops) bLaptops.textContent = laptops.length;
    if (bTablets) bTablets.textContent = tablets.length;
    if (bProf) bProf.textContent = professores.length;
  }

  // --- Navegar para um Setor e Opcionalmente Filtrar um Item ---
  function navigateToSector(panelId, filterText = '') {
    const navBtn = document.querySelector(`.global-nav .nav-tab-item[data-target="${panelId}"]`);
    if (navBtn) {
      navBtn.click();
    }

    if (filterText) {
      const info = SECTOR_INFO[panelId];
      if (info && info.searchId) {
        setTimeout(() => {
          const searchInput = document.getElementById(info.searchId);
          if (searchInput) {
            searchInput.value = filterText;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Destaque visual na tabela
            setTimeout(() => {
              const tbody = document.getElementById(info.tbodyId);
              if (tbody) {
                const firstRow = tbody.querySelector('tr');
                if (firstRow) {
                  firstRow.classList.add('row-highlight');
                  setTimeout(() => firstRow.classList.remove('row-highlight'), 2200);
                  firstRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }
            }, 100);
          }
        }, 120);
      }
    }
  }

  // --- Localizador Global entre Setores ---
  function setupSectorFinder() {
    const searchInput = document.getElementById('sector-global-search');
    const resultsContainer = document.getElementById('sector-search-results');
    const wrapper = document.querySelector('.sector-search-wrapper');

    if (!searchInput || !resultsContainer) return;

    function renderResults(query) {
      const q = (query || '').trim().toLowerCase();
      const laptops = getStoredItems(STORAGE_KEYS.laptops);
      const tablets = getStoredItems(STORAGE_KEYS.tablets);
      const professores = getStoredItems(STORAGE_KEYS.professores);

      if (!q) {
        // Exibir Guia Rápido dos Setores quando o campo estiver vazio
        resultsContainer.innerHTML = `
          <div class="finder-header">
            <span><i class="fa-solid fa-compass"></i> Setores Disponíveis</span>
            <span class="finder-hint">Clique para navegar diretamente</span>
          </div>
          <div class="finder-sectors-list">
            <div class="finder-sector-row" data-target="panel-laptops">
              <div class="finder-sector-icon" style="color: #3b82f6;"><i class="fa-solid fa-laptop"></i></div>
              <div class="finder-sector-details">
                <strong>Setor de Laptops dos Alunos</strong>
                <small>Positivo & Multilaser • ${laptops.length} equipamento(s)</small>
              </div>
              <i class="fa-solid fa-arrow-right finder-arrow"></i>
            </div>
            <div class="finder-sector-row" data-target="panel-tablets">
              <div class="finder-sector-icon" style="color: #06b6d4;"><i class="fa-solid fa-tablet-screen-button"></i></div>
              <div class="finder-sector-details">
                <strong>Setor de Tablets</strong>
                <small>Tablets Educacionais • ${tablets.length} equipamento(s)</small>
              </div>
              <i class="fa-solid fa-arrow-right finder-arrow"></i>
            </div>
            <div class="finder-sector-row" data-target="panel-professores">
              <div class="finder-sector-icon" style="color: #8b5cf6;"><i class="fa-solid fa-chalkboard-user"></i></div>
              <div class="finder-sector-details">
                <strong>Setor de Laptops de Professor</strong>
                <small>ThinkPad & Ultra • ${professores.length} equipamento(s)</small>
              </div>
              <i class="fa-solid fa-arrow-right finder-arrow"></i>
            </div>
          </div>
        `;
        resultsContainer.classList.remove('hidden');
        return;
      }

      // Buscar equipamentos correspondentes
      const matches = [];

      laptops.forEach(item => {
        const text = `${item.numeracao || ''} ${item.marca || ''} ${item.categoria || ''} ${item.observacao || ''}`.toLowerCase();
        if (text.includes(q)) {
          matches.push({ sectorId: 'panel-laptops', sectorName: 'Laptops dos Alunos', item, icon: 'fa-solid fa-laptop' });
        }
      });

      tablets.forEach(item => {
        const text = `${item.numeracao || ''} ${item.categoria || ''} ${item.observacao || ''}`.toLowerCase();
        if (text.includes(q)) {
          matches.push({ sectorId: 'panel-tablets', sectorName: 'Tablets Escolares', item, icon: 'fa-solid fa-tablet-screen-button' });
        }
      });

      professores.forEach(item => {
        const text = `${item.numeracao || ''} ${item.marca || ''} ${item.categoria || ''} ${item.observacao || ''}`.toLowerCase();
        if (text.includes(q)) {
          matches.push({ sectorId: 'panel-professores', sectorName: 'Laptops de Professor', item, icon: 'fa-solid fa-chalkboard-user' });
        }
      });

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div class="finder-empty">
            <i class="fa-solid fa-magnifying-glass"></i>
            <p>Nenhum equipamento encontrado para "<strong>${escapeHtml(query)}</strong>" nos setores.</p>
            <small>Tente buscar por número, marca ou estado.</small>
          </div>
        `;
        resultsContainer.classList.remove('hidden');
        return;
      }

      // Renderizar itens encontrados
      let html = `
        <div class="finder-header">
          <span><i class="fa-solid fa-search"></i> Resultados nos Setores (${matches.length})</span>
          <span class="finder-hint">Clique para abrir o setor</span>
        </div>
        <div class="finder-results-list">
      `;

      matches.slice(0, 15).forEach(m => {
        const num = m.item.numeracao || 'S/N';
        const brand = m.item.marca ? `<strong>${escapeHtml(m.item.marca)}</strong> • ` : '';
        const cat = escapeHtml(m.item.categoria || '');
        const obs = m.item.observacao ? ` <span class="finder-obs">(${escapeHtml(m.item.observacao)})</span>` : '';

        html += `
          <div class="finder-result-item" data-sector="${m.sectorId}" data-num="${escapeHtml(num)}">
            <div class="finder-item-left">
              <span class="finder-badge-sector finder-badge-${m.sectorId}">
                <i class="${m.icon}"></i> ${m.sectorName}
              </span>
              <span class="finder-item-title">${brand}#${escapeHtml(num)}</span>
              <span class="finder-item-desc">${cat}${obs}</span>
            </div>
            <i class="fa-solid fa-arrow-up-right-from-square finder-arrow"></i>
          </div>
        `;
      });

      if (matches.length > 15) {
        html += `<div class="finder-more">+ mais ${matches.length - 15} itens encontrados...</div>`;
      }

      html += `</div>`;
      resultsContainer.innerHTML = html;
      resultsContainer.classList.remove('hidden');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    searchInput.addEventListener('input', () => {
      renderResults(searchInput.value);
    });

    searchInput.addEventListener('focus', () => {
      renderResults(searchInput.value);
    });

    // Clique em item do dropdown
    resultsContainer.addEventListener('click', (e) => {
      const sectorRow = e.target.closest('.finder-sector-row');
      if (sectorRow) {
        const target = sectorRow.getAttribute('data-target');
        if (target) {
          navigateToSector(target);
          resultsContainer.classList.add('hidden');
          searchInput.value = '';
        }
        return;
      }

      const itemRow = e.target.closest('.finder-result-item');
      if (itemRow) {
        const sector = itemRow.getAttribute('data-sector');
        const num = itemRow.getAttribute('data-num');
        if (sector) {
          navigateToSector(sector, num);
          resultsContainer.classList.add('hidden');
        }
      }
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        resultsContainer.classList.add('hidden');
      }
    });

    // Tecla Escape para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        resultsContainer.classList.add('hidden');
      }
      // Atalho Ctrl+K ou Cmd+K para abrir a barra de busca
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        renderResults(searchInput.value);
      }
    });
  }

  // --- Inicialização e Observadores ---
  function init() {
    updateSectorBadges();
    setupSectorFinder();

    // Atualizar badges periodicamente e em eventos
    window.addEventListener('storage', updateSectorBadges);
    window.addEventListener('inventoryupdated', updateSectorBadges);

    // Observar mutações nas tabelas para atualizar badges automaticamente quando itens forem inseridos ou deletados
    const observer = new MutationObserver(() => {
      updateSectorBadges();
    });

    ['inventory-tbody', 'tablets-inventory-tbody', 'prof-inventory-tbody'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.updateSectorBadges = updateSectorBadges;
  window.navigateToSector = navigateToSector;
})();

