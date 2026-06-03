// Controle de Estado Global da Aplicacao
const state = {
    allNotes: [],        // Todas as notas importadas do CSV
    filteredNotes: [],   // Notas filtradas do tecnico ativo
    activeTecnico: '',   // Tecnico selecionado
    groupedData: null,   // Dados retornados pelo algorithm.js (teams, unassigned, warnings)
    activeTeamId: null,  // ID da equipe selecionada para visualizacao
    map: null,           // Instancia do Leaflet Map
    layers: {
        notes: null,      // Marcadores de notas
        centroids: null,  // Marcadores de centroides
        routes: null,     // Polilinhas de rotas TSP
        circles: null     // Circulos do raio de atuacao
    },
    originalGroupedData: null, // Copia profunda original para restauracao
    unassignedSearch: '',      // Filtro de texto para notas nao atribuidas
    unassignedTypeFilter: '',  // Filtro de tipo para notas nao atribuidas
    mapMarkers: {},            // Mapeamento dinamico noteId -> Marker do Leaflet
    undoStack: [],
    routeStartPoint: null,
    lastImportReport: null
};

const CONTROL_BASE_POINT = {
    latitude: -9.58785171587649,
    longitude: -35.762584817772535,
    label: 'Base da Control no Tabuleiro'
};

function getTeamColor(teamId) {
    const safeId = Math.max(1, Number(teamId) || 1);
    const hue = Math.round(((safeId - 1) * 137.508) % 360);
    const saturationSteps = [84, 72, 90];
    const lightnessSteps = [48, 58, 42, 64];
    const saturation = saturationSteps[(safeId - 1) % saturationSteps.length];
    const lightness = lightnessSteps[(safeId - 1) % lightnessSteps.length];

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Dados do modelo CSV incorporados para o download offline instantaneo
const SAMPLE_CSV = `tecnico,nota,tipo,latitude,longitude
Tecnico A,1001,MDFC,-23.5489,-46.6388
Tecnico A,1002,MDFC,-23.5492,-46.6372
Tecnico A,1003,MDFC,-23.5475,-46.6355
Tecnico A,1004,MDFC,-23.5460,-46.6340
Tecnico A,1005,ALGC,-23.5510,-46.6310
Tecnico A,1006,ALGC,-23.5525,-46.6322
Tecnico A,1007,MDFC,-23.5502,-46.6366
Tecnico A,1008,MDFC,-23.5534,-46.6348
Tecnico A,1009,MDFC,-23.5448,-46.6320
Tecnico A,1010,MDFC,-23.5435,-46.6311
Tecnico A,1011,ALGC,-23.5452,-46.6360
Tecnico A,1012,ALGC,-23.5465,-46.6375
Tecnico A,1013,APRO,-23.5478,-46.6390
Tecnico A,1014,MDFC,-23.5508,-46.6288
Tecnico A,1015,MDFC,-23.5520,-46.6275
Tecnico A,1016,ALGC,-23.5532,-46.6295
Tecnico A,1017,ALGC,-23.5545,-46.6308
Tecnico A,1018,MDFC,-23.5558,-46.6330
Tecnico A,1019,MDFC,-23.5562,-46.6345
Tecnico A,1020,MDFC,-23.5570,-46.6360
Tecnico A,1021,ALDS,-23.5585,-46.6378
Tecnico A,1022,ALDS,-23.5592,-46.6395
Tecnico A,1023,MDFC,-23.5410,-46.6410
Tecnico A,1024,MDFC,-23.5422,-46.6425
Tecnico A,1025,ALGC,-23.5435,-46.6438
Tecnico A,1026,ALGC,-23.5448,-46.6450
Tecnico A,1027,MDFC,-23.5401,-46.6280
Tecnico A,1028,MDFC,-23.5392,-46.6292
Tecnico A,1029,ALGC,-23.5385,-46.6305
Tecnico A,1030,ALGC,-23.5378,-46.6318
Tecnico A,1031,MDFC,-23.5405,-46.6345
Tecnico A,1032,MDFC,-23.5395,-46.6360
Tecnico A,1033,MDFC,-23.5380,-46.6372
Tecnico A,1034,ALGC,-23.5365,-46.6385
Tecnico A,1035,ALGC,-23.5350,-46.6398
Tecnico A,1036,MDFC,-23.5498,-46.6452
Tecnico A,1037,MDFC,-23.5512,-46.6440
Tecnico A,1038,ALGC,-23.5528,-46.6430
Tecnico A,1039,ALGC,-23.5542,-46.6418
Tecnico A,1040,MDFC,-23.5560,-46.6465
Tecnico A,1041,MDFC,-23.5575,-46.6452
Tecnico A,1042,ALGC,-23.5588,-46.6438
Tecnico A,1043,ALGC,-23.5598,-46.6425
Tecnico A,1044,MDFC,-23.5610,-46.6402
Tecnico A,1045,MDFC,-23.5625,-46.6390
Tecnico A,1046,ALGC,-23.5638,-46.6375
Tecnico A,1047,ALGC,-23.5648,-46.6360
Tecnico A,1048,MDFC,-23.5480,-46.6210
Tecnico A,1049,MDFC,-23.5495,-46.6225
Tecnico A,1050,ALGC,-23.5510,-46.6238
Tecnico A,1051,ALGC,-23.5522,-46.6250
Tecnico A,1052,MDFC,-23.5458,-46.6202
Tecnico A,1053,MDFC,-23.5442,-46.6215
Tecnico A,1054,ALGC,-23.5430,-46.6230
Tecnico A,1055,ALGC,-23.5418,-46.6242
Tecnico A,1056,MDFC,-23.5605,-46.6315
Tecnico A,1057,MDFC,-23.5620,-46.6302
Tecnico A,1058,ALGC,-23.5632,-46.6288
Tecnico A,1059,ALGC,-23.5645,-46.6275
Tecnico A,1060,APRO,-23.5658,-46.6260
Tecnico B,2001,MDFC,-23.5805,-46.6520
Tecnico B,2002,MDFC,-23.5820,-46.6535
Tecnico B,2003,ALGC,-23.5835,-46.6548
Tecnico B,2004,ALGC,-23.5848,-46.6560
Tecnico B,2005,MDFC,-23.5788,-46.6502
Tecnico B,2006,MDFC,-23.5772,-46.6515
Tecnico B,2007,ALGC,-23.5760,-46.6530
Tecnico B,2008,ALGC,-23.5748,-46.6542
Tecnico C,3001,MDFC,-23.5205,-46.6120
Tecnico C,3002,MDFC,-23.5220,-46.6135
Tecnico C,3003,ALGC,-23.5235,-46.6148
Tecnico C,3004,ALGC,-23.5248,-46.6160`;

// Inicializacao dos elementos do DOM
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    setupMapResizer();
});

// 1. Inicializar o Leaflet Map
function initMap() {
    // Sao Paulo como centro padrao
    state.map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([-9.58785171, -35.76258481], 13);

    // Adiciona o tile do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(state.map);

    // Inicializa os grupos de camadas
    state.layers.notes = L.layerGroup().addTo(state.map);
    state.layers.centroids = L.layerGroup().addTo(state.map);
    state.layers.routes = L.layerGroup().addTo(state.map);
    state.layers.circles = L.layerGroup().addTo(state.map);
}

