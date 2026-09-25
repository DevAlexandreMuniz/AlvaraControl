// Chaves para LocalStorage
const STORAGE_ALVARA_KEY = 'alvara_control_db_2026';
const STORAGE_CND_KEY = 'cnd_control_db_2026';

// Dados em memória
let records = JSON.parse(localStorage.getItem(STORAGE_ALVARA_KEY)) || initialDataset;
let cndRecords = JSON.parse(localStorage.getItem(STORAGE_CND_KEY)) || initialCndDataset;

// Módulo Atual ('alvaras' ou 'cnd')
let currentModule = 'alvaras';
let currentNavFilter = 'todos';

// Elementos da Interface
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const btnNovoText = document.getElementById('btnNovoText');
const typeChartTitle = document.getElementById('typeChartTitle');

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const tipoSelect = document.getElementById('tipoSelect');
const situacaoSelect = document.getElementById('situacaoSelect');

const statTotal = document.getElementById('statTotal');
const statEmDia = document.getElementById('statEmDia');
const statVerificar = document.getElementById('statVerificar');
const statVencido = document.getElementById('statVencido');

const modalForm = document.getElementById('modalForm');
const alvaraForm = document.getElementById('alvaraForm');
const btnNovo = document.getElementById('btnNovo');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnExport = document.getElementById('btnExport');
const modalTitle = document.getElementById('modalTitle');
const selectTipoForm = document.getElementById('tipo');

const mobileToggleBtn = document.getElementById('mobileToggleBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

let statusChartInstance = null;
let typeChartInstance = null;

// Menu Mobile
function toggleMobileSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}
mobileToggleBtn.addEventListener('click', toggleMobileSidebar);
sidebarOverlay.addEventListener('click', toggleMobileSidebar);

// Salvar no LocalStorage
function saveData() {
    if (currentModule === 'alvaras') {
        localStorage.setItem(STORAGE_ALVARA_KEY, JSON.stringify(records));
    } else {
        localStorage.setItem(STORAGE_CND_KEY, JSON.stringify(cndRecords));
    }
    render();
}

// Badge de Status
function getStatusBadge(situacao) {
    const s = (situacao || '').toUpperCase();
    if (s.includes('EM DIA') || s.includes('APROVADO') || s.includes('PAGO') || s.includes('OK')) {
        return `<span class="badge badge-em-dia"><i class="fa-solid fa-check"></i> ${situacao}</span>`;
    } else if (s.includes('VERIFICAR') || s.includes('PG') || s.includes('AG') || s.includes('CADASTRAR')) {
        return `<span class="badge badge-verificar"><i class="fa-solid fa-clock"></i> ${situacao}</span>`;
    } else if (s.includes('VENCIDO') || s.includes('EXI') || s.includes('PENDENTE')) {
        return `<span class="badge badge-vencido"><i class="fa-solid fa-triangle-exclamation"></i> ${situacao}</span>`;
    } else if (s.includes('DISPENSADO')) {
        return `<span class="badge badge-info"><i class="fa-solid fa-shield"></i> ${situacao}</span>`;
    } else {
        return `<span class="badge badge-tipo">${situacao || 'N/A'}</span>`;
    }
}

