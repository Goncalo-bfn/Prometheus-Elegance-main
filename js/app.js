/**
 * Prometheus Elegance — JavaScript da Loja
 * Catálogo interativo & Carrinho de Compras integrado com WhatsApp
 */

// 1. Configuração do WhatsApp da loja
const WHATSAPP_CONFIG = {
  number: '559889184633', // Código país (55) + DDD (98) + número
  display: '(98) 8918-4633',
};

// Catálogo base de segurança (garante funcionamento offline e local)
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

// Estado da Aplicação
let catalogProducts = [...DEFAULT_PRODUCTS];
const cart = new Map(); // productId => quantidade
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCurrency = (val) => currencyFormatter.format(val);

/* ==========================================================================
   1. Carregamento dos Produtos (API -> Cache Local -> products.json -> Fallback)
   ========================================================================== */
async function loadProducts() {
  // 1. Tenta buscar do servidor online/local (/api/products)
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        catalogProducts = data;
        localStorage.setItem('prometheus_catalog', JSON.stringify(data));
        return;
      }
    }
  } catch {
    // Servidor sem API ou offline
  }

  // 2. Tenta buscar do cache do navegador (atualizado pelo admin local)
  const cached = localStorage.getItem('prometheus_catalog');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        catalogProducts = parsed;
        return;
      }
    } catch {
      // Ignora erro de JSON
    }
  }

  // 3. Tenta buscar do arquivo estático data/products.json
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        catalogProducts = data;
        return;
      }
    }
  } catch {
    // Silencioso se aberto via file://
  }

  // 4. Catálogo padrão de segurança
  catalogProducts = [...DEFAULT_PRODUCTS];
}

/* ==========================================================================
   2. Menu Mobile
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const mobileNav = document.getElementById('menu-celular');

  if (!toggleBtn || !mobileNav) return;

  const setMenuOpen = (isOpen) => {
    mobileNav.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  };

  toggleBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    setMenuOpen(!isOpen);
  });

  mobileNav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      setMenuOpen(false);
    }
  });
}

/* ==========================================================================
   3. Cópia Rápida do Número do WhatsApp
   ========================================================================== */
function initCopyWhatsApp() {
  const copyBtn = document.getElementById('btn-copy-whatsapp');
  const feedback = document.getElementById('copy-feedback-msg');

  if (!copyBtn || !feedback) return;

  let timer = null;
  copyBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(WHATSAPP_CONFIG.display);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = WHATSAPP_CONFIG.display;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      feedback.textContent = '✓ Número copiado para a área de transferência!';
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        feedback.textContent = '';
      }, 4000);
    } catch {
      feedback.textContent = `Contato direto: ${WHATSAPP_CONFIG.display}`;
    }
  });
}

/* ==========================================================================
   4. Exibição de Produtos por Categoria
   ========================================================================== */