function setupMapResizer() {
    const resizer = document.getElementById('mapResizer');
    const workspace = document.querySelector('.workspace-panel');
    if (!resizer || !workspace) return;

    let dragging = false;

    const applySize = (clientY) => {
        const rect = workspace.getBoundingClientRect();
        const toolbarHeight = document.querySelector('.route-toolbar')?.offsetHeight || 0;
        const kpiHeight = document.getElementById('kpiBar').offsetHeight || 0;
        const resizerHeight = resizer.offsetHeight || 8;
        const minMap = 260;
        const minResults = 180;
        const rawMapHeight = clientY - rect.top - toolbarHeight;
        const maxMap = rect.height - toolbarHeight - kpiHeight - resizerHeight - minResults;
        const mapHeight = Math.max(minMap, Math.min(rawMapHeight, maxMap));
        const resultsHeight = rect.height - toolbarHeight - mapHeight - kpiHeight - resizerHeight;
        workspace.style.gridTemplateRows = `auto ${mapHeight}px auto ${resizerHeight}px ${resultsHeight}px`;
        state.map.invalidateSize();
    };

    resizer.addEventListener('mousedown', (event) => {
        dragging = true;
        event.preventDefault();
        document.body.style.cursor = 'row-resize';
    });

    window.addEventListener('mousemove', (event) => {
        if (!dragging) return;
        applySize(event.clientY);
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        state.map.invalidateSize();
    });
}

// 2. Configuracao de Listeners de Eventos
function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectTecnico = document.getElementById('selectTecnico');
    
    const inputNumTeams = document.getElementById('inputNumTeams');
    const inputRadius = document.getElementById('inputRadius');
    const inputNotesPerTeam = document.getElementById('inputNotesPerTeam');

    const btnGroup = document.getElementById('btnGroup');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    const btnSuggestConfig = document.getElementById('btnSuggestConfig');
    const btnUndoLastMove = document.getElementById('btnUndoLastMove');
    const btnFixLeftovers = document.getElementById('btnFixLeftovers');

    // Fechamento de Modais
    document.getElementById('btnModalClose').addEventListener('click', () => {
        document.getElementById('fallbackModal').style.display = 'none';
    });

    document.getElementById('btnModalConfirm').addEventListener('click', () => {
        document.getElementById('fallbackModal').style.display = 'none';
        renderResults();
    });

    // Download de Template CSV Ficticio
    btnDownloadTemplate.addEventListener('click', () => {
        downloadCSV(SAMPLE_CSV, 'modelo_notas_antigravity.csv');
    });

    btnSuggestConfig.addEventListener('click', () => {
        suggestIdealConfiguration();
    });

    // Upload por clique
    uploadArea.addEventListener('click', () => fileInput.click());

    // Upload por Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    // Sincronizacao dos Sliders de Parametros
    inputNumTeams.addEventListener('input', (e) => {
        document.getElementById('valNumTeams').textContent = e.target.value;
        renderViabilityPanel();
    });

    inputRadius.addEventListener('input', (e) => {
        document.getElementById('valRadius').textContent = e.target.value + 'm';
    });

    inputNotesPerTeam.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('valNotesPerTeam').textContent = val;
        
        // Ajusta a tabela de composicao para condizer com o novo total exigido
        redistributeComposition(val);
    });

    // Mudanca de Tecnico ativo
    selectTecnico.addEventListener('change', (e) => {
        state.activeTecnico = e.target.value;
        if (state.activeTecnico) {
            filterNotesByTecnico();
            buildCompositionTable();
        }
    });

    // Botao de Agrupamento
    btnGroup.addEventListener('click', () => {
        runGrouping();
    });

    // Botao de Exportacao
    btnExportCSV.addEventListener('click', () => {
        exportResultsCSV();
    });

    btnUndoLastMove.addEventListener('click', () => {
        undoLastAction();
    });

    btnFixLeftovers.addEventListener('click', () => {
        fixLeftovers();
    });

    // Filtro rapido de busca por ID de nota
    document.getElementById('searchUnassigned').addEventListener('input', (e) => {
        state.unassignedSearch = e.target.value.toLowerCase();
        renderUnassignedNotesList();
    });

    // Filtro rapido por tipo de nota
    document.getElementById('filterUnassigned').addEventListener('change', (e) => {
        state.unassignedTypeFilter = e.target.value;
        renderUnassignedNotesList();
    });

    // Botao de Restaurar Agrupamento Inicial (Desfaz alteracoes manuais)
    document.getElementById('btnResetAdjustments').addEventListener('click', () => {
        if (state.originalGroupedData) {
            // Faz clone profundo para nao arrastar referencias
            state.groupedData = JSON.parse(JSON.stringify(state.originalGroupedData));
            state.activeTeamId = state.groupedData.teams.length > 0 ? state.groupedData.teams[0].id : null;
            state.undoStack = [];
            updateUndoButton();
            
            // Forca a limpeza das pesquisas rapidas para nao confundir o usuario
            state.unassignedSearch = '';
            state.unassignedTypeFilter = '';
            document.getElementById('searchUnassigned').value = '';
            document.getElementById('filterUnassigned').value = '';

            renderResults();

            // Adiciona um aviso informativo no log
            state.groupedData.warnings.push({
                type: 'info',
                message: 'O planejamento foi restaurado com sucesso para a distribuicao matematica inicial.'
            });
            renderWarnings();
        }
    });
}

// 3. Processamento do arquivo CSV
function handleUploadedFile(file) {
    resetImportedData();
    const extension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
        let result;
        if (extension === 'xlsx') {
            result = parseXLSXData(e.target.result);
        } else if (extension === 'csv') {
            result = parseCSVData(e.target.result);
        } else {
            result = {
                ok: false,
                notes: [],
                errors: ['Formato nao suportado. Use .csv ou .xlsx.'],
                ignoredRows: 0,
                totalRows: 0
            };
        }
        applyImportResult(file.name, result);
        
    };
    if (extension === 'xlsx') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file, 'UTF-8');
    }
}

function parseCSVData(text) {
    return validateTabularRows(parseCSVRows(text));
}

function resetImportedData() {
    state.allNotes = [];
    state.filteredNotes = [];
    state.activeTecnico = '';
    state.groupedData = null;
    state.originalGroupedData = null;
    state.undoStack = [];
    state.mapMarkers = {};
    updateUndoButton();

    ['notes', 'centroids', 'routes', 'circles'].forEach(layer => {
        if (state.layers[layer]) state.layers[layer].clearLayers();
    });

    document.getElementById('selectTecnico').innerHTML = '<option value="">Aguardando carregamento de dados...</option>';
    document.getElementById('selectTecnico').disabled = true;
    document.getElementById('btnGroup').disabled = true;
    document.getElementById('btnSuggestConfig').disabled = true;
    document.getElementById('btnExportCSV').disabled = true;
    document.getElementById('btnResetAdjustments').disabled = true;
    document.getElementById('btnFixLeftovers').disabled = true;
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('kpiBar').style.display = 'none';

    const report = document.getElementById('importReport');
    if (report) {
        report.style.display = 'none';
        report.innerHTML = '';
    }
}

