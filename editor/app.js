const STORAGE_KEY = 'prometheus_editor_catalog_v2';
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
    price: 50,
    description: 'Camiseta esportiva preta de tecido leve e confortável.',
    category: 'Camisetas esportivas',
    image: './assets/images/camisa.jpeg',
  },
  {
    id: 'prod-8',
    name: 'Bermuda casual',
    price: 50,
    description: 'Bermuda casual versátil para o dia a dia.',
    category: 'Shorts e bermudas',
    image: './assets/images/bermuda.jpeg',
  },
  {
    id: 'prod-9',
    name: 'Tênis esportivo preto',
    price: 50,
    description: 'Tênis esportivo preto com detalhes brancos.',
    category: 'Tênis',
    image: './assets/images/tenis-novo.jpeg',
  },
  {
    id: 'prod-10',
    name: 'Garrafa térmica azul',
    price: 50,
    description: 'Garrafa térmica azul prática para acompanhar sua rotina.',
    category: 'Bonés, garrafas e acessórios',
    image: './assets/images/garrafa.jpeg',
  },
];

let catalog = [];
let catalogFileHandle = null;
let onlineMode = false;
let onlineAuthenticated = false;
let pendingOnlineSave = null;

const productForm = document.getElementById('product-form');
const catalogList = document.getElementById('catalog-list');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productCategoryInput = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productDescriptionInput = document.getElementById('product-description');
const productImageInput = document.getElementById('product-image');
const previewBox = document.getElementById('preview-box');
const previewImg = document.getElementById('product-image-preview');
const fileInput = document.getElementById('json-import-input');
const imageFileInput = document.getElementById('product-image-file');
const editorStatus = document.getElementById('editor-status');
const onlineAccessPanel = document.getElementById('online-access-panel');
const onlineSaveButton = document.getElementById('save-direct-btn');
const onlineLoadButton = document.getElementById('load-json-btn');
const productSaveButton = document.getElementById('product-save-btn');
const onlineLoginForm = document.getElementById('online-login-form');
const onlineUsernameInput = document.getElementById('online-username');
const onlinePasswordInput = document.getElementById('online-password');
const onlineLoginButton = document.getElementById('online-login-button');
const onlineLogoutButton = document.getElementById('online-logout-button');
const onlineAccessDescription = document.getElementById('online-access-description');

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function setStatus(message) {
  editorStatus.textContent = message;
}