function initCategoryPanels() {
  const categoryGrid = document.getElementById('category-grid');
  const cards = categoryGrid ? [...categoryGrid.querySelectorAll('.category-card')] : [];

  cards.forEach((card) => {
    const categoryName = card.dataset.category || card.querySelector('h3')?.textContent.trim();
    const linkBtn = card.querySelector('.category-link');
    if (!linkBtn) return;

    // Cria o painel de produtos da categoria
    const panel = document.createElement('div');
    panel.className = 'category-products-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `Produtos de ${categoryName}`);
    categoryGrid.appendChild(panel);

    linkBtn.addEventListener('click', () => {
      const isCurrentlyOpen = !panel.hidden;

      // Fecha todos os outros painéis abertos
      cards.forEach((otherCard) => {
        const otherBtn = otherCard.querySelector('.category-link');
        const otherPanel = otherCard._productPanel;
        if (otherBtn && otherPanel) {
          otherBtn.setAttribute('aria-expanded', 'false');
          const span = otherBtn.querySelector('span');
          if (span) span.textContent = 'Ver produtos';
          otherPanel.hidden = true;
        }
      });

      // Se não estava aberto, abre este
      if (!isCurrentlyOpen) {
        renderProductsIntoPanel(panel, categoryName);
        panel.hidden = false;
        linkBtn.setAttribute('aria-expanded', 'true');
        const span = linkBtn.querySelector('span');
        if (span) span.textContent = 'Ocultar produtos';

        // Posiciona o painel logo abaixo da linha do card selecionado
        positionCategoryPanel(card, panel, categoryGrid, cards);
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    card._productPanel = panel;
  });
}

function positionCategoryPanel(activeCard, panel, grid, allCards) {
  const cardRect = activeCard.getBoundingClientRect();
  const rowCards = allCards.filter(
    (c) => Math.abs(c.getBoundingClientRect().top - cardRect.top) < 10
  );
  const lastCardInRow = rowCards[rowCards.length - 1];

  if (lastCardInRow && lastCardInRow.nextSibling) {
    grid.insertBefore(panel, lastCardInRow.nextSibling);
  } else {
    grid.appendChild(panel);
  }
}

function renderProductsIntoPanel(panel, categoryName) {
  panel.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = `Produtos em ${categoryName}`;
  panel.appendChild(title);

  const matchedProducts = catalogProducts.filter(
    (p) => String(p.category || '').toLowerCase() === String(categoryName || '').toLowerCase()
  );

  if (matchedProducts.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'category-products-empty';
    emptyMsg.textContent = 'Novidades chegando em breve para esta categoria.';
    panel.appendChild(emptyMsg);
    return;
  }

  const list = document.createElement('div');
  list.className = 'category-products-list';

  matchedProducts.forEach((product) => {
    const item = document.createElement('article');
    item.className = 'category-product';

    if (product.image) {
      const img = document.createElement('img');
      img.className = 'category-product-image';
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      item.appendChild(img);
    }

    const name = document.createElement('h4');
    name.textContent = product.name;
    item.appendChild(name);

    if (product.description) {
      const desc = document.createElement('p');
      desc.className = 'category-product-desc';
      desc.textContent = product.description;
      item.appendChild(desc);
    }

    const price = document.createElement('p');
    price.className = 'category-product-price';
    price.textContent = formatCurrency(product.price);
    item.appendChild(price);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'sample-product-add';
    addBtn.textContent = 'Adicionar ao carrinho';
    addBtn.addEventListener('click', () => {
      addToCart(product);
    });

    item.appendChild(addBtn);
    list.appendChild(item);
  });

  panel.appendChild(list);
}

/* ==========================================================================
   5. Gerenciamento do Carrinho de Compras
   ========================================================================== */
function addToCart(product) {
  const currentQty = cart.get(product.id) || 0;
  cart.set(product.id, currentQty + 1);

  updateCartUI();

  // Notificação acessível
  const announcement = document.getElementById('cart-announcement');
  if (announcement) {
    announcement.textContent = `${product.name} adicionado ao carrinho.`;
  }
}

function updateCartItemQty(productId, delta) {
  const current = cart.get(productId) || 0;
  const next = current + delta;

  if (next <= 0) {
    cart.delete(productId);
  } else {
    cart.set(productId, next);
  }

  updateCartUI();
}

function removeCartItem(productId) {
  cart.delete(productId);
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById('cart-count-badge');
  const emptyMsg = document.getElementById('cart-empty-msg');
  const itemsList = document.getElementById('cart-items-list');
  const summaryBox = document.getElementById('cart-summary-box');
  const subtotalVal = document.getElementById('cart-subtotal-val');
  const totalVal = document.getElementById('cart-total-val');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  let totalQty = 0;
  let totalPrice = 0;

  if (itemsList) itemsList.innerHTML = '';

  cart.forEach((qty, id) => {
    const product = catalogProducts.find((p) => p.id === id);
    if (!product) return;

    totalQty += qty;
    const lineTotal = product.price * qty;
    totalPrice += lineTotal;

    if (itemsList) {
      const li = document.createElement('li');
      li.className = 'cart-item';

      li.innerHTML = `
        <div class="cart-item-details">
          <h3>${product.name}</h3>
          <p>${product.category}</p>
          <p>Unitário: ${formatCurrency(product.price)}</p>
          <p class="cart-line-total">Subtotal: ${formatCurrency(lineTotal)}</p>
        </div>
        <div class="cart-item-controls">
          <button type="button" aria-label="Diminuir quantidade de ${product.name}" class="btn-qty-minus">−</button>
          <span>${qty}</span>
          <button type="button" aria-label="Aumentar quantidade de ${product.name}" class="btn-qty-plus">+</button>
          <button type="button" class="cart-remove" aria-label="Remover ${product.name} do carrinho">Remover</button>
        </div>
      `;

      li.querySelector('.btn-qty-minus').addEventListener('click', () => updateCartItemQty(id, -1));
      li.querySelector('.btn-qty-plus').addEventListener('click', () => updateCartItemQty(id, 1));
      li.querySelector('.cart-remove').addEventListener('click', () => removeCartItem(id));

      itemsList.appendChild(li);
    }
  });

  if (badge) badge.textContent = String(totalQty);

  const hasItems = totalQty > 0;
  if (emptyMsg) emptyMsg.style.display = hasItems ? 'none' : 'block';
  if (summaryBox) summaryBox.style.display = hasItems ? 'block' : 'none';
  if (subtotalVal) subtotalVal.textContent = formatCurrency(totalPrice);
  if (totalVal) totalVal.textContent = formatCurrency(totalPrice);
  if (checkoutBtn) checkoutBtn.disabled = !hasItems;
}

function initCartModal() {
  const openBtn = document.getElementById('cart-open-btn');
  const closeBtn = document.getElementById('cart-close-btn');
  const dialog = document.getElementById('cart-dialog');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (!dialog) return;

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      dialog.showModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dialog.close();
    });
  }

  // Fechar ao clicar no backdrop (fora do modal)
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Finalização do Pedido pelo WhatsApp
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.size === 0) return;

      const lines = [
        'Olá! Gostaria de fazer o seguinte pedido na Prometheus Elegance:',
        '',
      ];

      let total = 0;
      cart.forEach((qty, id) => {
        const product = catalogProducts.find((p) => p.id === id);
        if (!product) return;
        const lineTotal = product.price * qty;
        total += lineTotal;
        lines.push(`• *${product.name}* (Qtd: ${qty}) — ${formatCurrency(lineTotal)}`);
      });

      lines.push('');
      lines.push(`*Total do Pedido: ${formatCurrency(total)}*`);
      lines.push('');
      lines.push('Poderia me confirmar a disponibilidade e o prazo de entrega? Obrigado!');

      const whatsappUrl = `https://wa.me/${WHATSAPP_CONFIG.number}?text=${encodeURIComponent(lines.join('\n'))}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    });
  }
}

/* ==========================================================================
   Inicialização Global
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initMobileMenu();
  initCopyWhatsApp();
  initCategoryPanels();
  initCartModal();
  updateCartUI();
});