function applyImportResult(fileName, result) {
    state.lastImportReport = result;
    renderImportReport(result);

    if (!result.ok) {
        showToast('Arquivo nao importado. Corrija os erros exibidos no painel.', 'danger');
        return;
    }

    state.allNotes = result.notes;
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('fileInfo').style.display = 'flex';

    const selectTecnico = document.getElementById('selectTecnico');
    selectTecnico.disabled = false;
    populateTecnicoDropdown();
    selectTecnico.value = '__ALL__';
    state.activeTecnico = '__ALL__';
    filterNotesByTecnico();
    buildCompositionTable();

    document.getElementById('btnSuggestConfig').disabled = false;
    showToast(`${result.notes.length} notas validas importadas.`, result.errors.length ? 'warning' : 'info');
}

function renderImportReport(result) {
    const report = document.getElementById('importReport');
    if (!report) return;

    const statusClass = result.ok ? (result.errors.length ? 'import-warning' : 'import-ok') : 'import-danger';
    const shownErrors = result.errors.slice(0, 6);
    report.style.display = 'block';
    report.className = `import-report ${statusClass}`;
    report.innerHTML = `
        <div><strong>${result.ok ? 'Importacao validada' : 'Importacao bloqueada'}</strong></div>
        <div>${result.notes.length} validas de ${result.totalRows} linhas de dados. ${result.ignoredRows} ignoradas.</div>
        ${shownErrors.length ? `<ul>${shownErrors.map(error => `<li>${escapeHTML(error)}</li>`).join('')}</ul>` : ''}
        ${result.errors.length > shownErrors.length ? `<div>+ ${result.errors.length - shownErrors.length} outros erros.</div>` : ''}
    `;
}

function parseXLSXData(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
        return {
            ok: false,
            notes: [],
            errors: ['Leitor XLSX nao foi carregado. Verifique a conexao com a internet e recarregue a pagina.'],
            ignoredRows: 0,
            totalRows: 0
        };
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
    return validateTabularRows(rows);
}

function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                value += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }

    return rows;
}

function validateTabularRows(rows) {
    const errors = [];
    const notes = [];
    let ignoredRows = 0;
    const nonEmptyRows = rows.filter(row => row.some(cell => String(cell ?? '').trim() !== ''));

    if (nonEmptyRows.length === 0) {
        return { ok: false, notes, errors: ['Arquivo vazio.'], ignoredRows: 0, totalRows: 0 };
    }

    const headers = nonEmptyRows[0].map(header => normalizeHeader(header));
    const indexes = {
        tecnico: headers.indexOf('tecnico'),
        nota: headers.indexOf('nota'),
        tipo: headers.indexOf('tipo'),
        latitude: headers.indexOf('latitude'),
        longitude: headers.indexOf('longitude')
    };

    Object.entries(indexes).forEach(([name, idx]) => {
        if (idx === -1) errors.push(`Coluna obrigatoria ausente: ${name}.`);
    });

    if (errors.length) {
        return { ok: false, notes, errors, ignoredRows: Math.max(0, nonEmptyRows.length - 1), totalRows: Math.max(0, nonEmptyRows.length - 1) };
    }

    const seenNotes = new Set();
    for (let i = 1; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i];
        const rowNumber = i + 1;
        const nota = String(row[indexes.nota] ?? '').trim();
        const tipo = String(row[indexes.tipo] ?? '').trim().toUpperCase();
        const tecnico = String(row[indexes.tecnico] ?? '').trim() || '(Sem Tecnico)';
        const latitude = parseCoordinate(row[indexes.latitude]);
        const longitude = parseCoordinate(row[indexes.longitude]);
        const rowErrors = [];

        if (!nota) rowErrors.push('nota vazia');
        if (!tipo) rowErrors.push('tipo vazio');
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) rowErrors.push('latitude invalida');
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) rowErrors.push('longitude invalida');
        if (nota && seenNotes.has(nota)) rowErrors.push(`nota duplicada (${nota})`);

        if (rowErrors.length) {
            ignoredRows++;
            errors.push(`Linha ${rowNumber}: ${rowErrors.join(', ')}.`);
            continue;
        }

        seenNotes.add(nota);
        notes.push({ tecnico, nota, tipo, latitude, longitude });
    }

    return {
        ok: notes.length > 0,
        notes,
        errors: notes.length > 0 ? errors : ['Nenhuma linha valida encontrada.', ...errors],
        ignoredRows,
        totalRows: Math.max(0, nonEmptyRows.length - 1)
    };
}

function normalizeHeader(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function parseCoordinate(value) {
    if (typeof value === 'number') return value;
    return parseFloat(String(value ?? '').trim().replace(',', '.'));
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function populateTecnicoDropdown() {
    const select = document.getElementById('selectTecnico');
    select.innerHTML = '<option value="__ALL__">Todos os tecnicos e notas sem tecnico</option>';

    // Acha tecnicos unicos
    const tecnicos = [...new Set(state.allNotes.map(n => n.tecnico))].filter(Boolean);

    // Ordenacao: tecnicos nomeados em ordem alfabetica, '(Sem Tecnico)' sempre por ultimo
    tecnicos.sort((a, b) => {
        if (a === '(Sem Tecnico)') return 1;
        if (b === '(Sem Tecnico)') return -1;
        return a.localeCompare(b, 'pt-BR');
    });

    tecnicos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        if (t === '(Sem Tecnico)') {
            opt.textContent = ' (Sem Tecnico) - Agrupamento automatico por distancia';
        } else {
            opt.textContent = t;
        }
        select.appendChild(opt);
    });
}

function filterNotesByTecnico() {
    state.filteredNotes = state.activeTecnico === '__ALL__'
        ? [...state.allNotes]
        : state.allNotes.filter(n => n.tecnico === state.activeTecnico);
    
    // Zoom no mapa cobrindo a regiao geografica deste tecnico
    if (state.filteredNotes.length > 0) {
        const bounds = L.latLngBounds(state.filteredNotes.map(n => [n.latitude, n.longitude]));
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Popula filtro de tipos de notas nao atribuidas dinamicamente
    const filterSelect = document.getElementById('filterUnassigned');
    filterSelect.innerHTML = '<option value="">Todos</option>';
    const uniqueTypes = [...new Set(state.filteredNotes.map(n => n.tipo))].filter(Boolean);
    uniqueTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        filterSelect.appendChild(opt);
    });

    // Habilita o botao de agrupar
    document.getElementById('btnGroup').disabled = false;
}

