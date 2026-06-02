// Controle de Estado Global da Aplicação
const state = {
    allNotes: [],        // Todas as notas importadas do CSV
    filteredNotes: [],   // Notas filtradas do técnico ativo
    activeTecnico: '',   // Técnico selecionado
    groupedData: null,   // Dados retornados pelo algorithm.js (teams, unassigned, warnings)
    activeTeamId: null,  // ID da equipe selecionada para visualização
    map: null,           // Instância do Leaflet Map
    layers: {
        notes: null,      // Marcadores de notas
        centroids: null,  // Marcadores de centróides
        routes: null,     // Polilinhas de rotas TSP
        circles: null     // Círculos do raio de atuação
    },
    // Cores Neon vibrantes para as equipes
    teamColors: [
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#a855f7', // Roxo
        '#f97316', // Laranja
        '#ec4899', // Rosa
        '#3b82f6', // Azul
        '#eab308', // Amarelo
        '#ef4444', // Vermelho
        '#14b8a6', // Teal
        '#6366f1', // Indigo
        '#84cc16', // Lime
        '#d946ef', // Fuchsia
        '#f43f5e', // Rose
        '#0284c7', // Sky Blue
        '#22c55e'  // Green
    ]
};

// Dados do modelo CSV incorporados para o download offline instantâneo
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

// Inicialização dos elementos do DOM
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
});

// 1. Inicializar o Leaflet Map
function initMap() {
    // São Paulo como centro padrão
    state.map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([-23.550520, -46.633308], 13);

    // Adiciona o tile do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(state.map);

    // Inicializa os grupos de camadas
    state.layers.notes = L.layerGroup().addTo(state.map);
    state.layers.centroids = L.layerGroup().addTo(state.map);
    state.layers.routes = L.layerGroup().addTo(state.map);
    state.layers.circles = L.layerGroup().addTo(state.map);
}

// 2. Configuração de Listeners de Eventos
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

    // Fechamento de Modais
    document.getElementById('btnModalClose').addEventListener('click', () => {
        document.getElementById('fallbackModal').style.display = 'none';
    });

    document.getElementById('btnModalConfirm').addEventListener('click', () => {
        document.getElementById('fallbackModal').style.display = 'none';
        renderResults();
    });

    // Download de Template CSV Fictício
    btnDownloadTemplate.addEventListener('click', () => {
        downloadCSV(SAMPLE_CSV, 'modelo_notas_antigravity.csv');
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

    // Sincronização dos Sliders de Parâmetros
    inputNumTeams.addEventListener('input', (e) => {
        document.getElementById('valNumTeams').textContent = e.target.value;
    });

    inputRadius.addEventListener('input', (e) => {
        document.getElementById('valRadius').textContent = e.target.value + 'm';
    });

    inputNotesPerTeam.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('valNotesPerTeam').textContent = val;
        
        // Ajusta a tabela de composição para condizer com o novo total exigido
        redistributeComposition(val);
    });

    // Mudança de Técnico ativo
    selectTecnico.addEventListener('change', (e) => {
        state.activeTecnico = e.target.value;
        if (state.activeTecnico) {
            filterNotesByTecnico();
            buildCompositionTable();
        }
    });

    // Botão de Agrupamento
    btnGroup.addEventListener('click', () => {
        runGrouping();
    });

    // Botão de Exportação
    btnExportCSV.addEventListener('click', () => {
        exportResultsCSV();
    });
}

// 3. Processamento do arquivo CSV
function handleUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSVData(text);
        
        // Atualiza a visualização do arquivo carregado
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileInfo').style.display = 'flex';
        
        // Ativa o seletor de técnicos
        const selectTecnico = document.getElementById('selectTecnico');
        selectTecnico.disabled = false;
        
        // Popula técnicos
        populateTecnicoDropdown();
    };
    reader.readAsText(file);
}

function parseCSVData(text) {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].toLowerCase().split(',');
    
    const tecnicoIdx = headers.indexOf('tecnico');
    const notaIdx = headers.indexOf('nota');
    const tipoIdx = headers.indexOf('tipo');
    const latIdx = headers.indexOf('latitude');
    const lngIdx = headers.indexOf('longitude');

    if (tecnicoIdx === -1 || notaIdx === -1 || tipoIdx === -1 || latIdx === -1 || lngIdx === -1) {
        alert('Erro no CSV! Certifique-se de ter as colunas: tecnico, nota, tipo, latitude, longitude.');
        return;
    }

    state.allNotes = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = lines[i].split(',');
        
        state.allNotes.push({
            tecnico: row[tecnicoIdx]?.trim(),
            nota: row[notaIdx]?.trim(),
            tipo: row[tipoIdx]?.trim().toUpperCase(),
            latitude: parseFloat(row[latIdx]),
            longitude: parseFloat(row[lngIdx])
        });
    }
}

