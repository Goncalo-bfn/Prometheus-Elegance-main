/**
 * Prometheus Elegance — JavaScript do Painel Administrativo
 * Usuário: Yan | Senha: 7519
 */

const ADMIN_CREDENTIALS = {
  user: 'Yan',
  pass: '7519',
};

// Catálogo base de segurança
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Camiseta Dry-Fit Performance',
    price: 89.9,
    description: 'Tecido tecnológico de alta respirabilidade para treinos intensos.',
    category: 'Camisetas esportivas',
    image: './assets/images/camisetas.jpg',
  },
  {
    id: 'prod-2',
    name: 'Shorts Runner Ultra Flex',
    price: 69.9,
    description: 'Cós anatômico e tecido leve de secagem rápida com bolso funcional.',
    category: 'Shorts e bermudas',
    image: './assets/images/shorts.jpg',
  },
  {
    id: 'prod-3',
    name: 'Conjunto Moletom Slim Elegance',
    price: 189.9,
    description: 'Design moderno e acabamento premium para conforto em qualquer estação.',
    category: 'Conjuntos e agasalhos',
    image: './assets/images/conjuntos.jpg',
  },
  {
    id: 'prod-4',
    name: 'Top & Legging Alta Compressão',
    price: 139.9,
    description: 'Sustentação firme e modelagem que valoriza a silhueta com zero transparência.',
    category: 'Fitness: tops, shorts e legging',
    image: './assets/images/fitness.jpg',
  },
  {
    id: 'prod-5',
    name: 'Tênis Air Stride Pro',
    price: 299.9,
    description: 'Amortecimento responsivo e design sofisticado para corrida e casual.',
    category: 'Tênis',
    image: './assets/images/tenis.jpg',
  },
  {
    id: 'prod-6',
    name: 'Boné Snapback Prometheus Classic',
    price: 59.9,
    description: 'Bordado de alta definição em relevo e fecho ajustável.',
    category: 'Bonés, garrafas e acessórios',
    image: './assets/images/bones.jpg',
  },
  {
    id: 'prod-7',
    name: 'Camiseta esportiva preta',
    price: 50.0,
    description: 'Camiseta esportiva preta de tecido leve e confortável.',
    category: 'Camisetas esportivas',
    image: './assets/images/camisa.jpeg',
  },
  {
    id: 'prod-8',
    name: 'Bermuda casual',
    price: 50.0,
    description: 'Bermuda casual versátil para o dia a dia.',
    category: 'Shorts e bermudas',
    image: './assets/images/bermuda.jpeg',
  },
  {
    id: 'prod-9',
    name: 'Tênis esportivo preto',
    price: 50.0,
    description: 'Tênis esportivo preto com detalhes brancos.',
    category: 'Tênis',
    image: './assets/images/tenis-novo.jpeg',
  },
  {
    id: 'prod-10',
    name: 'Garrafa térmica azul',
    price: 50.0,
    description: 'Garrafa térmica azul prática para acompanhar sua rotina.',
    category: 'Bonés, garrafas e acessórios',
    image: './assets/images/garrafa.jpeg',
  },
];

let products = [];
let isBackendConnected = false;
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/* ==========================================================================
   1. Autenticação Simples (Yan / 7519)
   ========================================================================== */
function checkAuth() {
  const isAuth = sessionStorage.getItem('prometheus_admin_auth') === 'true';
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');

  if (isAuth) {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    loadAdminProducts();
  } else {
    if (loginView) loginView.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
  }
}

function initLogin() {
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error');
  const logoutBtn = document.getElementById('btn-logout');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value.trim();

      if (
        usernameInput.toLowerCase() === ADMIN_CREDENTIALS.user.toLowerCase() &&
        passwordInput === ADMIN_CREDENTIALS.pass
      ) {
        sessionStorage.setItem('prometheus_admin_auth', 'true');
        if (errorMsg) errorMsg.style.display = 'none';
        checkAuth();
      } else {
        if (errorMsg) {
          errorMsg.textContent = 'Usuário ou senha incorretos.';
          errorMsg.style.display = 'block';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('prometheus_admin_auth');
      checkAuth();
    });
  }
}

/* ==========================================================================
   2. Indicador de Conexão com Servidor
   ========================================================================== */
function updateServerStatus(connected) {
  isBackendConnected = Boolean(connected);
  const badge = document.getElementById('server-status-badge');
  const text = document.getElementById('server-status-text');

  if (!badge) return;

  if (connected) {
    badge.className = 'admin-status-badge status-online';
    badge.title = 'Servidor local ativo! As alterações são gravadas no arquivo do computador.';
    if (text) text.textContent = 'Servidor Ativo (Gravando no disco)';
  } else {
    badge.className = 'admin-status-badge status-offline';
    badge.title = 'Servidor desligado. Execute o iniciar-servidor.bat para gravar no arquivo.';
    if (text) text.textContent = 'Modo Navegador (Inicie o servidor)';
  }
}