// 4. Criacao da Tabela de Composicao (Cotas por Tipo)
function buildCompositionTable() {
    const builder = document.getElementById('compositionBuilder');
    builder.innerHTML = '';

    // Encontra todos os tipos de nota que este tecnico tem
    const uniqueTypes = [...new Set(state.filteredNotes.map(n => n.tipo))].filter(Boolean);
    
    if (uniqueTypes.length === 0) {
        builder.innerHTML = '<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 1rem 0;">Nenhum tipo de nota encontrado.</div>';
        return;
    }

    const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);

    // Distribui as cotas proporcionalmente para somar notesPerTeam
    const counts = {};
    uniqueTypes.forEach(t => {
        counts[t] = state.filteredNotes.filter(n => n.tipo === t).length;
    });

    // Ordena os tipos por maior frequencia
    const sortedTypes = uniqueTypes.sort((a, b) => counts[b] - counts[a]);

    let remaining = notesPerTeam;
    const initialComposition = {};

    sortedTypes.forEach((type, idx) => {
        if (idx === 0) {
            // Maior tipo leva a maior fatia
            const share = Math.min(remaining, Math.ceil(notesPerTeam * 0.6));
            initialComposition[type] = share;
            remaining -= share;
        } else if (idx === 1) {
            const share = Math.min(remaining, Math.ceil(notesPerTeam * 0.3));
            initialComposition[type] = share;
            remaining -= share;
        } else {
            const share = Math.min(remaining, 1);
            initialComposition[type] = share;
            remaining -= share;
        }
    });

    // Se ainda restou cota por preencher, da para o dominante
    if (remaining > 0 && sortedTypes[0]) {
        initialComposition[sortedTypes[0]] += remaining;
    }

    // Desenha as linhas de input
    sortedTypes.forEach(type => {
        const val = initialComposition[type] || 0;
        
        const row = document.createElement('div');
        row.className = 'comp-row';
        row.innerHTML = `
            <div class="comp-type">${type}</div>
            <input type="number" class="comp-input" data-type="${type}" min="0" max="${notesPerTeam}" value="${val}">
        `;
        
        builder.appendChild(row);
    });

    // Event listeners para os inputs de composicao
    const inputs = builder.querySelectorAll('.comp-input');
    inputs.forEach(input => {
        input.addEventListener('change', () => validateCompositionProgress());
    });

    validateCompositionProgress();
}

function redistributeComposition(newTotal) {
    const builder = document.getElementById('compositionBuilder');
    const inputs = builder.querySelectorAll('.comp-input');
    if (inputs.length === 0) return;

    let currentTotal = 0;
    inputs.forEach(input => {
        currentTotal += parseInt(input.value) || 0;
    });

    if (currentTotal === 0) return;

    let remaining = newTotal;
    inputs.forEach((input, index) => {
        const currentVal = parseInt(input.value) || 0;
        if (index === inputs.length - 1) {
            input.value = remaining;
        } else {
            const proportion = currentVal / currentTotal;
            const newVal = Math.min(remaining, Math.round(newTotal * proportion));
            input.value = newVal;
            remaining -= newVal;
        }
    });

    validateCompositionProgress();
}

function validateCompositionProgress() {
    const builder = document.getElementById('compositionBuilder');
    const inputs = builder.querySelectorAll('.comp-input');
    const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);

    let total = 0;
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });

    const progressSpan = document.getElementById('compositionProgress');
    progressSpan.textContent = `Total: ${total} / ${notesPerTeam}`;

    const btnGroup = document.getElementById('btnGroup');
    if (total === notesPerTeam) {
        progressSpan.style.color = 'var(--secondary)';
        btnGroup.disabled = false;
    } else {
        progressSpan.style.color = 'var(--accent-rose)';
        btnGroup.disabled = true;
    }

    // Atualiza painel de viabilidade em tempo real sempre que a composicao mudar
    renderViabilityPanel();
}

// 5. Executar Algoritmo de Agrupamento
function getRouteStartPointFromUser() {
    const useControlBase = window.confirm('O ponto de partida das equipes e na Base da Control no Tabuleiro?');
    if (useControlBase) {
        return { ...CONTROL_BASE_POINT };
    }

    const latInput = window.prompt('Informe a latitude do ponto de partida:', String(CONTROL_BASE_POINT.latitude));
    if (latInput === null) return null;
    const lngInput = window.prompt('Informe a longitude do ponto de partida:', String(CONTROL_BASE_POINT.longitude));
    if (lngInput === null) return null;

    const latitude = parseCoordinate(latInput);
    const longitude = parseCoordinate(lngInput);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        showToast('Coordenadas do ponto de partida invalidas.', 'danger');
        return null;
    }

    return { latitude, longitude, label: `Ponto informado (${latitude.toFixed(6)}, ${longitude.toFixed(6)})` };
}

function getSelectedScopeLabel() {
    if (state.activeTecnico === '__ALL__') return 'todos os tecnicos e notas sem tecnico';
    return state.activeTecnico || 'sem selecao';
}

function runGrouping() {
    if (state.filteredNotes.length === 0) return;
    const startPoint = getRouteStartPointFromUser();
    if (!startPoint) return;
    state.routeStartPoint = startPoint;

    const numTeams = parseInt(document.getElementById('inputNumTeams').value);
    const radius = parseInt(document.getElementById('inputRadius').value);
    const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);

    // Pega a composicao ativa da UI
    const composition = {};
    const compInputs = document.querySelectorAll('.comp-input');
    compInputs.forEach(input => {
        const count = parseInt(input.value) || 0;
        if (count > 0) {
            composition[input.getAttribute('data-type')] = count;
        }
    });

    // Roda o motor algoritmico do algorithm.js
    const result = NoteGrouper.groupNotes(state.filteredNotes, numTeams, notesPerTeam, composition, radius, startPoint);
    result.warnings.unshift({
        type: 'info',
        message: `Roteirizacao em massa usando ${state.filteredNotes.length} notas (${getSelectedScopeLabel()}). Ponto de partida: ${startPoint.label}.`
    });
    state.groupedData = result;
    state.activeTeamId = result.teams.length > 0 ? result.teams[0].id : null;
    state.undoStack = [];
    updateUndoButton();

    // Salva uma copia profunda (deep copy) original antes de sofrer qualquer edicao manual do usuario
    state.originalGroupedData = JSON.parse(JSON.stringify(result));

    // Reseta filtros de pesquisa
    state.unassignedSearch = '';
    state.unassignedTypeFilter = '';
    document.getElementById('searchUnassigned').value = '';
    document.getElementById('filterUnassigned').value = '';

    // Verifica se houve avisos graves ou fallbacks para alertar o usuario
    const hasWarnings = result.warnings.some(w => w.type === 'warning' || w.type === 'danger');
    
    if (hasWarnings) {
        showFallbackModal(result.warnings);
    } else {
        renderResults();
    }
}

function showFallbackModal(warnings) {
    const modal = document.getElementById('fallbackModal');
    const body = document.getElementById('fallbackModalBody');
    
    body.innerHTML = `
        <p style="margin-bottom: 1rem;">O algoritmo de agrupamento geografico identificou as seguintes condicoes na base para o raio selecionado:</p>
        <ul style="padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: var(--text-primary);">
            ${warnings.map(w => {
                let badge = '!';
                if (w.type === 'danger') badge = '!!';
                return `<li style="list-style-type: none; border-left: 3px solid ${w.type === 'danger' ? 'var(--accent-rose)' : 'var(--accent-orange)'}; padding-left: 0.5rem; margin-bottom: 0.4rem;">${badge} ${w.message}</li>`;
            }).join('')}
        </ul>
        <p style="margin-top: 1rem; font-weight: 500; color: var(--text-secondary);">
            Gostaria de prosseguir preenchendo as vagas com tipos disponiveis ou deseja fechar este modal para aumentar o raio limite ou diminuir o numero de equipes?
        </p>
    `;

    modal.style.display = 'flex';
}

