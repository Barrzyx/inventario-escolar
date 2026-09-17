// --- Sistema de Inventário de Tablets Escolares ---

(function () {
  'use strict';

  const STORAGE_KEY = 'escola_inventario_tablets_v1';

  // 2 Categorias Solicitadas
  const CATEGORIES = [
    'Bom estado',
    'Quebrado'
  ];

  // Estado Local
  let inventoryItems = [];
  let currentFilter = 'TODAS';
  let searchQuery = '';
  let activeInputMode = 'single';
  let pieChart = null;

  // Elementos do DOM (dinâmicos)
  let form, inputCategoria, inputNumeracao, inputNumeracoesLote, inputObservacao;
  let tabSingle, tabBatch, modeSingleFields, modeBatchFields;
  let tableBody, emptyState, totalCountEl;
  let searchInput, filterCategorySelect;
  let countBomEstado, countQuebrado;
  let btnExportExcel, btnExportCsv, btnBackupJson, btnRestoreJson, fileInputJson, btnClearAll;
  let editModal, editForm, editItemId, editCategoria, editNumeracao, editObservacao, btnCloseModal, btnCancelEdit;

  function bindDOMElements() {
    form = document.getElementById('tablets-form');
    inputCategoria = document.getElementById('tablets-input-categoria');
    inputNumeracao = document.getElementById('tablets-input-numeracao');
    inputNumeracoesLote = document.getElementById('tablets-input-numeracoes-lote');
    inputObservacao = document.getElementById('tablets-input-observacao');
    
    tabSingle = document.getElementById('tablets-tab-single');
    tabBatch = document.getElementById('tablets-tab-batch');
    modeSingleFields = document.getElementById('tablets-mode-single-fields');
    modeBatchFields = document.getElementById('tablets-mode-batch-fields');

    tableBody = document.getElementById('tablets-inventory-tbody');
    emptyState = document.getElementById('tablets-empty-state');
    totalCountEl = document.getElementById('tablets-total-count');

    searchInput = document.getElementById('tablets-search-input');
    filterCategorySelect = document.getElementById('tablets-filter-category');

    // Stats Counters
    countBomEstado = document.getElementById('tablets-count-bom-estado');
    countQuebrado = document.getElementById('tablets-count-quebrado');

    // Action Buttons
    btnExportExcel = document.getElementById('tablets-btn-export-excel');
    btnExportCsv = document.getElementById('tablets-btn-export-csv');
    btnBackupJson = document.getElementById('tablets-btn-backup-json');
    btnRestoreJson = document.getElementById('tablets-btn-restore-json');
    fileInputJson = document.getElementById('tablets-file-input-json');
    btnClearAll = document.getElementById('tablets-btn-clear-all');

    // Modal de Edição
    editModal = document.getElementById('tablets-edit-modal');
    editForm = document.getElementById('tablets-edit-form');
    editItemId = document.getElementById('tablets-edit-item-id');
    editCategoria = document.getElementById('tablets-edit-categoria');
    editNumeracao = document.getElementById('tablets-edit-numeracao');
    editObservacao = document.getElementById('tablets-edit-observacao');
    btnCloseModal = document.getElementById('tablets-modal-close');
    btnCancelEdit = document.getElementById('tablets-btn-cancel-edit');
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
      }
    } catch (err) {
      console.error('Erro ao carregar dados do localStorage:', err);
      showToast('Erro ao carregar inventário de tablets.', 'error');
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryItems));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
      showToast('Erro ao salvar os dados!', 'error');
    }
  }

  // --- Configurar Event Listeners ---
  function setupEventListeners() {
    tabSingle.addEventListener('click', () => setInputMode('single'));
    tabBatch.addEventListener('click', () => setInputMode('batch'));

    form.addEventListener('submit', handleFormSubmit);

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });

    filterCategorySelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      updateActiveCardStyle();
      renderTable();
    });

    document.querySelectorAll('#panel-tablets .stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-tab-cat');
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

    btnExportExcel.addEventListener('click', exportToExcel);
    btnExportCsv.addEventListener('click', exportToCSV);
    btnBackupJson.addEventListener('click', exportBackupJSON);
    btnRestoreJson.addEventListener('click', () => fileInputJson.click());
    fileInputJson.addEventListener('change', importBackupJSON);
    btnClearAll.addEventListener('click', handleClearAll);

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelEdit.addEventListener('click', closeModal);
    editForm.addEventListener('submit', handleEditSubmit);

    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });
  }

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

  // --- Verificação de Tablets Repetidos ---
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
    const observacao = inputObservacao.value.trim();

    if (!categoria) {
      showToast('Por favor, selecione o estado do tablet.', 'error');
      return;
    }

    const nowStr = new Date().toLocaleDateString('pt-BR');

    if (activeInputMode === 'single') {
      const numeracao = inputNumeracao.value.trim();
      if (!numeracao) {
        showToast('Digite a numeração do tablet.', 'error');
        return;
      }

      const duplicate = findDuplicate(numeracao);
      if (duplicate) {
        showToast(`O tablet nº "${numeracao}" já está cadastrado (${duplicate.categoria})!`, 'error');
        inputNumeracao.focus();
        inputNumeracao.select();
        return;
      }

      addItem({
        id: generateUniqueId(),
        categoria,
        numeracao,
        observacao,
        createdAt: nowStr
      });

      showToast(`Tablet nº ${numeracao} adicionado!`, 'success');
      inputNumeracao.value = '';
      inputNumeracao.focus();
    } else {
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
        showToast(`Todos os tablets informados (${duplicates.join(', ')}) já estão cadastrados!`, 'error');
        return;
      }

      toAdd.forEach(num => {
        addItem({
          id: generateUniqueId(),
          categoria,
          numeracao: num,
          observacao,
          createdAt: nowStr
        }, false);
      });

      saveToLocalStorage();
      render();

      if (duplicates.length > 0) {
        const previewDupes = duplicates.slice(0, 5).join(', ') + (duplicates.length > 5 ? '...' : '');
        showToast(`${toAdd.length} tablets cadastrados! ${duplicates.length} repetidos foram bloqueados (${previewDupes}).`, 'warning');
      } else {
        showToast(`${toAdd.length} tablets cadastrados em lote!`, 'success');
      }

      inputNumeracoesLote.value = '';
      inputNumeracoesLote.focus();
    }
  }

  function parseBatchNumbers(text) {
    const results = [];
    const tokens = text.split(/[\n,;]+/);

    tokens.forEach(token => {
      const trimmed = token.trim();
      if (!trimmed) return;

      const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|a|até)\s*(\d+)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const padLen = rangeMatch[1].length;

        if (start <= end && (end - start) <= 200) {
          for (let i = start; i <= end; i++) {
            results.push(String(i).padStart(padLen, '0'));
          }
          return;
        }
      }

      results.push(trimmed);
    });

    return results;
  }

  function addItem(item, shouldRender = true) {
    inventoryItems.unshift(item);
    if (shouldRender) {
      saveToLocalStorage();
      render();
    }
  }

  function generateUniqueId() {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function render() {
    updateStats();
    updateActiveCardStyle();
    renderTable();
    updateChart();
  }

  function updateChart() {
    const counts = {
      'Bom estado': 0,
      'Quebrado': 0
    };

    inventoryItems.forEach(item => {
      if (counts[item.categoria] !== undefined) {
        counts[item.categoria]++;
      }
    });

    const labels = ['Bom estado', 'Quebrado'];
    const dataValues = [counts['Bom estado'], counts['Quebrado']];
    const bgColors = ['#10b981', '#ef4444'];

    const ctx = document.getElementById('tablets-pie-chart');
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
            borderColor: '#1e293b',
            borderWidth: 2
          }]
        },
        plugins: [customCanvasBackgroundColor, pieSlicePercentagesPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            customCanvasBackgroundColor: {
              color: '#1e293b'
            },
            legend: {
              position: 'bottom',
              labels: {
                color: '#f8fafc',
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
    }
  }

  function getSortedItems(items) {
    return [...items].sort((a, b) => {
      return a.numeracao.localeCompare(b.numeracao, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  function updateStats() {
    const counts = {
      'Bom estado': 0,
      'Quebrado': 0
    };

    inventoryItems.forEach(item => {
      if (counts[item.categoria] !== undefined) {
        counts[item.categoria]++;
      }
    });

    countBomEstado.textContent = counts['Bom estado'];
    countQuebrado.textContent = counts['Quebrado'];
    totalCountEl.textContent = inventoryItems.length;
  }

  function updateActiveCardStyle() {
    document.querySelectorAll('#panel-tablets .stat-card').forEach(card => {
      const cat = card.getAttribute('data-tab-cat');
      if (currentFilter === cat) {
        card.classList.add('active-filter');
      } else {
        card.classList.remove('active-filter');
      }
    });
  }

  function renderTable() {
    tableBody.innerHTML = '';

    let filtered = inventoryItems.filter(item => {
      const matchCat = currentFilter === 'TODAS' || item.categoria === currentFilter;
      
      let matchSearch = true;
      if (searchQuery) {
        const textStr = `${item.numeracao} ${item.categoria} ${item.observacao || ''}`.toLowerCase();
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

    const sortedFiltered = getSortedItems(filtered);

    sortedFiltered.forEach((item, index) => {
      const tr = document.createElement('tr');

      const badgeClass = item.categoria === 'Bom estado' ? 'badge-perfeito' : 'badge-quebrado';
      const emoji = item.categoria === 'Bom estado' ? '✅' : '❌';
      const obsDisplay = item.observacao ? escapeHtml(item.observacao) : '<span style="color: var(--text-muted);">-</span>';

      tr.innerHTML = `
        <td><strong style="color: var(--text-muted);">${index + 1}</strong></td>
        <td><span class="item-number" style="font-size: 1rem; font-weight: 600;">${escapeHtml(item.numeracao)}</span></td>
        <td><span class="badge ${badgeClass}">${emoji} ${escapeHtml(item.categoria)}</span></td>
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

      tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(item.id));
      tr.querySelector('.btn-delete').addEventListener('click', () => deleteItem(item.id));

      tableBody.appendChild(tr);
    });
  }

  // --- Exclusão e Edição ---
  function deleteItem(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Deseja remover o tablet nº ${item.numeracao}?`)) {
      inventoryItems = inventoryItems.filter(i => i.id !== id);
      saveToLocalStorage();
      render();
      showToast('Tablet removido com sucesso!', 'info');
    }
  }

  function handleClearAll() {
    if (inventoryItems.length === 0) {
      showToast('O inventário de tablets já está vazio.', 'info');
      return;
    }

    if (confirm('ATENÇÃO: Tem certeza que deseja apagar TODOS os tablets cadastrados? Essa ação não pode ser desfeita.')) {
      inventoryItems = [];
      saveToLocalStorage();
      render();
      showToast('Inventário de tablets limpo.', 'info');
    }
  }

  function openEditModal(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    editItemId.value = item.id;
    editCategoria.value = item.categoria;
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
        showToast('Digite a numeração do tablet.', 'error');
        return;
      }

      const duplicate = findDuplicate(newNumeracao, id);
      if (duplicate) {
        showToast(`Já existe outro tablet cadastrado com o número "${newNumeracao}" (${duplicate.categoria})!`, 'error');
        editNumeracao.focus();
        editNumeracao.select();
        return;
      }

      inventoryItems[itemIndex].categoria = editCategoria.value;
      inventoryItems[itemIndex].numeracao = newNumeracao;
      inventoryItems[itemIndex].observacao = editObservacao.value.trim();

      saveToLocalStorage();
      render();
      closeModal();
      showToast('Tablet atualizado com sucesso!', 'success');
    }
  }

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

  // --- Exportação para Excel (.xlsx) com Gráfico Embutido ---
  async function exportToExcel() {
    if (inventoryItems.length === 0) {
      showToast('Nenhum tablet cadastrado para exportar!', 'error');
      return;
    }

    try {
      showToast('Gerando planilha Excel de tablets...', 'info');

      const sortedItems = getSortedItems(inventoryItems);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tablets Escolares');

      worksheet.columns = [
        { header: 'Nº do Tablet / Patrimônio', key: 'numeracao', width: 28 },
        { header: 'Estado do Tablet', key: 'categoria', width: 24 },
        { header: 'Observações', key: 'observacao', width: 36 },
        { header: 'Data de Registro', key: 'createdAt', width: 18 }
      ];

      // Cabeçalho estilizado em Ciano/Azul
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      const categoryStyles = {
        'Bom estado': { bg: 'FFD1FAE5', fontColor: 'FF065F46' },
        'Quebrado': { bg: 'FFFEE2E2', fontColor: 'FF991B1B' }
      };

      sortedItems.forEach((item) => {
        const row = worksheet.addRow({
          numeracao: item.numeracao,
          categoria: item.categoria,
          observacao: item.observacao || '-',
          createdAt: formatDateOnly(item.createdAt)
        });

        row.height = 22;
        const catStyle = categoryStyles[item.categoria] || { bg: 'FFE2E8F0', fontColor: 'FF1E293B' };

        // Cel 1: Numeração
        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // Cel 2: Categoria
        row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: catStyle.fontColor } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.bg } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        // Cel 3: Observações
        row.getCell(3).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

        // Cel 4: Data
        row.getCell(4).font = { name: 'Calibri', size: 10 };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });
      });

      // Tabela de Resumo
      const startSummaryRow = sortedItems.length + 3;

      const summaryHeaderRow = worksheet.getRow(startSummaryRow);
      summaryHeaderRow.height = 24;
      worksheet.mergeCells(`A${startSummaryRow}:D${startSummaryRow}`);
      const summaryTitleCell = worksheet.getCell(`A${startSummaryRow}`);
      summaryTitleCell.value = 'RESUMO DO INVENTÁRIO DE TABLETS';
      summaryTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const subHeaderRow = worksheet.getRow(startSummaryRow + 1);
      subHeaderRow.height = 20;
      worksheet.mergeCells(`A${startSummaryRow + 1}:B${startSummaryRow + 1}`);
      worksheet.getCell(`A${startSummaryRow + 1}`).value = 'Estado do Tablet';
      worksheet.getCell(`C${startSummaryRow + 1}`).value = 'Quantidade';
      worksheet.getCell(`D${startSummaryRow + 1}`).value = 'Porcentagem (%)';

      [`A${startSummaryRow + 1}`, `B${startSummaryRow + 1}`, `C${startSummaryRow + 1}`, `D${startSummaryRow + 1}`].forEach(cellRef => {
        const cell = worksheet.getCell(cellRef);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const catCounts = {
        'Bom estado': 0,
        'Quebrado': 0
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

        worksheet.getCell(`B${currRowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.bg } };
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

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventario_Tablets_Escola_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Planilha Excel de tablets baixada com sucesso!`, 'success');
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
      let csvContent = '\uFEFF';
      csvContent += 'Nº do Tablet / Patrimônio;Estado do Tablet;Observações;Data de Registro\n';

      sortedItems.forEach(item => {
        const line = [
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
      link.setAttribute('download', `Inventario_Tablets_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Arquivo CSV de tablets exportado com sucesso!', 'success');
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
      showToast('Nenhum tablet cadastrado para fazer backup!', 'error');
      return;
    }

    try {
      const dataStr = JSON.stringify(inventoryItems, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Backup_Inventario_Tablets_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Backup de tablets baixado com sucesso!', 'success');
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
          showToast(`${importedData.length} tablets restaurados do backup!`, 'success');
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

  // --- Toast ---
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
  window.initTablets = init;

  // Executar ao carregar a página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