/* ==========================================================================
   3. Notificações Toast Visuais
   ========================================================================== */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;

  const icon =
    type === 'success'
      ? '✓'
      : type === 'warning'
      ? '⚠️'
      : type === 'error'
      ? '✕'
      : 'ℹ️';

  toast.innerHTML = `<strong>${icon}</strong> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/* ==========================================================================
   4. Carregamento dos Produtos
   ========================================================================== */
async function loadAdminProducts() {
  // 1. Tenta carregar do servidor backend (/api/products)
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.ok) {
      let data = await res.json();
      if (Array.isArray(data)) {
        updateServerStatus(true);
        products = data;
        try {
          localStorage.setItem('prometheus_catalog', JSON.stringify(products));
        } catch {}

        renderProductsGrid();
        return;
      }
    }
  } catch {
    // Servidor offline ou rodando sem API
  }

  updateServerStatus(false);

  // 2. Tenta carregar do cache do navegador (localStorage)
  const localCache = localStorage.getItem('prometheus_catalog');
  if (localCache) {
    try {
      products = JSON.parse(localCache);
      renderProductsGrid();
      return;
    } catch {
      // Ignora erro de JSON
    }
  }

  // 3. Tenta carregar do arquivo local data/products.json
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        products = data;
        try {
          localStorage.setItem('prometheus_catalog', JSON.stringify(products));
        } catch {}
        renderProductsGrid();
        return;
      }
    }
  } catch {
    // Silencioso
  }

  // 4. Fallback final para DEFAULT_PRODUCTS
  products = [...DEFAULT_PRODUCTS];
  try {
    localStorage.setItem('prometheus_catalog', JSON.stringify(products));
  } catch {}
  renderProductsGrid();
}

/* ==========================================================================
   5. Renderização da Grade de Produtos
   ========================================================================== */
function renderProductsGrid() {
  const grid = document.getElementById('admin-products-grid');
  const countLabel = document.getElementById('products-count-label');
  const filterCat = document.getElementById('filter-category');

  if (!grid) return;

  const selectedCategory = filterCat ? filterCat.value : 'todas';
  const filtered = selectedCategory === 'todas'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  if (countLabel) {
    countLabel.textContent = `${products.length} ${products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`;
  }

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="admin-subtitle" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">Nenhum produto encontrado nesta categoria.</p>';
    return;
  }

  filtered.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'admin-product-card';

    const imageSrc = product.image || './assets/images/camisetas.jpg';

    card.innerHTML = `
      <div class="admin-product-thumb">
        <img src="${imageSrc}" alt="${product.name}" loading="lazy">
        <span class="admin-product-badge">${product.category}</span>
      </div>
      <div class="admin-product-info">
        <h4>${product.name}</h4>
        <p class="admin-desc">${product.description || 'Sem descrição cadastrada.'}</p>
        <p class="admin-product-price">${currencyFormatter.format(product.price)}</p>
      </div>
      <div class="admin-product-actions">
        <button type="button" class="admin-btn-action admin-btn-edit" data-id="${product.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar
        </button>
        <button type="button" class="admin-btn-action admin-btn-delete" data-id="${product.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          Excluir
        </button>
      </div>
    `;

    card.querySelector('.admin-btn-edit').addEventListener('click', () => openEditModal(product.id));
    card.querySelector('.admin-btn-delete').addEventListener('click', () => deleteProduct(product.id));

    grid.appendChild(card);
  });
}

/* ==========================================================================
   6. Modal de Criação / Edição de Produto
   ========================================================================== */
function initModal() {
  const modal = document.getElementById('product-modal');
  const btnOpenCreate = document.getElementById('btn-open-create-modal');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel-modal');
  const form = document.getElementById('product-form');
  const fileInput = document.getElementById('prod-image-file');
  const filterCat = document.getElementById('filter-category');

  if (btnOpenCreate) {
    btnOpenCreate.addEventListener('click', () => openCreateModal());
  }

  if (btnClose) btnClose.addEventListener('click', () => modal.close());
  if (btnCancel) btnCancel.addEventListener('click', () => modal.close());

  // Fechar ao clicar fora
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  }

  // Filtragem por categoria
  if (filterCat) {
    filterCat.addEventListener('change', () => renderProductsGrid());
  }

  // Upload e Redimensionamento Automático de Imagem
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const previewBox = document.getElementById('image-preview-container');
      const previewImg = document.getElementById('image-preview');
      const hiddenData = document.getElementById('prod-image-data');

      // Otimização automática: 600x600, qualidade 0.75 (leve e nítido)
      const optimizedBase64 = await resizeImage(file, 600, 600, 0.75);

      if (previewImg && previewBox && hiddenData) {
        previewImg.src = optimizedBase64;
        previewBox.style.display = 'block';
        hiddenData.value = optimizedBase64;
      }
    });
  }

  // Salvamento do Produto
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProductFromForm();
    });
  }
}

function openCreateModal() {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('modal-title');
  const previewBox = document.getElementById('image-preview-container');
  const hiddenData = document.getElementById('prod-image-data');

  if (!modal || !form) return;

  form.reset();
  document.getElementById('prod-id').value = '';
  if (title) title.textContent = 'Novo Produto';
  if (previewBox) previewBox.style.display = 'none';
  if (hiddenData) hiddenData.value = '';

  modal.showModal();
}

function openEditModal(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-title');
  const previewBox = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');
  const hiddenData = document.getElementById('prod-image-data');

  document.getElementById('prod-id').value = product.id;
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-desc').value = product.description || '';

  if (product.image) {
    if (previewImg) previewImg.src = product.image;
    if (previewBox) previewBox.style.display = 'block';
    if (hiddenData) hiddenData.value = product.image;
  } else {
    if (previewBox) previewBox.style.display = 'none';
    if (hiddenData) hiddenData.value = '';
  }

  if (title) title.textContent = 'Editar Produto';
  modal.showModal();
}

async function saveProductFromForm() {
  const saveBtn = document.getElementById('btn-save-product');
  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const price = parseFloat(document.getElementById('prod-price').value);
  const description = document.getElementById('prod-desc').value.trim();
  const image = document.getElementById('prod-image-data').value || './assets/images/camisetas.jpg';

  if (!name || isNaN(price)) {
    alert('Por favor, preencha o nome e um preço válido.');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
  }

  try {
    if (id) {
      // Editar produto existente
      const index = products.findIndex((p) => p.id === id);
      if (index !== -1) {
        products[index] = {
          ...products[index],
          name,
          category,
          price,
          description,
          image,
        };
      }
    } else {
      // Criar novo produto
      const newProduct = {
        id: `prod-${Date.now()}`,
        name,
        category,
        price,
        description,
        image,
      };
      products.unshift(newProduct);
    }

    const { backendSaved, localSaved } = await persistProducts();
    document.getElementById('product-modal').close();
    renderProductsGrid();

    if (backendSaved) {
      showToast('Produto salvo com sucesso no catálogo!', 'success');
    } else if (localSaved) {
      showToast('Salvo no navegador. Para salvar definitivo no disco, abra o iniciar-servidor.bat.', 'warning', 6000);
    } else {
      showToast('Erro ao salvar no armazenamento local.', 'error');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar Produto';
    }
  }
}

async function deleteProduct(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const confirmDelete = confirm(`Deseja realmente excluir o produto "${product.name}"?`);
  if (!confirmDelete) return;

  products = products.filter((p) => p.id !== productId);
  const { backendSaved } = await persistProducts();
  renderProductsGrid();

  if (backendSaved) {
    showToast('Produto excluído com sucesso do catálogo.', 'success');
  } else {
    showToast('Produto excluído (memória local).', 'info');
  }
}

/* ==========================================================================
   7. Persistência (Servidor Backend & Cache Local)
   ========================================================================== */
async function persistProducts() {
  let localSaved = false;
  let backendSaved = false;

  // 1. Salva no armazenamento do navegador (com proteção contra QuotaExceededError)
  try {
    localStorage.setItem('prometheus_catalog', JSON.stringify(products));
    localSaved = true;
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }

  // 2. Salva no backend via API se o servidor estiver rodando
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(products),
    });

    if (res.ok) {
      backendSaved = true;
      updateServerStatus(true);
    } else {
      updateServerStatus(false);
    }
  } catch {
    updateServerStatus(false);
  }

  return { backendSaved, localSaved };
}

/* ==========================================================================
   8. Exportar Catálogo JSON (Backup Manual)
   ========================================================================== */
function initExport() {
  const btnExport = document.getElementById('btn-export-json');
  if (!btnExport) return;

  btnExport.addEventListener('click', () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'products.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Arquivo products.json baixado com sucesso!', 'success');
    } catch {
      showToast('Falha ao exportar catálogo.', 'error');
    }
  });
}

/* ==========================================================================
   9. Redimensionamento de Foto via Canvas (Direto no Navegador / Celular)
   ========================================================================== */
function resizeImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   Inicialização
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initModal();
  initExport();
  checkAuth();
});