function populateTecnicoDropdown() {
    const select = document.getElementById('selectTecnico');
    select.innerHTML = '<option value="">-- Selecione um Técnico --</option>';

    // Acha técnicos únicos
    const tecnicos = [...new Set(state.allNotes.map(n => n.tecnico))].filter(Boolean);
    tecnicos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
}

function filterNotesByTecnico() {
    state.filteredNotes = state.allNotes.filter(n => n.tecnico === state.activeTecnico);
    
    // Zoom no mapa cobrindo a região geográfica deste técnico
    if (state.filteredNotes.length > 0) {
        const bounds = L.latLngBounds(state.filteredNotes.map(n => [n.latitude, n.longitude]));
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Habilita o botão de agrupar
    document.getElementById('btnGroup').disabled = false;
}

// 4. Criação da Tabela de Composição (Cotas por Tipo)
function buildCompositionTable() {
    const builder = document.getElementById('compositionBuilder');
    builder.innerHTML = '';

    // Encontra todos os tipos de nota que este técnico tem
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

    // Ordena os tipos por maior frequência
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

    // Se ainda restou cota por preencher, dá para o dominante
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

    // Event listeners para os inputs de composição
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
}

// 5. Executar Algoritmo de Agrupamento
function runGrouping() {
    if (state.filteredNotes.length === 0) return;

    const numTeams = parseInt(document.getElementById('inputNumTeams').value);
    const radius = parseInt(document.getElementById('inputRadius').value);
    const notesPerTeam = parseInt(document.getElementById('inputNotesPerTeam').value);

    // Pega a composição ativa da UI
    const composition = {};
    const compInputs = document.querySelectorAll('.comp-input');
    compInputs.forEach(input => {
        const count = parseInt(input.value) || 0;
        if (count > 0) {
            composition[input.getAttribute('data-type')] = count;
        }
    });

    // Roda o motor algorítmico do algorithm.js
    const result = NoteGrouper.groupNotes(state.filteredNotes, numTeams, notesPerTeam, composition, radius);
    state.groupedData = result;
    state.activeTeamId = result.teams.length > 0 ? result.teams[0].id : null;

    // Verifica se houve avisos graves ou fallbacks para alertar o usuário
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
        <p style="margin-bottom: 1rem;">O algoritmo de agrupamento geográfico identificou as seguintes condições na base para o raio selecionado:</p>
        <ul style="padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: var(--text-primary);">
            ${warnings.map(w => {
                let badge = '⚠️';
                if (w.type === 'danger') badge = '🚨';
                return `<li style="list-style-type: none; border-left: 3px solid ${w.type === 'danger' ? 'var(--accent-rose)' : 'var(--accent-orange)'}; padding-left: 0.5rem; margin-bottom: 0.4rem;">${badge} ${w.message}</li>`;
            }).join('')}
        </ul>
        <p style="margin-top: 1rem; font-weight: 500; color: var(--text-secondary);">
            Gostaria de prosseguir preenchendo as vagas com tipos disponíveis ou deseja fechar este modal para aumentar o raio limite ou diminuir o número de equipes?
        </p>
    `;

    modal.style.display = 'flex';
}

// 6. Renderizar Resultados (Visualização e Mapa)
function renderResults() {
    if (!state.groupedData) return;

    // Habilita botão de exportar
    document.getElementById('btnExportCSV').disabled = false;

    // Limpar camadas anteriores do mapa
    state.layers.notes.clearLayers();
    state.layers.centroids.clearLayers();
    state.layers.routes.clearLayers();
    state.layers.circles.clearLayers();

    // 1. Renderizar lista de equipes na barra inferior
    renderTeamList();

    // 2. Renderizar avisos no container
    renderWarnings();

    // 3. Renderizar todos os pontos no mapa
    renderMapElements();

    // 4. Exibir detalhes da equipe ativa
    renderActiveTeamDetails();
}

function renderTeamList() {
    const container = document.getElementById('teamListContainer');
    container.innerHTML = '';

    state.groupedData.teams.forEach(team => {
        const color = state.teamColors[(team.id - 1) % state.teamColors.length];
        
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
            
            // Atualiza seleção na UI
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

function renderWarnings() {
    const container = document.getElementById('warningsContainer');
    container.innerHTML = '';

    if (state.groupedData.warnings.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Agrupamento otimizado com sucesso! Todas as restrições e cotas geográficas foram 100% atendidas.
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
    // 1. Renderizar notas não atribuídas (Sobras)
    state.groupedData.unassignedNotes.forEach(note => {
        L.circleMarker([note.latitude, note.longitude], {
            radius: 5,
            fillColor: '#6b7280', // Cinza
            color: '#374151',
            weight: 1,
            fillOpacity: 0.6
        })
        .addTo(state.layers.notes)
        .bindPopup(`<b>Nota Órfã: ${note.nota}</b><br>Tipo: ${note.tipo}<br>Status: Fora do raio limite configurado.`);
    });

    // 2. Renderizar cada equipe (notas, rotas, centróides e círculos)
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length === 0) return;

        const color = state.teamColors[(team.id - 1) % state.teamColors.length];

        // Desenhar Círculo do Raio de Ação da Equipe (a partir do centróide geográfico calculado)
        L.circle([team.centroid.latitude, team.centroid.longitude], {
            radius: team.radius || 10,
            fillColor: color,
            fillOpacity: 0.05,
            color: color,
            weight: 1.5,
            dashArray: '4, 4'
        }).addTo(state.layers.circles);

        // Desenhar Centróide Físico da Equipe (Ponto central de gravidade)
        L.marker([team.centroid.latitude, team.centroid.longitude], {
            icon: L.divIcon({
                className: 'custom-centroid-marker',
                html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 3px solid #0f172a; border-radius: 50%; box-shadow: 0 0 10px ${color}"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            })
        }).addTo(state.layers.centroids)
          .bindPopup(`<b>Centróide da ${team.name}</b><br>Notas: ${team.assignedNotes.length}<br>Raio: ${Math.round(team.radius)} metros.`);

        // Criar linha de Rota TSP
        const latlngs = team.assignedNotes.map(n => [n.latitude, n.longitude]);
        
        // Polilinha da Rota sugerida de 1 a N
        L.polyline(latlngs, {
            color: color,
            weight: 3.5,
            opacity: 0.85,
            lineJoin: 'round',
            dashArray: '1, 6'
        }).addTo(state.layers.routes);

        // Desenhar notas atribuídas da equipe
        team.assignedNotes.forEach((note, index) => {
            const numLabel = index + 1; // Ordem de visita (TSP)
            
            L.marker([note.latitude, note.longitude], {
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
              .bindPopup(`
                <b>Nota ${note.nota} (${note.tipo})</b><br>
                Equipe: ${team.name}<br>
                Sequência de Visita: #${numLabel}<br>
                Latitude: ${note.latitude}<br>
                Longitude: ${note.longitude}
              `);
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
    
    // Atualizar título
    document.getElementById('activeTeamTitle').textContent = `Composição sugerida para a ${team.name} (${team.assignedNotes.length} Notas)`;

    if (!team || team.assignedNotes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhuma nota atribuída a esta equipe.</td></tr>`;
        return;
    }

    team.assignedNotes.forEach((note, index) => {
        const distFromCentroid = GeocodingUtils.haversineDistance(
            team.centroid.latitude, team.centroid.longitude,
            note.latitude, note.longitude
        );

        const row = document.createElement('tr');
        
        // Criar opções de dropdown para transferência manual (Override)
        let selectOptions = `<option value="">Mover para...</option>`;
        state.groupedData.teams.forEach(t => {
            if (t.id !== team.id) {
                selectOptions += `<option value="${t.id}">${t.name}</option>`;
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

        // Event listener para transferência manual de nota
        row.querySelector('.manual-move-select').addEventListener('change', (e) => {
            const target = e.target.value;
            if (!target) return;
            moveNoteManually(note.nota, team.id, target);
        });

        tableBody.appendChild(row);
    });
}

// 7. Transferência Manual (Manual Override)
function moveNoteManually(noteId, fromTeamId, toTeamTarget) {
    const fromTeam = state.groupedData.teams.find(t => t.id === fromTeamId);
    
    // 1. Remover a nota da equipe de origem
    const noteIdx = fromTeam.assignedNotes.findIndex(n => n.nota === noteId);
    if (noteIdx === -1) return;
    
    const [movedNote] = fromTeam.assignedNotes.splice(noteIdx, 1);

    // 2. Adicionar na equipe de destino ou em unassigned
    if (toTeamTarget === 'unassigned') {
        state.groupedData.unassignedNotes.push(movedNote);
        state.groupedData.warnings.push({
            type: 'info',
            message: `A Nota ${noteId} foi desalocada manualmente da ${fromTeam.name}.`
        });
    } else {
        const toTeamId = parseInt(toTeamTarget);
        const toTeam = state.groupedData.teams.find(t => t.id === toTeamId);
        toTeam.assignedNotes.push(movedNote);
        
        state.groupedData.warnings.push({
            type: 'info',
            message: `Nota ${noteId} transferida manualmente da ${fromTeam.name} para a ${toTeam.name}.`
        });
    }

    // 3. Recalcular dados das equipes afetadas (Centróide, TSP, Raio)
    state.groupedData.teams.forEach(team => {
        if (team.assignedNotes.length > 0) {
            team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
            team.assignedNotes = GeocodingUtils.solveTSP(team.assignedNotes, team.centroid);
            team.radius = GeocodingUtils.calculateMaxRadius(team.assignedNotes, team.centroid);
        } else {
            team.radius = 0;
            team.centroid = null;
        }
    });

    // 4. Re-renderizar tudo
    renderResults();
}

// 8. Exportação dos Dados para CSV
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

    // Sobras/Notas não atribuídas
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