// 6. Renderizar Resultados (Visualizacao e Mapa)
function renderResults() {
    if (!state.groupedData) return;

    // Habilita os botoes de controle
    document.getElementById('btnExportCSV').disabled = false;
    document.getElementById('btnResetAdjustments').disabled = false;
    document.getElementById('btnFixLeftovers').disabled = state.groupedData.unassignedNotes.length === 0;
    updateUndoButton();

    // Reseta mapeamento de marcadores ativos
    state.mapMarkers = {};

    // Limpar camadas anteriores do mapa
    state.layers.notes.clearLayers();
    state.layers.centroids.clearLayers();
    state.layers.routes.clearLayers();
    state.layers.circles.clearLayers();

    // 1. Renderizar lista de equipes na barra inferior
    renderTeamList();

    // 1B. Renderizar lista de notas orfas (nao atribuidas) na barra lateral
    renderUnassignedNotesList();

    // 2. Renderizar avisos no container
    renderWarnings();

    // 3. Renderizar todos os pontos no mapa (Alimenta state.mapMarkers)
    renderMapElements();

    // 4. Exibir detalhes da equipe ativa
    renderActiveTeamDetails();

    // 5. Renderizar Indicadores KPI em Tempo Real
    renderKPIs();
}

function renderTeamList() {
    const container = document.getElementById('teamListContainer');
    container.innerHTML = '';

    state.groupedData.teams.forEach(team => {
        const color = getTeamColor(team.id);
        
        const item = document.createElement('div');
        item.className = `team-item ${state.activeTeamId === team.id ? 'active' : ''}`;
        item.setAttribute('data-id', team.id);
        
        item.innerHTML = `
            <div class="team-item-info">
                <span class="team-name">${team.name}</span>
                <span class="team-stats">${team.assignedNotes.length} notas | Raio: ${Math.round(team.radius)}m</span>
            </div>
            <div class="team-color-badge" style="background-color: ${color}; box-shadow: 0 0 6px ${color};"></div>
        `;

        item.addEventListener('click', () => {
            state.activeTeamId = team.id;
            
            // Atualiza selecao na UI
            document.querySelectorAll('.team-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Renderizar detalhes
            renderActiveTeamDetails();

            // Zoom na equipe selecionada no mapa
            if (team.assignedNotes.length > 0) {
                const teamBounds = L.latLngBounds(team.assignedNotes.map(n => [n.latitude, n.longitude]));
                state.map.fitBounds(teamBounds, { padding: [60, 60] });
            }
        });

        container.appendChild(item);
    });
}

function renderUnassignedNotesList() {
    const container = document.getElementById('unassignedListContainer');
    container.innerHTML = '';

    if (!state.groupedData) return;

    // Filtra dinamicamente as notas com base na busca e tipos
    let filteredList = state.groupedData.unassignedNotes;

    if (state.unassignedSearch) {
        filteredList = filteredList.filter(n => 
            n.nota.toLowerCase().includes(state.unassignedSearch) ||
            n.tipo.toLowerCase().includes(state.unassignedSearch)
        );
    }

    if (state.unassignedTypeFilter) {
        filteredList = filteredList.filter(n => n.tipo === state.unassignedTypeFilter);
    }

    if (filteredList.length === 0) {
        const text = state.groupedData.unassignedNotes.length === 0 ? 'Nenhuma nota nao atribuida' : 'Nenhuma nota correspondente';
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem 0; font-size: 0.8rem; color: var(--text-muted);">
                ${text}
            </div>
        `;
        return;
    }

    filteredList.forEach(note => {
        const item = document.createElement('div');
        item.className = 'team-item';
        item.style.cursor = 'pointer';
        item.style.borderLeft = '3px solid var(--accent-rose)'; // Borda carmesim neon para destaque
        
        let selectOptions = `<option value="">Atribuir a...</option>`;
        state.groupedData.teams.forEach(t => {
            const capMax = parseInt(document.getElementById('inputNotesPerTeam').value);
            const capCount = t.assignedNotes.length;
            const isFull = capCount >= capMax;
            
            // Exibe a capacidade em tempo real e desabilita se estiver cheia
            selectOptions += `<option value="${t.id}" ${isFull ? 'disabled style="color: var(--text-muted);"' : ''}>
                ${t.name} (${capCount}/${capMax}${isFull ? ' - Cheia' : ''})
            </option>`;
        });

        item.innerHTML = `
            <div class="team-item-info" style="gap: 0.25rem;">
                <span class="team-name" style="font-size: 0.8rem; font-weight: 600;">Nota ${note.nota} <span style="font-size: 0.72rem; background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); padding: 1px 4px; border-radius: 4px; color: var(--accent-rose); font-weight: 700;">${note.tipo}</span></span>
                <span class="team-stats" style="font-size: 0.7rem;">Lat: ${note.latitude.toFixed(4)} | Lng: ${note.longitude.toFixed(4)}</span>
            </div>
            <select class="sidebar-assign-select" data-note-id="${note.nota}" style="padding: 0.2rem; font-size: 0.75rem; width: 110px; background: #1e293b; color: white; border: 1px solid var(--border-color); border-radius: 4px; outline: none; cursor: pointer;">
                ${selectOptions}
            </select>
        `;

        // Conexao Bidirecional Hover: Passar o mouse foca o mapa na nota orfa
        item.addEventListener('mouseenter', () => {
            const marker = state.mapMarkers[note.nota];
            if (marker) {
                marker.openPopup();
                state.map.setView(marker.getLatLng(), state.map.getZoom(), { animate: true });
            }
        });

        item.querySelector('.sidebar-assign-select').addEventListener('change', (e) => {
            const targetTeamId = e.target.value;
            if (targetTeamId) {
                moveNoteManually(note.nota, 'unassigned', targetTeamId);
            }
        });

        container.appendChild(item);
    });
}

function renderWarnings() {
    const container = document.getElementById('warningsContainer');
    container.innerHTML = '';

    if (state.groupedData.warnings.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Agrupamento otimizado com sucesso! Todas as restricoes e cotas geograficas foram 100% atendidas.
            </div>
        `;
        return;
    }

    state.groupedData.warnings.forEach(w => {
        const div = document.createElement('div');
        div.className = `alert alert-${w.type === 'danger' ? 'danger' : w.type === 'warning' ? 'warning' : 'info'}`;
        
        let icon = '';
        if (w.type === 'danger') {
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`;
        } else if (w.type === 'warning') {
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;
        } else {
            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>`;
        }

        div.innerHTML = `${icon} <span>${w.message}</span>`;
        container.appendChild(div);
    });
}

function renderMapElements() {
    // 1. Renderizar notas nao atribuidas (Sobras) com Popup interativo
    state.groupedData.unassignedNotes.forEach(note => {
        let selectOptions = `<option value="">Atribuir a...</option>`;
        state.groupedData.teams.forEach(t => {
            selectOptions += `<option value="${t.id}">${t.name}</option>`;
        });

        const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #f8fafc; background: #0f172a; padding: 4px;">
                <b style="color: var(--accent-rose); display: block; margin-bottom: 4px;">! Nota Nao Atribuida: ${note.nota}</b>
                <b>Tipo:</b> ${note.tipo}<br>
                <b>Coordenadas:</b> ${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)}<br>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Atribuir a Equipe:</label>
                    <select class="map-assign-select" data-note-id="${note.nota}" style="padding: 0.3rem; font-size: 0.75rem; width: 100%; background: #1e293b; color: white; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; outline: none;">
                        ${selectOptions}
                    </select>
                </div>
            </div>
        `;

        const marker = L.circleMarker([note.latitude, note.longitude], {
            radius: 8, // Ligeiramente maior para excelente visibilidade
            fillColor: '#f43f5e', // Rosa/Vermelho Carmesim brilhante de altissimo contraste
            color: '#ffffff', // Borda branca de destaque
            weight: 2.5,
            fillOpacity: 0.95
        })
        .addTo(state.layers.notes)
        .bindPopup(popupContent);

        // Registra o marcador para hover bidirecional (sidebar <-> mapa)
        state.mapMarkers[note.nota] = marker;

        marker.on('popupopen', (e) => {
            const select = e.popup.getElement().querySelector('.map-assign-select');
            if (select) {
                select.addEventListener('change', (evt) => {
                    const targetTeamId = evt.target.value;
                    if (targetTeamId) {
                        state.map.closePopup();
                        moveNoteManually(note.nota, 'unassigned', targetTeamId);
                    }
                });
            }
        });
    });

    // 2. Renderizar cada equipe (notas, rotas, centroides e circulos)
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length === 0) return;

        const color = getTeamColor(team.id);

        // Desenhar Circulo do Raio de Acao da Equipe (a partir do centroide geografico calculado)
        L.circle([team.centroid.latitude, team.centroid.longitude], {
            radius: team.radius || 10,
            fillColor: color,
            fillOpacity: 0.05,
            color: color,
            weight: 1.5,
            dashArray: '4, 4',
            interactive: false // Faz com que cliques atravessem a camada e atinjam os marcadores embaixo
        }).addTo(state.layers.circles);

        // Desenhar Centroide Fisico da Equipe (Ponto central de gravidade)
        L.marker([team.centroid.latitude, team.centroid.longitude], {
            icon: L.divIcon({
                className: 'custom-centroid-marker',
                html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 3px solid #0f172a; border-radius: 50%; box-shadow: 0 0 10px ${color}"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            })
        }).addTo(state.layers.centroids)
          .bindPopup(`<b>Centroide da ${team.name}</b><br>Notas: ${team.assignedNotes.length}<br>Raio: ${Math.round(team.radius)} metros.`);

        // Criar linha de Rota TSP
        const latlngs = team.assignedNotes.map(n => [n.latitude, n.longitude]);
        
        // Polilinha da Rota sugerida de 1 a N
        L.polyline(latlngs, {
            color: color,
            weight: 3.5,
            opacity: 0.85,
            lineJoin: 'round',
            dashArray: '1, 6',
            interactive: false // Impede que a linha da rota capture cliques bloqueando os marcadores
        }).addTo(state.layers.routes);

        // Desenhar notas atribuidas da equipe
        team.assignedNotes.forEach((note, index) => {
            const numLabel = index + 1; // Ordem de visita (TSP)
            
            const capMaxMap = parseInt(document.getElementById('inputNotesPerTeam').value);
            let selectOptions = `<option value="">Mover para...</option>`;
            state.groupedData.teams.forEach(t => {
                if (t.id !== team.id) {
                    const isFullMap = t.assignedNotes.length >= capMaxMap;
                    selectOptions += `<option value="${t.id}" ${isFullMap ? 'disabled' : ''}>${t.name} (${t.assignedNotes.length}/${capMaxMap}${isFullMap ? ' - Cheia' : ''})</option>`;
                }
            });
            selectOptions += `<option value="unassigned">Desalocar Nota (Nao Atribuida)</option>`;

            const popupContent = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #f8fafc; background: #0f172a; padding: 4px;">
                    <b style="color: ${color}; display: block; margin-bottom: 4px;">* Nota ${note.nota} (${note.tipo})</b>
                    <b>Equipe:</b> ${team.name}<br>
                    <b>Visita:</b> Sequencia #${numLabel}<br>
                    <b>Coordenadas:</b> ${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)}<br>
                    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Mapeamento Manual (Override):</label>
                        <select class="map-move-select" data-note-id="${note.nota}" style="padding: 0.3rem; font-size: 0.75rem; width: 100%; background: #1e293b; color: white; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; outline: none;">
                            ${selectOptions}
                        </select>
                    </div>
                </div>
            `;

            const assignedMarker = L.marker([note.latitude, note.longitude], {
                icon: L.divIcon({
                    className: 'custom-note-marker',
                    html: `
                        <div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 8px ${color};">
                            <span style="transform: rotate(45deg); font-size: 10px; font-weight: 700; color: white;">${numLabel}</span>
                        </div>
                        <div class="marker-label">${note.tipo} | ${note.nota}</div>
                    `,
                    iconSize: [28, 28],
                    iconAnchor: [14, 28]
                })
            }).addTo(state.layers.notes)
              .bindPopup(popupContent)
              .on('popupopen', (e) => {
                  const select = e.popup.getElement().querySelector('.map-move-select');
                  if (select) {
                      select.addEventListener('change', (evt) => {
                          const target = evt.target.value;
                          if (target) {
                              state.map.closePopup();
                              moveNoteManually(note.nota, team.id, target);
                          }
                      });
                  }
              });

            // Registra o marcador para hover bidirecional (sidebar <-> mapa)
            state.mapMarkers[note.nota] = assignedMarker;
        });
    });
}