// Notificação WhatsApp
window.sendWhatsAppNotice = function(id) {
    const dataSet = currentModule === 'alvaras' ? records : cndRecords;
    const item = dataSet.find(r => r.id === id);
    if (!item) return;

    let phone = item.telefone ? item.telefone.replace(/\D/g, '') : '';
    if (!phone) {
        const inputPhone = prompt(`Digite o WhatsApp do cliente (${item.empresa}):`, '5569');
        if (!inputPhone) return;
        phone = inputPhone.replace(/\D/g, '');
        item.telefone = phone;
        saveData();
    }

    const docType = currentModule === 'alvaras' ? 'Alvará' : 'Certidão Negativa (CND)';
    const text = `Olá! A equipe da *Confiança Contabilidade* informa que o seu *${docType} de ${item.tipo}* (${item.empresa}) possui a seguinte atualização:\n\n` +
                 `📌 *Status:* ${item.situacao || 'Em acompanhamento'}\n` +
                 `📅 *Vencimento:* ${item.vencimento || 'A definir'}\n` +
                 (item.observacoes ? `📝 *Obs:* ${item.observacoes}\n` : '') +
                 `\nQualquer dúvida, estamos à disposição!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

// Gráficos
function updateCharts(emDia, verificar, vencido, dispensado, porTipo) {
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Em Dia / Aprovado', 'Verificar / Pgto', 'Vencido / Pendente', 'Dispensado'],
            datasets: [{
                data: [emDia, verificar, vencido, dispensado],
                backgroundColor: ['#15803d', '#ca8a04', '#b91c1c', '#0369a1'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } }
        }
    });

    const ctxType = document.getElementById('typeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();

    typeChartInstance = new Chart(ctxType, {
        type: 'bar',
        data: {
            labels: Object.keys(porTipo),
            datasets: [{
                label: 'Quantidade',
                data: Object.values(porTipo),
                backgroundColor: '#0a4d8c',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Configurar opções do filtro e formulário
function updateSelectOptions() {
    if (currentModule === 'alvaras') {
        tipoSelect.innerHTML = `
            <option value="">Todos os Tipos de Alvará</option>
            <option value="Funcionamento">Funcionamento</option>
            <option value="Sanitário">Sanitário</option>
            <option value="Ambiental">Ambiental</option>
            <option value="Bombeiros">Bombeiros (CBMRO)</option>
        `;
        selectTipoForm.innerHTML = `
            <option value="Funcionamento">Funcionamento</option>
            <option value="Sanitário">Sanitário</option>
            <option value="Ambiental">Ambiental</option>
            <option value="Bombeiros">Bombeiros (CBMRO)</option>
        `;
    } else {
        tipoSelect.innerHTML = `
            <option value="">Todas as CNDs</option>
            <option value="CND Federal">CND Federal</option>
            <option value="CND Estadual">CND Estadual</option>
            <option value="CND Municipal">CND Municipal</option>
            <option value="CND FGTS">CND FGTS</option>
            <option value="CND Trabalhista">CND Trabalhista</option>
        `;
        selectTipoForm.innerHTML = `
            <option value="CND Federal">CND Federal</option>
            <option value="CND Estadual">CND Estadual</option>
            <option value="CND Municipal">CND Municipal</option>
            <option value="CND FGTS">CND FGTS</option>
            <option value="CND Trabalhista">CND Trabalhista</option>
        `;
    }
}

// Renderizar Painel
function render() {
    const dataSet = currentModule === 'alvaras' ? records : cndRecords;

    const searchTerm = searchInput.value.toLowerCase();
    const selectedTipo = tipoSelect.value;
    const selectedSituacao = situacaoSelect.value;

    let filtered = dataSet.filter(item => {
        const matchesSearch = item.empresa.toLowerCase().includes(searchTerm) || 
                              (item.cnpj && item.cnpj.toLowerCase().includes(searchTerm)) ||
                              (item.observacoes && item.observacoes.toLowerCase().includes(searchTerm));
        
        let matchesNav = true;
        if (currentModule === 'alvaras' && currentNavFilter !== 'todos') {
            matchesNav = item.tipo.toLowerCase() === currentNavFilter.toLowerCase();
        }

        let matchesTipo = true;
        if (selectedTipo) {
            matchesTipo = item.tipo === selectedTipo;
        }

        let matchesSituacao = true;
        if (selectedSituacao) {
            const s = (item.situacao || '').toUpperCase();
            if (selectedSituacao === 'EM DIA / APROVADO') {
                matchesSituacao = s.includes('EM DIA') || s.includes('APROVADO') || s.includes('PAGO') || s.includes('OK');
            } else if (selectedSituacao === 'VERIFICAR') {
                matchesSituacao = s.includes('VERIFICAR') || s.includes('PG') || s.includes('AG') || s.includes('CADASTRAR');
            } else if (selectedSituacao === 'VENCIDO') {
                matchesSituacao = s.includes('VENCIDO') || s.includes('EXI') || s.includes('PENDENTE');
            } else if (selectedSituacao === 'DISPENSADO') {
                matchesSituacao = s.includes('DISPENSADO');
            }
        }

        return matchesSearch && matchesNav && matchesTipo && matchesSituacao;
    });

    // Métricas
    statTotal.textContent = dataSet.length;
    let emDiaCount = 0, verificarCount = 0, vencidoCount = 0, dispensadoCount = 0;

    const porTipo = currentModule === 'alvaras' ? 
        { 'Funcionamento': 0, 'Sanitário': 0, 'Ambiental': 0, 'Bombeiros': 0 } :
        { 'CND Federal': 0, 'CND Estadual': 0, 'CND Municipal': 0, 'CND FGTS': 0, 'CND Trabalhista': 0 };

    dataSet.forEach(item => {
        const s = (item.situacao || '').toUpperCase();
        if (s.includes('EM DIA') || s.includes('APROVADO') || s.includes('PAGO') || s.includes('OK')) {
            emDiaCount++;
        } else if (s.includes('VERIFICAR') || s.includes('PG') || s.includes('AG') || s.includes('CADASTRAR')) {
            verificarCount++;
        } else if (s.includes('VENCIDO') || s.includes('EXI') || s.includes('PENDENTE')) {
            vencidoCount++;
        } else if (s.includes('DISPENSADO')) {
            dispensadoCount++;
        }

        if (porTipo[item.tipo] !== undefined) {
            porTipo[item.tipo]++;
        }
    });

    statEmDia.textContent = emDiaCount;
    statVerificar.textContent = verificarCount;
    statVencido.textContent = vencidoCount;

    updateCharts(emDiaCount, verificarCount, vencidoCount, dispensadoCount, porTipo);

    // Tabela
    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px;"><br></i><br>
                    Nenhum registro encontrado.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const docBtn = item.documentoUrl ? 
            `<a href="${item.documentoUrl}" target="_blank" class="btn-icon doc" title="Visualizar Documento"><i class="fa-solid fa-file-pdf"></i></a>` : 
            `<span style="color: var(--text-muted); font-size: 0.8rem;">Sem anexo</span>`;

        tr.innerHTML = `
            <td><strong>${item.empresa}</strong></td>
            <td>${item.cnpj || '-'}</td>
            <td><span class="badge badge-tipo">${item.tipo}</span></td>
            <td>${item.vencimento || '-'}</td>
            <td>${getStatusBadge(item.situacao)}</td>
            <td>${docBtn}</td>
            <td><small>${item.observacoes || '-'}</small></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon whatsapp" onclick="sendWhatsAppNotice(${item.id})" title="Notificar via WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                    <button class="btn-icon" onclick="editRecord(${item.id})" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteRecord(${item.id})" title="Excluir">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Alternar abas do menu lateral
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        currentNavFilter = item.getAttribute('data-filter');
        const module = item.getAttribute('data-module');

        if (module !== currentModule) {
            currentModule = module;
            if (currentModule === 'cnd') {
                pageTitle.textContent = 'Gestão de Certidões Negativas (CNDs)';
                pageSubtitle.textContent = 'Controle de certidões federais, estaduais, municipais e trabalhistas';
                btnNovoText.textContent = 'Nova CND';
                typeChartTitle.textContent = 'CNDs por Tipo / Órgão';
            } else {
                pageTitle.textContent = 'Painel Geral de Alvarás 2026';
                pageSubtitle.textContent = 'Gestão e acompanhamento do status de licenças dos clientes do escritório';
                btnNovoText.textContent = 'Novo Alvará';
                typeChartTitle.textContent = 'Alvarás por Órgão Licenciador';
            }
            updateSelectOptions();
        }

        render();
        if (window.innerWidth <= 992) {
            toggleMobileSidebar();
        }
    });
});