function imagePathForEditor(imagePath) {
  return imagePath.startsWith('./assets/') ? `../${imagePath.slice(2)}` : imagePath;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function normalizeProduct(product) {
  if (!product || typeof product !== 'object') return null;

  const normalized = {
    id: String(product.id || `prod-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    name: safeString(product.name),
    price: Number(product.price),
    description: safeString(product.description),
    category: safeString(product.category) || 'Camisetas esportivas',
    image: safeString(product.image) || './assets/images/camisetas.jpg',
  };

  if (!normalized.name || !Number.isFinite(normalized.price) || normalized.price < 0) {
    return null;
  }

  return normalized;
}

function persistCatalog() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    return true;
  } catch {
    setStatus('Não foi possível guardar automaticamente. Use “Baixar produtos” para guardar uma cópia.');
    return false;
  }
}

async function loadCatalog() {
  try {
    const response = await fetch('/api/products', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map((item) => normalizeProduct(item)) : [];
      if (!normalized.length || normalized.some((item) => !item)) {
        throw new Error('A loja online retornou uma lista de produtos inválida.');
      }

      onlineMode = true;
      onlineAccessPanel.style.display = 'block';
      onlineSaveButton.hidden = true;
      onlineLoadButton.hidden = true;
      productSaveButton.textContent = 'Salvar e publicar';
      catalog = normalized;
      renderCatalog();
      await checkOnlineSession();
      setStatus('Produtos da loja carregados. Ao salvar um produto, a mudança vai direto para a loja online.');
      return;
    }
  } catch (error) {
    if (onlineMode) {
      setStatus(`Não foi possível atualizar os produtos da loja online: ${error.message}`);
      return;
    }
  }

  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    setStatus('O navegador não permite guardar automaticamente. Use “Baixar produtos” no fim.');
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((item) => normalizeProduct(item));
        if (!normalized.length || normalized.some((item) => !item)) {
          throw new Error('A lista salva contém produtos inválidos.');
        }
        catalog = normalized;
        renderCatalog();
        setStatus('Editor offline: estas mudanças ficam só neste navegador. Para publicar, acesse o editor pelo endereço da loja online.');
        return;
      }
    } catch {
      // Ignora dados inválidos e tenta carregar o arquivo da pasta.
    }
  }

  try {
    const response = await fetch('../data/products.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data.map((item) => normalizeProduct(item));
        if (!normalized.length || normalized.some((item) => !item)) {
          throw new Error('A lista de produtos contém dados inválidos.');
        }
        catalog = normalized;
        persistCatalog();
        renderCatalog();
        setStatus('Editor offline: estas mudanças não vão para a loja online. Para publicar, acesse o editor pelo endereço do site.');
        return;
      }
    }
  } catch {
    // O navegador pode bloquear acesso ao arquivo local; usa os dados padrão abaixo.
  }

  catalog = DEFAULT_PRODUCTS.map((item) => normalizeProduct(item)).filter(Boolean);
  persistCatalog();
  renderCatalog();
  setStatus('Editor offline com produtos de exemplo. Para editar a loja online, abra este editor pelo endereço do site publicado.');
}

async function checkOnlineSession() {
  try {
    const response = await fetch('/api/admin/session', { cache: 'no-store' });
    onlineAuthenticated = response.ok;
  } catch {
    onlineAuthenticated = false;
  }

  onlineLoginButton.hidden = onlineAuthenticated;
  onlineLogoutButton.hidden = !onlineAuthenticated;
  onlineUsernameInput.closest('.form-group').hidden = onlineAuthenticated;
  onlinePasswordInput.closest('.form-group').hidden = onlineAuthenticated;
  onlineAccessDescription.textContent = onlineAuthenticated
    ? 'Você está conectado. As alterações salvas serão publicadas na loja online.'
    : 'Entre com o mesmo usuário e senha do painel administrativo para salvar direto na loja.';
}

async function loginToOnlineStore(event) {
  event.preventDefault();
  onlineLoginButton.disabled = true;
  setStatus('Entrando no painel da loja...');

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: safeString(onlineUsernameInput.value),
        password: onlinePasswordInput.value,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Usuário ou senha incorretos.');
    }

    onlinePasswordInput.value = '';
    await checkOnlineSession();
    setStatus('Conectado. Ao salvar um produto, ele será publicado na loja online.');
    if (pendingOnlineSave) {
      const savePendingChange = pendingOnlineSave;
      pendingOnlineSave = null;
      await savePendingChange();
    }
  } catch (error) {
    setStatus(`Não foi possível entrar: ${error.message}`);
  } finally {
    onlineLoginButton.disabled = false;
  }
}

async function logoutFromOnlineStore() {
  try {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (!response.ok) {
      throw new Error('O servidor não confirmou a saída.');
    }
    onlineAuthenticated = false;
    await checkOnlineSession();
    setStatus('Você saiu do painel. Entre novamente antes de salvar produtos na loja.');
  } catch (error) {
    setStatus(`Não foi possível sair do painel: ${error.message}`);
  }
}

function renderCatalog() {
  if (!catalogList) return;

  if (!catalog.length) {
    catalogList.innerHTML = '<div class="empty-state">Nenhum produto no catálogo ainda.</div>';
    return;
  }

  catalogList.innerHTML = catalog
    .map(
      (product) => `
        <article class="catalog-card">
          <div class="catalog-thumb">
            <img src="${escapeHtml(imagePathForEditor(product.image || './assets/images/camisetas.jpg'))}" alt="${escapeHtml(product.name)}" loading="lazy" />
          </div>
          <div class="catalog-copy">
            <h4>${escapeHtml(product.name)}</h4>
            <p>${escapeHtml(product.category)}</p>
            <p>R$ ${Number(product.price).toFixed(2).replace('.', ',')}</p>
          </div>
          <div class="catalog-actions">
            <button type="button" class="mini-btn edit" data-action="edit" data-id="${escapeHtml(product.id)}">Editar</button>
            <button type="button" class="mini-btn delete" data-action="delete" data-id="${escapeHtml(product.id)}">Excluir</button>
          </div>
        </article>
      `
    )
    .join('');

  catalogList.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => fillForm(button.dataset.id));
  });

  catalogList.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => deleteCatalogProduct(button.dataset.id, true, button));
  });
}

async function deleteCatalogProduct(productId, confirmDelete = false, button = null) {
  const product = catalog.find((item) => item.id === productId);
  if (!product) return;
  if (confirmDelete && !window.confirm(`Excluir "${product.name}" do catálogo?`)) return;

  const nextCatalog = catalog.filter((item) => item.id !== productId);
  if (onlineMode) {
    if (!onlineAuthenticated) {
      pendingOnlineSave = () => deleteCatalogProduct(productId);
      setStatus('Entre com seu usuário e senha do admin para remover o produto. Depois disso, a remoção será publicada.');
      onlineAccessPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onlineUsernameInput.focus();
      return;
    }

    if (button) button.disabled = true;
    try {
      await saveOnlineCatalog(nextCatalog);
      catalog = nextCatalog;
      renderCatalog();
      resetForm();
      setStatus('Produto removido e alteração publicada na loja online.');
    } catch (error) {
      if (!onlineAuthenticated) {
        pendingOnlineSave = () => deleteCatalogProduct(productId);
      }
      setStatus(`Não foi possível remover o produto da loja: ${error.message}`);
      if (button) button.disabled = false;
    }
    return;
  }

  catalog = nextCatalog;
  const saved = persistCatalog();
  renderCatalog();
  resetForm();
  setStatus(saved
    ? 'Produto removido desta lista. Use “Baixar produtos” para guardar a cópia.'
    : 'Produto removido desta sessão, mas não foi possível guardar no navegador.');
}

function resetForm() {
  productForm.reset();
  productIdInput.value = '';
  productCategoryInput.value = 'Camisetas esportivas';
  previewBox.style.display = 'none';
  previewImg.src = '';
}

function fillForm(productId) {
  const product = catalog.find((item) => item.id === productId);
  if (!product) return;

  productIdInput.value = product.id;
  productNameInput.value = product.name;
  productCategoryInput.value = product.category || 'Camisetas esportivas';
  productPriceInput.value = product.price;
  productDescriptionInput.value = product.description || '';
  productImageInput.value = product.image || '';

  if (product.image) {
    previewImg.src = imagePathForEditor(product.image);
    previewBox.style.display = 'block';
  } else {
    previewBox.style.display = 'none';
    previewImg.src = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveProduct(product) {
  const nextCatalog = [...catalog];
  const existingIndex = nextCatalog.findIndex((item) => item.id === product.id);
  if (existingIndex >= 0) {
    nextCatalog[existingIndex] = product;
  } else {
    nextCatalog.unshift(product);
  }

  if (onlineMode) {
    if (!onlineAuthenticated) {
      pendingOnlineSave = () => saveProduct(product);
      setStatus('Entre com seu usuário e senha do admin. Depois disso, este produto será publicado automaticamente.');
      onlineAccessPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onlineUsernameInput.focus();
      return;
    }

    productSaveButton.disabled = true;
    setStatus('Salvando produto na loja online...');
    try {
      await saveOnlineCatalog(nextCatalog);
      catalog = nextCatalog;
      renderCatalog();
      resetForm();
      setStatus('Produto salvo e publicado na loja online.');
    } catch (error) {
      if (!onlineAuthenticated) {
        pendingOnlineSave = () => saveProduct(product);
      }
      setStatus(`Não foi possível publicar o produto: ${error.message}`);
    } finally {
      productSaveButton.disabled = false;
    }
    return;
  }

  catalog = nextCatalog;
  const saved = persistCatalog();
  renderCatalog();
  resetForm();
  setStatus(saved
    ? 'Produto atualizado apenas neste navegador. Use “Baixar produtos” para guardar a cópia.'
    : 'Não foi possível guardar a alteração no navegador.');
}

async function addOrUpdateProduct(event) {
  event.preventDefault();

  const product = {
    id: productIdInput.value || `prod-${Date.now()}`,
    name: safeString(productNameInput.value),
    category: safeString(productCategoryInput.value) || 'Camisetas esportivas',
    price: Number(productPriceInput.value),
    description: safeString(productDescriptionInput.value),
    image: safeString(productImageInput.value) || './assets/images/camisetas.jpg',
  };

  if (!product.name || !Number.isFinite(product.price) || product.price < 0) {
    window.alert('Preencha nome e preço válidos.');
    return;
  }

  await saveProduct(product);
}

async function saveOnlineCatalog(products) {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    throw new Error('O servidor respondeu com uma mensagem inválida.');
  }

  if (response.status === 401) {
    onlineAuthenticated = false;
    await checkOnlineSession();
    throw new Error('Sua sessão expirou. Entre novamente e tente salvar.');
  }
  if (!response.ok) {
    throw new Error(result.error || 'O servidor não conseguiu salvar o catálogo.');
  }
}

function parseCatalogFile(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('Esse arquivo não parece ser uma lista de produtos.');
  }

  const normalized = data.map((item) => normalizeProduct(item));
  if (normalized.length === 0 || normalized.some((item) => !item)) {
    throw new Error('O arquivo contém produtos inválidos. Nenhuma alteração foi aplicada.');
  }
  return normalized;
}

function applyImportedCatalog(products) {
  catalog = products;
  const saved = persistCatalog();
  renderCatalog();
  resetForm();
  setStatus(saved
    ? `Produtos carregados. Você já pode editar e salvar as alterações.`
    : 'Produtos carregados. Edite e toque em “Salvar alterações” para guardar.');
}

async function openCatalogFile() {
  if (onlineMode) {
    await loadCatalog();
    return;
  }

  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Lista de produtos', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      const products = parseCatalogFile(await file.text());
      catalogFileHandle = handle;
      applyImportedCatalog(products);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus(`Não foi possível carregar os produtos: ${error.message}`);
      }
    }
    return;
  }

  fileInput.click();
}

function handleJsonImport(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  file.text()
    .then((text) => {
      applyImportedCatalog(parseCatalogFile(text));
    })
    .catch((error) => {
      setStatus(`Não foi possível carregar os produtos: ${error.message}`);
    })
    .finally(() => {
      event.target.value = '';
    });
}

async function saveCatalogToFile() {
  if (onlineMode) {
    if (!onlineAuthenticated) {
      setStatus('Entre com seu usuário e senha do admin para publicar na loja online.');
      onlineAccessPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onlineUsernameInput.focus();
      return;
    }

    try {
      await saveOnlineCatalog(catalog);

      setStatus('Catálogo publicado. Abra a loja em outra aba ou atualize para conferir.');
    } catch (error) {
      setStatus(`Não foi possível publicar: ${error.message}`);
    }
    return;
  }

  try {
    if (!catalogFileHandle && typeof window.showSaveFilePicker === 'function') {
      catalogFileHandle = await window.showSaveFilePicker({
        suggestedName: 'produtos-da-loja.json',
        types: [{ description: 'Lista de produtos', accept: { 'application/json': ['.json'] } }],
      });
    }

    if (!catalogFileHandle) {
      downloadCatalog();
      setStatus('Alterações salvas no arquivo baixado. Envie esse arquivo para quem publicou a loja para atualizar o site.');
      return;
    }

    const writable = await catalogFileHandle.createWritable();
    await writable.write(JSON.stringify(catalog, null, 2));
    await writable.close();
    setStatus('Alterações salvas no arquivo. Para atualizar a loja online, envie o arquivo para quem publicou o site.');
  } catch (error) {
    if (error.name !== 'AbortError') {
      setStatus(`Não foi possível salvar as alterações: ${error.message}`);
    }
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('O arquivo escolhido não é uma imagem válida.'));
      image.onload = () => {
        const maxDimension = 900;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('O navegador não conseguiu processar a imagem.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handleImageSelection() {
  const [file] = imageFileInput.files || [];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Escolha um arquivo de imagem, como JPG, PNG ou WEBP.');
    imageFileInput.value = '';
    return;
  }

  try {
    const imageData = await readImageAsDataUrl(file);
    productImageInput.value = imageData;
    previewImg.src = imageData;
    previewBox.style.display = 'block';
    setStatus(onlineMode
      ? 'Foto pronta. Toque em “Salvar e publicar” para enviar o produto para a loja.'
      : 'Foto pronta. Salve o produto e depois toque em “Salvar alterações”.');
  } catch (error) {
    setStatus(error.message);
  } finally {
    imageFileInput.value = '';
  }
}

function downloadCatalog() {
  const fileContent = JSON.stringify(catalog, null, 2);
  const blob = new Blob([fileContent], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'produtos-da-loja.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function bindEvents() {
  productForm.addEventListener('submit', addOrUpdateProduct);
  onlineLoginForm.addEventListener('submit', loginToOnlineStore);
  onlineLogoutButton.addEventListener('click', logoutFromOnlineStore);

  document.getElementById('new-product-btn').addEventListener('click', () => {
    resetForm();
    productNameInput.focus();
  });

  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

  document.getElementById('load-json-btn').addEventListener('click', openCatalogFile);
  fileInput.addEventListener('change', handleJsonImport);
  document.getElementById('save-direct-btn').addEventListener('click', saveCatalogToFile);
  imageFileInput.addEventListener('change', handleImageSelection);

  productImageInput.addEventListener('input', () => {
    const value = safeString(productImageInput.value);
    if (!value) {
      previewBox.style.display = 'none';
      previewImg.src = '';
      return;
    }

    previewImg.src = imagePathForEditor(value);
    previewBox.style.display = 'block';
  });
}

bindEvents();
loadCatalog();
resetForm();