function renderActiveTeamDetails() {
    const tableBody = document.getElementById('teamNotesTableBody');
    tableBody.innerHTML = '';

    if (!state.groupedData || !state.activeTeamId) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Processe o agrupamento para ver detalhes</td></tr>`;
        return;
    }

    const team = state.groupedData.teams.find(t => t.id === state.activeTeamId);
    
    // Atualizar titulo
    document.getElementById('activeTeamTitle').textContent = `Composicao sugerida para a ${team.name} (${team.assignedNotes.length} Notas)`;

    if (!team || team.assignedNotes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhuma nota atribuida a esta equipe.</td></tr>`;
        return;
    }

    team.assignedNotes.forEach((note, index) => {
        const distFromCentroid = GeocodingUtils.haversineDistance(
            team.centroid.latitude, team.centroid.longitude,
            note.latitude, note.longitude
        );

        const row = document.createElement('tr');
        
        // Criar opcoes de dropdown para transferencia manual (Override)
        const tableCapMax = parseInt(document.getElementById('inputNotesPerTeam').value);
        let selectOptions = `<option value="">Mover para...</option>`;
        state.groupedData.teams.forEach(t => {
            if (t.id !== team.id) {
                const isFullTable = t.assignedNotes.length >= tableCapMax;
                selectOptions += `<option value="${t.id}" ${isFullTable ? 'disabled' : ''}>${t.name} (${t.assignedNotes.length}/${tableCapMax}${isFullTable ? ' - Cheia' : ''})</option>`;
            }
        });
        selectOptions += `<option value="unassigned">Desalocar Nota</option>`;

        row.innerHTML = `
            <td style="font-weight: 700; color: var(--primary);">#${index + 1}</td>
            <td>${note.nota}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: 600;">${note.tipo}</span></td>
            <td>${note.latitude.toFixed(6)}</td>
            <td>${note.longitude.toFixed(6)}</td>
            <td>${Math.round(distFromCentroid)}m</td>
            <td>
                <select class="manual-move-select" data-note-id="${note.nota}" style="padding: 0.2rem; font-size: 0.75rem; width: 140px;">
                    ${selectOptions}
                </select>
            </td>
        `;

        // Event listener para transferencia manual de nota
        row.querySelector('.manual-move-select').addEventListener('change', (e) => {
            const target = e.target.value;
            if (!target) return;
            moveNoteManually(note.nota, team.id, target);
        });

        tableBody.appendChild(row);
    });
}

