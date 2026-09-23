// --- Sistema de Inventário de Equipamentos Escolares ---

(function () {
  'use strict';

  const STORAGE_KEY = 'escola_inventario_equipamentos_v1';

  // 5 Categorias Oficiais do Usuário
  const CATEGORIES = [
    'Funcionando normal mas faltando teclas',
    'Mal funcionamento e faltando teclas',
    'Problemas com erro de software',
    'Laptops quebrados',
    'Bom estado'
  ];

  // Estado Local
  let inventoryItems = [];
  let currentFilter = 'TODAS';
  let searchQuery = '';
  let activeInputMode = 'single'; // 'single' ou 'batch'
  let pieChart = null;

  // Elementos do DOM (dinâmicos)
  let form, inputCategoria, inputMarca, inputNumeracao, inputNumeracoesLote, inputObservacao;
  let tabSingle, tabBatch, modeSingleFields, modeBatchFields;
  let tableBody, emptyState, totalCountEl;
  let searchInput, filterCategorySelect;
  let countPerfeito, countSoftware, countTeclasNormal, countTeclasMal, countQuebrado;
  let btnExportExcel, btnExportCsv, btnBackupJson, btnRestoreJson, fileInputJson, btnClearAll;
  let editModal, editForm, editItemId, editCategoria, editMarca, editNumeracao, editObservacao, btnCloseModal, btnCancelEdit;

  function bindDOMElements() {
    form = document.getElementById('inventory-form');
    inputCategoria = document.getElementById('input-categoria');
    inputMarca = document.getElementById('input-marca');
    inputNumeracao = document.getElementById('input-numeracao');
    inputNumeracoesLote = document.getElementById('input-numeracoes-lote');
    inputObservacao = document.getElementById('input-observacao');
    
    tabSingle = document.getElementById('tab-single');
    tabBatch = document.getElementById('tab-batch');
    modeSingleFields = document.getElementById('mode-single-fields');
    modeBatchFields = document.getElementById('mode-batch-fields');

    tableBody = document.getElementById('inventory-tbody');
    emptyState = document.getElementById('empty-state');
    totalCountEl = document.getElementById('total-count');

    searchInput = document.getElementById('search-input');
    filterCategorySelect = document.getElementById('filter-category');

    // Stats Counters
    countPerfeito = document.getElementById('count-perfeito');
    countSoftware = document.getElementById('count-software');
    countTeclasNormal = document.getElementById('count-teclas-normal');
    countTeclasMal = document.getElementById('count-teclas-mal');
    countQuebrado = document.getElementById('count-quebrado');

    // Action Buttons
    btnExportExcel = document.getElementById('btn-export-excel');
    btnExportCsv = document.getElementById('btn-export-csv');
    btnBackupJson = document.getElementById('btn-backup-json');
    btnRestoreJson = document.getElementById('btn-restore-json');
    fileInputJson = document.getElementById('file-input-json');
    btnClearAll = document.getElementById('btn-clear-all');

    // Modal de Edição
    editModal = document.getElementById('edit-modal');
    editForm = document.getElementById('edit-form');
    editItemId = document.getElementById('edit-item-id');
    editCategoria = document.getElementById('edit-categoria');
    editMarca = document.getElementById('edit-marca');
    editNumeracao = document.getElementById('edit-numeracao');
    editObservacao = document.getElementById('edit-observacao');
    btnCloseModal = document.getElementById('modal-close');
    btnCancelEdit = document.getElementById('btn-cancel-edit');
  }

  let listenersAttached = false;

  // --- Inicialização ---
  function init() {
    bindDOMElements();
    if (!form || !tableBody) return;
    loadFromLocalStorage();
    if (!listenersAttached) {
      setupEventListeners();
      listenersAttached = true;
    }
    render();
  }

  // --- Carregar e Salvar LocalStorage ---
  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        inventoryItems = JSON.parse(data);
        // Migrar itens antigos se necessário
        inventoryItems.forEach(item => {
          if (item.categoria === 'Perfeito estado') {
            item.categoria = 'Bom estado';
          }
          if (item.categoria === 'Notebooks quebrados') {
            item.categoria = 'Laptops quebrados';
          }
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados do localStorage:', err);
      showToast('Erro ao carregar inventário salvo.', 'error');
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryItems));
      window.dispatchEvent(new Event('inventoryupdated'));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
      showToast('Erro ao salvar os dados!', 'error');
    }
  }

  // --- Configurar Event Listeners ---
  function setupEventListeners() {
    // Alternar abas de modo de entrada
    tabSingle.addEventListener('click', () => setInputMode('single'));
    tabBatch.addEventListener('click', () => setInputMode('batch'));

    // Submit do formulário principal
    form.addEventListener('submit', handleFormSubmit);

    // Filtros e Busca
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });

    filterCategorySelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      updateActiveCardStyle();
      renderTable();
    });

    // Clique nos Cards de Estatísticas para Filtrar (Apenas no Painel de Laptops)
    document.querySelectorAll('#panel-laptops .stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-cat');
        if (!cat) return;
        if (currentFilter === cat) {
          currentFilter = 'TODAS';
          filterCategorySelect.value = 'TODAS';
        } else {
          currentFilter = cat;
          filterCategorySelect.value = cat;
        }
        updateActiveCardStyle();
        renderTable();
      });
    });

    // Botões de Exportação e Backup
    btnExportExcel.addEventListener('click', exportToExcel);
    btnExportCsv.addEventListener('click', exportToCSV);
    btnBackupJson.addEventListener('click', exportBackupJSON);
    btnRestoreJson.addEventListener('click', () => fileInputJson.click());
    fileInputJson.addEventListener('change', importBackupJSON);
    btnClearAll.addEventListener('click', handleClearAll);

    // Eventos do Modal
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelEdit.addEventListener('click', closeModal);
    editForm.addEventListener('submit', handleEditSubmit);

    // Fechar modal clicando fora
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });
  }

  // Alternar entre modo Individual e em Lote
  function setInputMode(mode) {
    activeInputMode = mode;
    if (mode === 'single') {
      tabSingle.classList.add('active');
      tabBatch.classList.remove('active');
      modeSingleFields.classList.remove('hidden');
      modeBatchFields.classList.add('hidden');
      inputNumeracao.setAttribute('required', 'required');
      inputNumeracoesLote.removeAttribute('required');
    } else {
      tabBatch.classList.add('active');
      tabSingle.classList.remove('active');
      modeBatchFields.classList.remove('hidden');
      modeSingleFields.classList.add('hidden');
      inputNumeracoesLote.setAttribute('required', 'required');
      inputNumeracao.removeAttribute('required');
    }
  }

  // --- Verificação de Equipamentos Repetidos ---
  function findDuplicate(numeracao, currentId = null) {
    if (!numeracao) return null;
    const cleanNum = String(numeracao).trim().toLowerCase();
    if (!cleanNum) return null;
    return inventoryItems.find(item => {
      if (currentId && item.id === currentId) return false;
      return String(item.numeracao).trim().toLowerCase() === cleanNum;
    }) || null;
  }

  // --- Adicionar Item ou Lote ---
  function handleFormSubmit(e) {
    e.preventDefault();

    const categoria = inputCategoria.value;
    const marca = inputMarca.value.trim();
    const observacao = inputObservacao.value.trim();

    if (!categoria || !marca) {
      showToast('Por favor, preencha a categoria e a marca.', 'error');
      return;
    }

    const nowStr = new Date().toLocaleDateString('pt-BR');

    if (activeInputMode === 'single') {
      const numeracao = inputNumeracao.value.trim();
      if (!numeracao) {
        showToast('Digite a numeração do equipamento.', 'error');
        return;
      }

      const duplicate = findDuplicate(numeracao);
      if (duplicate) {
        showToast(`O equipamento nº "${numeracao}" já está cadastrado (${duplicate.marca} - ${duplicate.categoria})!`, 'error');
        inputNumeracao.focus();
        inputNumeracao.select();
        return;
      }

      addItem({
        id: generateUniqueId(),
        categoria,
        marca,
        numeracao,
        observacao,
        createdAt: nowStr
      });

      showToast(`Equipamento ${marca} nº ${numeracao} adicionado!`, 'success');
      inputNumeracao.value = '';
      inputNumeracao.focus();
    } else {
      // Modo em Lote
      const rawText = inputNumeracoesLote.value.trim();
      if (!rawText) {
        showToast('Digite as numerações do lote.', 'error');
        return;
      }

      const parsedNumbers = parseBatchNumbers(rawText);

      if (parsedNumbers.length === 0) {
        showToast('Nenhuma numeração válida encontrada no lote.', 'error');
        return;
      }

      const seenInBatch = new Set();
      const toAdd = [];
      const duplicates = [];

      parsedNumbers.forEach(num => {
        const clean = String(num).trim();
        const cleanLower = clean.toLowerCase();

        if (seenInBatch.has(cleanLower)) {
          if (!duplicates.includes(clean)) duplicates.push(clean);
          return;
        }
        seenInBatch.add(cleanLower);

        const existing = findDuplicate(clean);
        if (existing) {
          if (!duplicates.includes(clean)) duplicates.push(clean);
        } else {
          toAdd.push(clean);
        }
      });

      if (toAdd.length === 0) {
        showToast(`Todos os equipamentos informados (${duplicates.join(', ')}) já estão cadastrados!`, 'error');
        return;
      }

      toAdd.forEach(num => {
        addItem({
          id: generateUniqueId(),
          categoria,
          marca,
          numeracao: num,
          observacao,
          createdAt: nowStr
        }, false); // Não renderiza em cada iteração para dar performance
      });

      saveToLocalStorage();
      render();

      if (duplicates.length > 0) {
        const previewDupes = duplicates.slice(0, 5).join(', ') + (duplicates.length > 5 ? '...' : '');
        showToast(`${toAdd.length} equipamentos cadastrados! ${duplicates.length} repetidos foram bloqueados (${previewDupes}).`, 'warning');
      } else {
        showToast(`${toAdd.length} equipamentos da marca ${marca} cadastrados em lote!`, 'success');
      }

      inputNumeracoesLote.value = '';
      inputNumeracoesLote.focus();
    }
  }

  // Função auxiliar para parsear texto de lote (ex: "01, 02, 03" ou "10-15" ou "1 a 5")
  function parseBatchNumbers(text) {
    const results = [];
    // Quebra por linhas, vírgulas, ponto e vírgula ou espaço extra
    const tokens = text.split(/[\n,;]+/);

    tokens.forEach(token => {
      const trimmed = token.trim();
      if (!trimmed) return;

      // Verificar se é um intervalo como 01-10 ou 1 a 10
      const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|a|até)\s*(\d+)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const padLen = rangeMatch[1].length; // Manter zeros à esquerda se houver (ex: 01, 02)

        if (start <= end && (end - start) <= 200) { // Trava de segurança para no máximo 200 por intervalo
          for (let i = start; i <= end; i++) {
            results.push(String(i).padStart(padLen, '0'));
          }
          return;
        }
      }

      // Adiciona o token normal se não for um range
      results.push(trimmed);
    });

    return results;
  }

  function addItem(item, shouldRender = true) {
    inventoryItems.unshift(item); // Adiciona no início da lista
    if (shouldRender) {
      saveToLocalStorage();
      render();
    }
  }

  function generateUniqueId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // --- Renderização e Atualização da Tela ---
  function render() {
    updateStats();
    updateActiveCardStyle();
    renderTable();
    updateChart();
  }

  // --- Atualização do Gráfico de Pizza ---
  function updateChart() {
    const counts = {
      'Bom estado': 0,
      'Problemas com erro de software': 0,
      'Funcionando normal mas faltando teclas': 0,
      'Mal funcionamento e faltando teclas': 0,
      'Laptops quebrados': 0
    };

    inventoryItems.forEach(item => {
      if (counts[item.categoria] !== undefined) {
        counts[item.categoria]++;
      }
    });

    const labels = [
      'Bom estado',
      'Erro de software',
      'Normal, sem teclas',
      'Mal func. + sem teclas',
      'Laptops quebrados'
    ];

    const dataValues = [
      counts['Bom estado'],
      counts['Problemas com erro de software'],
      counts['Funcionando normal mas faltando teclas'],
      counts['Mal funcionamento e faltando teclas'],
      counts['Laptops quebrados']
    ];

    const bgColors = [
      '#10b981', // Bom estado (Verde)
      '#3b82f6', // Erro de software (Azul)
      '#f59e0b', // Normal, sem teclas (Amarelo)
      '#f97316', // Mal func. + sem teclas (Laranja)
      '#ef4444'  // Laptops quebrados (Vermelho)
    ];

    const ctx = document.getElementById('inventory-pie-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (pieChart) {
      pieChart.data.datasets[0].data = dataValues;
      pieChart.update();
      pieChart.resize();
    } else {
      const customCanvasBackgroundColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
          const { ctx } = chart;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = options.color || '#1e293b';
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        }
      };

      const pieSlicePercentagesPlugin = {
        id: 'pieSlicePercentagesPlugin',
        afterDatasetsDraw(chart) {
          const { ctx, data } = chart;
          const dataset = data.datasets[0];
          const meta = chart.getDatasetMeta(0);
          const total = dataset.data.reduce((acc, val) => acc + val, 0);
          if (total === 0) return;

          meta.data.forEach((element, index) => {
            const val = dataset.data[index];
            if (val <= 0) return;
            const pct = ((val / total) * 100).toFixed(1) + '%';

            const { x, y } = element.tooltipPosition();

            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(pct, x, y);
            ctx.restore();
          });
        }
      };

      pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: bgColors,
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        plugins: [pieSlicePercentagesPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#475569',
                font: {
                  family: 'Inter',
                  size: 12
                },
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return ` ${label}: ${value} unidade(s) (${percentage}%)`;
                }
              }
            }
          }
        }
      });

      window.addEventListener('themechange', (e) => {
        if (!pieChart) return;
        const { textColor, borderColor } = e.detail;
        if (pieChart.options?.plugins?.legend?.labels) {
          pieChart.options.plugins.legend.labels.color = textColor;
        }
        if (pieChart.data?.datasets?.[0]) {
          pieChart.data.datasets[0].borderColor = borderColor;
        }
        pieChart.update();
      });
    }
  }

  // Função auxiliar para ordenar itens agrupados por Marca e em ORDEM CRESCENTE pela numeração
  function getSortedItems(items) {
    return [...items].sort((a, b) => {
      // 1º Critério: Agrupa por Marca (ex: Positivo primeiro, Multilaser depois)
      const brandCompare = a.marca.localeCompare(b.marca, 'pt-BR', { sensitivity: 'base' });
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // 2º Critério: Ordena numericamente a numeração em ordem crescente
      return a.numeracao.localeCompare(b.numeracao, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  function updateStats() {
    const counts = {
      'Bom estado': 0,
      'Problemas com erro de software': 0,
      'Funcionando normal mas faltando teclas': 0,
      'Mal funcionamento e faltando teclas': 0,
      'Laptops quebrados': 0
    };

    inventoryItems.forEach(item => {
      if (counts[item.categoria] !== undefined) {
        counts[item.categoria]++;
      }
    });

    countPerfeito.textContent = counts['Bom estado'];
    countSoftware.textContent = counts['Problemas com erro de software'];
    countTeclasNormal.textContent = counts['Funcionando normal mas faltando teclas'];
    countTeclasMal.textContent = counts['Mal funcionamento e faltando teclas'];
    countQuebrado.textContent = counts['Laptops quebrados'];

    totalCountEl.textContent = inventoryItems.length;
  }

  function updateActiveCardStyle() {
    document.querySelectorAll('#panel-laptops .stat-card').forEach(card => {
      const cat = card.getAttribute('data-cat');
      if (currentFilter === cat) {
        card.classList.add('active-filter');
      } else {
        card.classList.remove('active-filter');
      }
    });
  }

  function renderTable() {
    tableBody.innerHTML = '';

    // Filtragem
    let filtered = inventoryItems.filter(item => {
      const matchCat = currentFilter === 'TODAS' || item.categoria === currentFilter;
      
      let matchSearch = true;
      if (searchQuery) {
        const textStr = `${item.marca} ${item.numeracao} ${item.categoria} ${item.observacao}`.toLowerCase();
        matchSearch = textStr.includes(searchQuery);
      }

      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      return;
    } else {
      emptyState.style.display = 'none';
    }

    // ORDEM CRESCENTE: Ordena a lista de laptops numericamente de forma crescente
    const sortedFiltered = getSortedItems(filtered);

    sortedFiltered.forEach((item, index) => {
      const tr = document.createElement('tr');

      const badgeClass = getBadgeClass(item.categoria);
      const obsDisplay = item.observacao ? escapeHtml(item.observacao) : '<span style="color: var(--text-muted);">-</span>';

      tr.innerHTML = `
        <td><strong style="color: var(--text-muted);">${index + 1}</strong></td>
        <td><span class="brand-name">${escapeHtml(item.marca)}</span></td>
        <td><span class="item-number">${escapeHtml(item.numeracao)}</span></td>
        <td><span class="badge ${badgeClass}">${getCategoryEmoji(item.categoria)} ${escapeHtml(item.categoria)}</span></td>
        <td><span class="item-obs">${obsDisplay}</span></td>
        <td style="text-align: center;">
          <div class="action-btns">
            <button class="btn-action btn-edit" title="Editar" data-id="${item.id}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-action btn-delete" title="Excluir" data-id="${item.id}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      // Eventos dos botões de ação na linha
      tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(item.id));
      tr.querySelector('.btn-delete').addEventListener('click', () => deleteItem(item.id));

      tableBody.appendChild(tr);
    });
  }

  function getBadgeClass(categoria) {
    switch (categoria) {
      case 'Bom estado': return 'badge-perfeito';
      case 'Problemas com erro de software': return 'badge-software';
      case 'Funcionando normal mas faltando teclas': return 'badge-teclas-normal';
      case 'Mal funcionamento e faltando teclas': return 'badge-teclas-mal';
      case 'Laptops quebrados': return 'badge-quebrado';
      default: return '';
    }
  }

  function getCategoryEmoji(categoria) {
    switch (categoria) {
      case 'Bom estado': return '✅';
      case 'Problemas com erro de software': return '💻';
      case 'Funcionando normal mas faltando teclas': return '⌨️';
      case 'Mal funcionamento e faltando teclas': return '⚠️';
      case 'Laptops quebrados': return '❌';
      default: return '📦';
    }
  }

  // --- Exclusão e Edição ---
  function deleteItem(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Deseja remover o equipamento ${item.marca} nº ${item.numeracao}?`)) {
      inventoryItems = inventoryItems.filter(i => i.id !== id);
      saveToLocalStorage();
      render();
      showToast('Item removido com sucesso!', 'info');
    }
  }

  function handleClearAll() {
    if (inventoryItems.length === 0) {
      showToast('O inventário já está vazio.', 'info');
      return;
    }

    if (confirm('ATENÇÃO: Tem certeza que deseja apagar TODOS os equipamentos cadastrados no inventário? Essa ação não pode ser desfeita.')) {
      inventoryItems = [];
      saveToLocalStorage();
      render();
      showToast('Todo o inventário foi limpo.', 'info');
    }
  }

  function openEditModal(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    editItemId.value = item.id;
    editCategoria.value = item.categoria;
    editMarca.value = item.marca;
    editNumeracao.value = item.numeracao;
    editObservacao.value = item.observacao || '';

    editModal.classList.remove('hidden');
  }

  function closeModal() {
    editModal.classList.add('hidden');
  }

  function handleEditSubmit(e) {
    e.preventDefault();

    const id = editItemId.value;
    const itemIndex = inventoryItems.findIndex(i => i.id === id);

    if (itemIndex !== -1) {
      const newNumeracao = editNumeracao.value.trim();
      if (!newNumeracao) {
        showToast('Digite a numeração do equipamento.', 'error');
        return;
      }

      const duplicate = findDuplicate(newNumeracao, id);
      if (duplicate) {
        showToast(`Já existe outro equipamento cadastrado com o número "${newNumeracao}" (${duplicate.marca} - ${duplicate.categoria})!`, 'error');
        editNumeracao.focus();
        editNumeracao.select();
        return;
      }

      inventoryItems[itemIndex].categoria = editCategoria.value;
      inventoryItems[itemIndex].marca = editMarca.value.trim();
      inventoryItems[itemIndex].numeracao = newNumeracao;
      inventoryItems[itemIndex].observacao = editObservacao.value.trim();

      saveToLocalStorage();
      render();
      closeModal();
      showToast('Equipamento atualizado com sucesso!', 'success');
    }
  }

  // Função utilitária para extrair apenas a data (sem horário)
  function formatDateOnly(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    if (typeof dateStr === 'string' && dateStr.includes(',')) {
      return dateStr.split(',')[0].trim();
    }
    if (typeof dateStr === 'string' && dateStr.includes(' ')) {
      return dateStr.split(' ')[0].trim();
    }
    return dateStr;
  }

  // --- Exportação para Excel (.xlsx) com Gráfico de Pizza Embutido ---
  async function exportToExcel() {
    if (inventoryItems.length === 0) {
      showToast('Nenhum item cadastrado para exportar!', 'error');
      return;
    }

    try {
      showToast('Gerando planilha Excel com gráfico de pizza...', 'info');

      // Ordenar em ORDEM CRESCENTE (Marca e depois Numeração)
      const sortedItems = getSortedItems(inventoryItems);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laptops Escolares');

      // Configurar Colunas
      worksheet.columns = [
        { header: 'Marca do Laptop', key: 'marca', width: 22 },
        { header: 'Nº do Laptop / Patrimônio', key: 'numeracao', width: 28 },
        { header: 'Estado do Laptop', key: 'categoria', width: 44 },
        { header: 'Observações', key: 'observacao', width: 36 },
        { header: 'Data de Registro', key: 'createdAt', width: 18 }
      ];

      // Estilizar a Linha de Cabeçalho (Linha 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // Estilos de Categoria ARGB
      const categoryStyles = {
        'Bom estado': {
          bg: 'FFD1FAE5',
          fontColor: 'FF065F46'
        },
        'Problemas com erro de software': {
          bg: 'FFDBEAFE',
          fontColor: 'FF1E40AF'
        },
        'Funcionando normal mas faltando teclas': {
          bg: 'FFFEF3C7',
          fontColor: 'FF92400E'
        },
        'Mal funcionamento e faltando teclas': {
          bg: 'FFFFEDD5',
          fontColor: 'FF9A3412'
        },
        'Laptops quebrados': {
          bg: 'FFFEE2E2',
          fontColor: 'FF991B1B'
        }
      };

      // Adicionar Linhas de Dados
      sortedItems.forEach((item) => {
        const row = worksheet.addRow({
          marca: item.marca,
          numeracao: item.numeracao,
          categoria: item.categoria,
          observacao: item.observacao || '-',
          createdAt: formatDateOnly(item.createdAt)
        });

        row.height = 22;

        const catStyle = categoryStyles[item.categoria] || { bg: 'FFE2E8F0', fontColor: 'FF1E293B' };

        // Cel 1: Marca
        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

        // Cel 2: Numeração
        row.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        // Cel 3: Categoria com cor
        row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: catStyle.fontColor } };
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.bg } };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

        // Cel 4: Observações
        row.getCell(4).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
        row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

        // Cel 5: Data
        row.getCell(5).font = { name: 'Calibri', size: 10 };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

        // Bordas
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });
      });

      // Adicionar Tabela de Resumo abaixo dos dados
      const startSummaryRow = sortedItems.length + 3;

      const summaryHeaderRow = worksheet.getRow(startSummaryRow);
      summaryHeaderRow.height = 24;
      worksheet.mergeCells(`A${startSummaryRow}:D${startSummaryRow}`);
      const summaryTitleCell = worksheet.getCell(`A${startSummaryRow}`);
      summaryTitleCell.value = 'RESUMO DO INVENTÁRIO (DISTRIBUIÇÃO)';
      summaryTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const subHeaderRow = worksheet.getRow(startSummaryRow + 1);
      subHeaderRow.height = 20;
      worksheet.mergeCells(`A${startSummaryRow + 1}:B${startSummaryRow + 1}`);
      worksheet.getCell(`A${startSummaryRow + 1}`).value = 'Estado do Laptop';
      worksheet.getCell(`C${startSummaryRow + 1}`).value = 'Quantidade';
      worksheet.getCell(`D${startSummaryRow + 1}`).value = 'Porcentagem (%)';

      [`A${startSummaryRow + 1}`, `B${startSummaryRow + 1}`, `C${startSummaryRow + 1}`, `D${startSummaryRow + 1}`].forEach(cellRef => {
        const cell = worksheet.getCell(cellRef);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Contagem por categoria
      const catCounts = {
        'Bom estado': 0,
        'Problemas com erro de software': 0,
        'Funcionando normal mas faltando teclas': 0,
        'Mal funcionamento e faltando teclas': 0,
        'Laptops quebrados': 0
      };

      inventoryItems.forEach(item => {
        if (catCounts[item.categoria] !== undefined) {
          catCounts[item.categoria]++;
        }
      });

      const totalItems = inventoryItems.length;
      let currRowIdx = startSummaryRow + 2;

      Object.keys(catCounts).forEach(cat => {
        const count = catCounts[cat];
        const pct = totalItems > 0 ? ((count / totalItems) * 100).toFixed(1) + '%' : '0%';
        const catStyle = categoryStyles[cat];

        const row = worksheet.getRow(currRowIdx);
        row.height = 22;

        worksheet.mergeCells(`A${currRowIdx}:B${currRowIdx}`);
        worksheet.getCell(`A${currRowIdx}`).value = cat;
        worksheet.getCell(`C${currRowIdx}`).value = count;
        worksheet.getCell(`D${currRowIdx}`).value = pct;

        const cellA = worksheet.getCell(`A${currRowIdx}`);
        cellA.font = { name: 'Calibri', size: 10, bold: true, color: { argb: catStyle.fontColor } };
        cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.bg } };
        cellA.alignment = { horizontal: 'left', vertical: 'middle' };

        const cellB = worksheet.getCell(`B${currRowIdx}`);
        cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.bg } };

        worksheet.getCell(`C${currRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`D${currRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

        [`A${currRowIdx}`, `B${currRowIdx}`, `C${currRowIdx}`, `D${currRowIdx}`].forEach(cellRef => {
          worksheet.getCell(cellRef).border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });

        currRowIdx++;
      });

      // Embutir o GRÁFICO DE PIZZA (PNG) diretamente dentro da planilha Excel!
      if (pieChart) {
        const imageBase64 = pieChart.toBase64Image();
        const imageId = workbook.addImage({
          base64: imageBase64,
          extension: 'png'
        });

        worksheet.addImage(imageId, {
          tl: { col: 0, row: currRowIdx + 1 },
          ext: { width: 480, height: 310 }
        });
      }

      // Escrever arquivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventario_Laptops_Escola_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Planilha Excel com gráfico de pizza baixada com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      showToast('Ocorreu um erro ao gerar a planilha Excel.', 'error');
    }
  }

  // --- Exportação para CSV ---
  function exportToCSV() {
    if (inventoryItems.length === 0) {
      showToast('Nenhum item cadastrado para exportar!', 'error');
      return;
    }

    try {
      const sortedItems = getSortedItems(inventoryItems);
      let csvContent = '\uFEFF'; // BOM UTF-8 para o Excel abrir os acentos perfeitamente
      csvContent += 'Marca do Laptop;Nº do Laptop / Patrimônio;Estado do Laptop;Observações;Data de Registro\n';

      sortedItems.forEach(item => {
        const line = [
          `"${escapeCsvField(item.marca)}"`,
          `"${escapeCsvField(item.numeracao)}"`,
          `"${escapeCsvField(item.categoria)}"`,
          `"${escapeCsvField(item.observacao || '-')}"`,
          `"${escapeCsvField(formatDateOnly(item.createdAt))}"`
        ].join(';');
        csvContent += line + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventario_Laptops_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Arquivo CSV exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      showToast('Erro ao gerar arquivo CSV.', 'error');
    }
  }

  function escapeCsvField(str) {
    if (!str) return '';
    return str.replace(/"/g, '""');
  }

  // --- Exportar Backup JSON ---
  function exportBackupJSON() {
    if (inventoryItems.length === 0) {
      showToast('Nenhum item cadastrado para fazer backup!', 'error');
      return;
    }

    try {
      const dataStr = JSON.stringify(inventoryItems, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Backup_Inventario_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Backup baixado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      showToast('Erro ao gerar arquivo de backup.', 'error');
    }
  }

  // --- Importar Backup JSON ---
  function importBackupJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        if (Array.isArray(importedData)) {
          inventoryItems = importedData;
          saveToLocalStorage();
          render();
          showToast(`${importedData.length} equipamentos restaurados do backup!`, 'success');
        } else {
          showToast('Arquivo de backup inválido.', 'error');
        }
      } catch (err) {
        console.error('Erro ao ler arquivo de backup:', err);
        showToast('Formato de arquivo JSON inválido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- Sistema de Notificações Toast ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Sanitize HTML String
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expor para o navegador de abas SPA
  window.initLaptops = init;

  // Executar ao carregar a página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