searchInput.addEventListener('input', render);
tipoSelect.addEventListener('change', render);
situacaoSelect.addEventListener('change', render);

// Modal
btnNovo.addEventListener('click', () => {
    modalTitle.textContent = currentModule === 'alvaras' ? 'Cadastrar Novo Alvará' : 'Cadastrar Nova CND';
    alvaraForm.reset();
    document.getElementById('recordId').value = '';
    modalForm.classList.add('active');
});

function closeModal() {
    modalForm.classList.remove('active');
}

btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

// Editar Registro
window.editRecord = function(id) {
    const dataSet = currentModule === 'alvaras' ? records : cndRecords;
    const item = dataSet.find(r => r.id === id);
    if (!item) return;

    document.getElementById('recordId').value = item.id;
    document.getElementById('empresa').value = item.empresa;
    document.getElementById('cnpj').value = item.cnpj || '';
    document.getElementById('telefone').value = item.telefone || '';
    document.getElementById('tipo').value = item.tipo;
    document.getElementById('vencimento').value = item.vencimento || '';
    document.getElementById('situacao').value = item.situacao || 'EM DIA';
    document.getElementById('documentoUrl').value = item.documentoUrl || '';
    document.getElementById('observacoes').value = item.observacoes || '';

    modalTitle.textContent = currentModule === 'alvaras' ? 'Editar Alvará' : 'Editar CND';
    modalForm.classList.add('active');
};

// Excluir Registro
window.deleteRecord = function(id) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        if (currentModule === 'alvaras') {
            records = records.filter(r => r.id !== id);
        } else {
            cndRecords = cndRecords.filter(r => r.id !== id);
        }
        saveData();
    }
};

// Submeter Formulário
alvaraForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('recordId').value;
    
    const recordData = {
        id: id ? parseInt(id) : Date.now(),
        empresa: document.getElementById('empresa').value,
        cnpj: document.getElementById('cnpj').value,
        telefone: document.getElementById('telefone').value,
        tipo: document.getElementById('tipo').value,
        vencimento: document.getElementById('vencimento').value,
        situacao: document.getElementById('situacao').value,
        documentoUrl: document.getElementById('documentoUrl').value,
        observacoes: document.getElementById('observacoes').value
    };

    const dataSet = currentModule === 'alvaras' ? records : cndRecords;

    if (id) {
        const index = dataSet.findIndex(r => r.id === parseInt(id));
        if (index !== -1) dataSet[index] = recordData;
    } else {
        dataSet.unshift(recordData);
    }

    saveData();
    closeModal();
});

// Exportar CSV
btnExport.addEventListener('click', () => {
    const dataSet = currentModule === 'alvaras' ? records : cndRecords;
    const fileName = currentModule === 'alvaras' ? 'alvaras_confianca.csv' : 'cnds_confianca.csv';

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Empresa;CNPJ;Telefone;Tipo;Vencimento;Situacao;DocumentoURL;Observacoes\n";

    dataSet.forEach(r => {
        csvContent += `"${r.empresa}";"${r.cnpj || ''}";"${r.telefone || ''}";"${r.tipo}";"${r.vencimento || ''}";"${r.situacao || ''}";"${r.documentoUrl || ''}";"${r.observacoes || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Inicialização
updateSelectOptions();
render();