// 7. Transferencia Manual (Manual Override)
function moveNoteManually(noteId, fromTeamId, toTeamTarget) {
    // -- Guarda de capacidade: impede overbooking na equipe de destino --
    if (toTeamTarget !== 'unassigned') {
        const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);
        const targetId = parseInt(toTeamTarget);
        const targetTeam = state.groupedData.teams.find(t => t.id === targetId);
        if (targetTeam && targetTeam.assignedNotes.length >= notesPerTeam) {
            showToast(`X ${targetTeam.name} ja esta na capacidade maxima (${notesPerTeam} notas). Desaloque uma nota antes de adicionar.`, 'danger');
            return;
        }
    }

    pushUndoSnapshot();
    let movedNote = null;

    // 1. Remover a nota da origem (pode ser uma equipe ou a lista de orfas)
    if (fromTeamId === 'unassigned') {
        const noteIdx = state.groupedData.unassignedNotes.findIndex(n => n.nota === noteId);
        if (noteIdx !== -1) {
            [movedNote] = state.groupedData.unassignedNotes.splice(noteIdx, 1);
        }
    } else {
        const fromTeam = state.groupedData.teams.find(t => t.id === parseInt(fromTeamId));
        if (fromTeam) {
            const noteIdx = fromTeam.assignedNotes.findIndex(n => n.nota === noteId);
            if (noteIdx !== -1) {
                [movedNote] = fromTeam.assignedNotes.splice(noteIdx, 1);
            }
        }
    }

    if (!movedNote) return;

    // 2. Adicionar na equipe de destino ou em unassigned (orfa)
    if (toTeamTarget === 'unassigned') {
        state.groupedData.unassignedNotes.push(movedNote);
        const originName = fromTeamId === 'unassigned' ? 'Notas Nao Atribuidas' : `Equipe ${fromTeamId}`;
        state.groupedData.warnings.push({
            type: 'info',
            message: `A Nota ${noteId} foi desalocada manualmente de ${originName} para a lista de Notas Nao Atribuidas.`
        });
    } else {
        const toTeamId = parseInt(toTeamTarget);
        const toTeam = state.groupedData.teams.find(t => t.id === toTeamId);
        if (toTeam) {
            toTeam.assignedNotes.push(movedNote);
            const originName = fromTeamId === 'unassigned' ? 'Notas Nao Atribuidas' : `Equipe ${fromTeamId}`;
            state.groupedData.warnings.push({
                type: 'info',
                message: `Nota ${noteId} alocada manualmente de ${originName} para a ${toTeam.name}.`
            });
        }
    }

    // 3. Recalcular dados das equipes afetadas (Centroide, TSP, Raio)
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length > 0) {
            team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
            team.assignedNotes = GeocodingUtils.solveTSP(team.assignedNotes, state.routeStartPoint || team.centroid);
            team.radius = GeocodingUtils.calculateMaxRadius(team.assignedNotes, team.centroid);
        } else {
            team.radius = 0;
            team.centroid = null;
        }
    });

    // 4. Re-renderizar tudo
    renderResults();
}

// 8. Painel de Viabilidade Pre-Agrupamento
function pushUndoSnapshot() {
    if (!state.groupedData) return;
    state.undoStack.push(JSON.parse(JSON.stringify(state.groupedData)));
    if (state.undoStack.length > 20) state.undoStack.shift();
    updateUndoButton();
}

function undoLastAction() {
    if (state.undoStack.length === 0) return;
    state.groupedData = state.undoStack.pop();
    state.activeTeamId = state.groupedData.teams.length > 0 ? state.groupedData.teams[0].id : null;
    updateUndoButton();
    renderResults();
    showToast('Ultima acao desfeita.', 'info');
}

function updateUndoButton() {
    const btn = document.getElementById('btnUndoLastMove');
    if (btn) btn.disabled = state.undoStack.length === 0;
}

function suggestIdealConfiguration() {
    if (!state.filteredNotes || state.filteredNotes.length === 0) return;
    const notesPerTeam = Math.min(8, Math.max(4, parseInt(document.getElementById('inputNotesPerTeam').value) || 6));
    const suggestedTeams = Math.max(1, Math.ceil(state.filteredNotes.length / notesPerTeam));
    const teamSlider = document.getElementById('inputNumTeams');
    const notesSlider = document.getElementById('inputNotesPerTeam');

    notesSlider.value = notesPerTeam;
    document.getElementById('valNotesPerTeam').textContent = String(notesPerTeam);
    teamSlider.value = Math.min(parseInt(teamSlider.max), suggestedTeams);
    document.getElementById('valNumTeams').textContent = teamSlider.value;

    const counts = {};
    state.filteredNotes.forEach(note => {
        counts[note.tipo] = (counts[note.tipo] || 0) + 1;
    });
    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const total = state.filteredNotes.length;
    let remaining = notesPerTeam;
    const composition = {};

    sortedTypes.forEach((type, index) => {
        if (remaining <= 0) {
            composition[type] = 0;
            return;
        }
        const proportional = index === sortedTypes.length - 1
            ? remaining
            : Math.max(0, Math.round((counts[type] / total) * notesPerTeam));
        const value = Math.min(remaining, proportional);
        composition[type] = value;
        remaining -= value;
    });

    if (remaining > 0 && sortedTypes[0]) {
        composition[sortedTypes[0]] = (composition[sortedTypes[0]] || 0) + remaining;
    }

    document.querySelectorAll('.comp-input').forEach(input => {
        const type = input.getAttribute('data-type');
        input.value = composition[type] || 0;
    });
    validateCompositionProgress();
    showToast('Configuracao sugerida aplicada para roteirizacao em massa.', 'info');
}

function fixLeftovers() {
    if (!state.groupedData || state.groupedData.unassignedNotes.length === 0) {
        showToast('Nao ha sobras para corrigir.', 'info');
        return;
    }

    pushUndoSnapshot();
    const capacity = parseInt(document.getElementById('inputNotesPerTeam').value);
    const maxRadius = parseInt(document.getElementById('inputRadius').value);
    const safetyRadius = maxRadius * 1.5;
    let movedCount = 0;
    let blockedByRadius = 0;
    const remaining = [];

    state.groupedData.unassignedNotes.forEach(note => {
        let bestTeam = null;
        let bestCentroidDistance = Infinity;
        let bestRouteIncrease = Infinity;

        state.groupedData.teams.forEach(team => {
            if (team.assignedNotes.length >= capacity) return;
            if (!team.centroid && team.assignedNotes.length > 0) {
                team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
            }

            const referencePoint = team.centroid || state.routeStartPoint || note;
            const centroidDistance = GeocodingUtils.haversineDistance(
                referencePoint.latitude, referencePoint.longitude,
                note.latitude, note.longitude
            );

            if (centroidDistance > safetyRadius) return;

            const candidateNotes = [...team.assignedNotes, note];
            const centroid = GeocodingUtils.getCentroid(candidateNotes);
            const route = GeocodingUtils.solveTSP(candidateNotes, state.routeStartPoint || centroid);
            const increase = calculateRouteDistance(route) - calculateRouteDistance(team.assignedNotes);

            const isCloserToCentroid = centroidDistance < bestCentroidDistance;
            const isRouteTiebreaker = Math.abs(centroidDistance - bestCentroidDistance) < 1 && increase < bestRouteIncrease;

            if (isCloserToCentroid || isRouteTiebreaker) {
                bestCentroidDistance = centroidDistance;
                bestRouteIncrease = increase;
                bestTeam = team;
            }
        });

        if (bestTeam) {
            bestTeam.assignedNotes.push(note);
            movedCount++;
        } else {
            blockedByRadius++;
            remaining.push(note);
        }
    });

    state.groupedData.unassignedNotes = remaining;
    recalculateAllTeams();
    state.groupedData.warnings.push({
        type: movedCount > 0 ? 'info' : 'warning',
        message: movedCount > 0
            ? `${movedCount} nota(s) sem equipe foram encaixadas pela equipe com centroide mais proximo, respeitando o limite de seguranca de ${Math.round(safetyRadius)}m (1.5x o raio).`
            : `Nao foi possivel encaixar sobras sem ultrapassar capacidade ou limite de seguranca de ${Math.round(safetyRadius)}m.`
    });
    if (blockedByRadius > 0 && movedCount > 0) {
        state.groupedData.warnings.push({
            type: 'warning',
            message: `${blockedByRadius} nota(s) permaneceram sem equipe por capacidade cheia ou por ficarem acima de ${Math.round(safetyRadius)}m do centroide elegivel.`
        });
    }
    renderResults();
}

function recalculateAllTeams() {
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length > 0) {
            team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
            team.assignedNotes = GeocodingUtils.solveTSP(team.assignedNotes, state.routeStartPoint || team.centroid);
            team.radius = GeocodingUtils.calculateMaxRadius(team.assignedNotes, team.centroid);
        } else {
            team.centroid = null;
            team.radius = 0;
        }
    });
}

function calculateRouteDistance(notes) {
    let total = 0;
    for (let i = 0; i < notes.length - 1; i++) {
        total += GeocodingUtils.haversineDistance(
            notes[i].latitude, notes[i].longitude,
            notes[i + 1].latitude, notes[i + 1].longitude
        );
    }
    return total;
}

function renderViabilityPanel() {
    const panel = document.getElementById('viabilityPanel');
    if (!panel) return;

    if (!state.filteredNotes || state.filteredNotes.length === 0) {
        panel.style.display = 'none';
        return;
    }

    const numTeams = parseInt(document.getElementById('inputNumTeams').value);
    const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);
    const totalNeeded = numTeams * notesPerTeam;
    const totalAvailable = state.filteredNotes.length;
    const totalOk = totalAvailable >= totalNeeded;

    // Pega a composicao ativa da UI
    const compInputs = document.querySelectorAll('.comp-input');
    let hasComposition = false;
    let rows = '';

    compInputs.forEach(input => {
        const perTeam = parseInt(input.value) || 0;
        if (perTeam <= 0) return;
        hasComposition = true;
        const type = input.getAttribute('data-type');
        const needed = perTeam * numTeams;
        const available = state.filteredNotes.filter(n => n.tipo === type).length;
        const deficit = needed - available;
        const ok = deficit <= 0;
        rows += `
            <tr>
                <td><span class="viability-badge">${type}</span></td>
                <td>${needed}</td>
                <td>${available}</td>
                <td class="${ok ? 'viability-ok' : 'viability-warn'}">${ok ? 'OK OK' : `! -${deficit}`}</td>
            </tr>
        `;
    });

    if (!hasComposition) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="viability-summary ${totalOk ? 'vs-ok' : 'vs-warn'}">
            <span>Resumo: ${numTeams} equipes x ${notesPerTeam} notas = <strong>${totalNeeded} necessarias</strong></span>
            <span>${totalAvailable} disponiveis ${totalOk ? 'OK' : '!'}</span>
        </div>
        <table class="viability-table">
            <thead><tr><th>Tipo</th><th>Necessario</th><th>Disponivel</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// 9. Toast de Notificacao Temporaria
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    // Dois requestAnimationFrame para garantir a transicao CSS
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('toast-visible'));
    });

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 4500);
}

// 10. Indicadores KPI em Tempo Real
function renderKPIs() {
    if (!state.groupedData) return;

    // Exibir a barra de KPIs
    const kpiBar = document.getElementById('kpiBar');
    kpiBar.style.display = 'flex';

    const totalAssigned = state.groupedData.teams.reduce((sum, t) => sum + t.assignedNotes.length, 0);
    const totalUnassigned = state.groupedData.unassignedNotes.length;
    const total = totalAssigned + totalUnassigned;
    const assignedPct = total > 0 ? Math.round((totalAssigned / total) * 100) : 0;
    const unassignedPct = total > 0 ? Math.round((totalUnassigned / total) * 100) : 0;

    // Calcular distancia total de todas as rotas (soma das distancias consecutivas de cada equipe)
    let totalDistanceM = 0;
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length > 1) {
            for (let i = 0; i < team.assignedNotes.length - 1; i++) {
                const a = team.assignedNotes[i];
                const b = team.assignedNotes[i + 1];
                totalDistanceM += GeocodingUtils.haversineDistance(
                    a.latitude, a.longitude,
                    b.latitude, b.longitude
                );
            }
        }
    });

    const totalDistanceKm = (totalDistanceM / 1000).toFixed(1);

    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiAssigned').textContent = `${totalAssigned} (${assignedPct}%)`;
    document.getElementById('kpiUnassigned').textContent = `${totalUnassigned} (${unassignedPct}%)`;
    document.getElementById('kpiDistance').textContent = `${totalDistanceKm} km`;
}

// 9. Exportacao dos Dados para CSV
function exportResultsCSV() {
    if (!state.groupedData) return;

    let csvContent = 'tecnico,equipe,sequencia_visita,nota,tipo,latitude,longitude,distancia_ao_centro_m\n';

    // Notas agrupadas
    state.groupedData.teams.forEach(team => {
        team.assignedNotes.forEach((note, index) => {
            const dist = GeocodingUtils.haversineDistance(
                team.centroid.latitude, team.centroid.longitude,
                note.latitude, note.longitude
            );
            csvContent += `${state.activeTecnico},${team.name},${index + 1},${note.nota},${note.tipo},${note.latitude},${note.longitude},${Math.round(dist)}\n`;
        });
    });

    // Sobras/Notas nao atribuidas
    state.groupedData.unassignedNotes.forEach(note => {
        csvContent += `${state.activeTecnico},Sem Equipe,N/A,${note.nota},${note.tipo},${note.latitude},${note.longitude},N/A\n`;
    });

    downloadCSV(csvContent, `roteamento_agrupado_${state.activeTecnico.replace(/\s+/g, '_')}.csv`);
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
