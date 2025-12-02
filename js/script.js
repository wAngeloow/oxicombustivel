document.addEventListener('DOMContentLoaded', () => {

  // ==============================================
  // Inicio - Configuração e Mapeamento
  // ==============================================

  const sectionToKey = {
    'maçaricos': 'maçaricos',
    'válvulas-e-máquinas': 'valvulas_e_maquinas',
    'reguladores': 'reguladores',
    'acessórios': 'acessórios',
    'bicos': 'bicos',
    'kits': 'kits',
  };

  const categoryLabels = {
    maçaricos: 'Maçaricos',
    valvulas_e_maquinas: 'Válvulas e Máquinas',
    reguladores: 'Reguladores',
    acessórios: 'Acessórios',
    bicos: 'Bicos',
    kits: 'Kits'
  };

  const CART_STORAGE_KEY = 'fort_cart_oxicombustivel';

  // ==============================================
  // Inicio - Estado e Índices de Dados
  // ==============================================

  const cartState = new Map();
  const productIndex = {};
  const productCategory = {};

  // Processa os dados do 'produtos.js'
  if (window.todosOsProdutos) {
    Object.entries(window.todosOsProdutos).forEach(([categoria, lista]) => {
      const labelBonito = categoryLabels[categoria] || categoria;
      lista.forEach(p => {
        productIndex[p.id] = p;
        productCategory[p.id] = labelBonito;
      });
    });
  } else {
    console.error('Dados de produtos (window.todosOsProdutos) não encontrados.');
  }

  // ==============================================
  // Inicio - Referências do DOM
  // ==============================================

  const overlay = document.getElementById('cart-overlay') || document.querySelector('.overlay');
  const shopContainer = document.querySelector('.shop-container');
  const cartIcon = document.querySelector('.carrinho');
  const closeCartBtn = document.getElementById('fecharCarrinho');
  const btnLimparCarrinho = document.getElementById('limparCarrinho');
  const cartItemsContainer = document.getElementById('cart-items');
  const badgeCountEl = document.getElementById('cart-badge-count');
  const totalItemsEl = document.getElementById('qtdItens');
  const totalPriceEl = document.getElementById('cart-total-price');
  const btnComprar = document.querySelector('.btn-comprar');
  const selectTipoCliente = document.getElementById('tipoCliente');
  const inputCidade = document.getElementById('cidade');
  const btnTopo = document.getElementById("btn-topo");
  const anoEl = document.getElementById("ano-atual");
  const popup = document.querySelector('.carrinho-popup');

  // ==============================================
  // Inicio - Funções Utilitárias
  // ==============================================

  const moneyBR = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function getUnit(product) {
    return product.unidade_medida || '';
  }

  // ==============================================
  // Inicio - Lógica do Carrossel (Swiper)
  // ==============================================

  function createSlide(p) {
    const valorFinal = Number(p.valor);
    const pct = Number(p.desconto);
    const temPreco = Number.isFinite(valorFinal);
    const temDesc = temPreco && pct > 0 && pct < 100;
    const baseCalc = temDesc ? (valorFinal / (1 - (pct / 100))) : null;

    const baseFmt = temDesc ? moneyBR(baseCalc) : '';
    const finalFmt = temPreco ? moneyBR(valorFinal) : moneyBR(0);
    const unidade = getUnit(p);

    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = `
      <article class="card-produto bg-white rounded-3 d-flex flex-column h-100">
        <figure class="d-flex justify-content-center my-4">
          <img loading="lazy" class="rounded-3 object-fit-cover foto-card" src="${p.imagem}" alt="${p.nome}">
        </figure>
        <div class="flex-grow-1 px-4">
          <h3 class="fw-bold lh-sm">${p.nome}</h3>
          <div class="my-3 border-0 bg-black opacity-75" style="height:2px;"></div>
          <div>
            ${temDesc ? `
              <div class="d-flex align-items-center gap-3">
                <span class="text-secondary text-decoration-line-through mb-0">${baseFmt}</span>
                <span class="desconto rounded-pill d-flex justify-content-center align-items-center">-${pct}%</span>
              </div>` : ``}
            <p class="fw-bold fs-3 mb-0">${finalFmt} <span class="fs-4">${unidade ? `/${unidade}.` : ''}<span></p>
          </div>
          <div class="d-flex justify-content-center mb-4 mt-2">
            <button class="btn-add-carrinho rounded-3 fw-bold fs-5 text-white" data-id="${p.id}">
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </article>
    `;
    return slide;
  }

  function initSectionSwiper(sectionId) {
    const dados = window.todosOsProdutos;
    const key = sectionToKey[sectionId];
    if (!dados || !key || !dados[key]) return;

    const section = document.getElementById(sectionId);
    const container = section?.querySelector('.swiper');
    const wrapper = section?.querySelector('.swiper .swiper-wrapper');
    const pagEl = section?.querySelector('.swiper .swiper-pagination');
    const nextEl = section?.querySelector('.swiper .swiper-button-next');
    const prevEl = section?.querySelector('.swiper .swiper-button-prev');
    if (!container || !wrapper) return;

    wrapper.innerHTML = '';
    dados[key].forEach(p => wrapper.appendChild(createSlide(p)));

    const count = wrapper.children.length;
    if (count <= 1) {
      nextEl?.classList.add('d-none');
      prevEl?.classList.add('d-none');
    } else {
      nextEl?.classList.remove('d-none');
      prevEl?.classList.remove('d-none');
    }

    const swiper = new Swiper(container, {
      slidesPerView: 'auto',
      spaceBetween: 30,
      autoHeight: true,
      grabCursor: true,
      centeredSlidesBounds: true,
      rewind: true,
      watchOverflow: true,
      resistanceRatio: 0,
      preloadImages: false,
      lazy: {
        loadOnTransitionStart: false,
        loadPrevNext: true,
        loadPrevNextAmount: 2,
      },
      pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
      navigation: { nextEl, prevEl },
      breakpoints: { 0: { spaceBetween: 16 }, 576: { spaceBetween: 20 }, 992: { spaceBetween: 30 } }
    });

    function updateFades() {
      const noScroll = swiper.isLocked || swiper.slides?.length <= 1;
      container.classList.toggle('no-scroll', !!noScroll);
      container.classList.toggle('at-start', swiper.isBeginning || noScroll);
      container.classList.toggle('at-end', swiper.isEnd || noScroll);
    }
    swiper.on('afterInit', updateFades);
    swiper.on('slideChange', updateFades);
    swiper.on('fromEdge', updateFades);
    swiper.on('reachBeginning', updateFades);
    swiper.on('reachEnd', updateFades);
    swiper.on('resize', updateFades);
    if (swiper.initialized) updateFades();
  }

  // ==============================================
  // Inicio - Lógica do Carrinho (Core)
  // ==============================================

  function openCart() {
    if (!overlay) return;
    overlay.classList.add('active');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeCart() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.documentElement.style.overflow = '';
  }

  function limparCarrinho() {
    cartState.clear();
    renderCart(); // Re-renderiza o carrinho (que vai esconder tudo e mostrar a msg "vazio")
  }

  function saveCartToStorage() {
    try {
      const arr = [];
      cartState.forEach(({ product, qty }) => {
        arr.push({ id: product.id, qty });
      });
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e);
    }
  }

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;

      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;

      cartState.clear();

      arr.forEach(item => {
        const p = productIndex[item.id];
        if (!p) return;
        const qty = Number(item.qty);
        if (!qty || qty <= 0) return;

        cartState.set(item.id, { product: p, qty });
      });
    } catch (e) {
      console.error('Erro ao carregar carrinho do localStorage:', e);
    }
  }

  function updateCartSummary() {
    let totalQtd = 0;
    let totalValor = 0;

    cartState.forEach(({ product, qty }) => {
      totalQtd += qty;
      totalValor += Number(product.valor) * qty;
    });

    if (badgeCountEl) badgeCountEl.textContent = totalQtd;
    if (totalItemsEl) totalItemsEl.textContent = totalQtd;
    if (totalPriceEl) totalPriceEl.textContent = moneyBR(totalValor);
  }

  function renderCart() {
    if (!cartItemsContainer) return;

    const emptyBlock = document.getElementById("cart-empty");
    const form = document.getElementById("cart-form");
    const footer = document.getElementById("cart-footer");

    cartItemsContainer.innerHTML = '';
    cartItemsContainer.appendChild(emptyBlock);

    if (cartState.size === 0) {
      emptyBlock.style.display = "block";
      if (form) form.style.display = "none";
      if (footer) footer.style.display = "none";
      if (btnLimparCarrinho) btnLimparCarrinho.style.display = "none";

      updateCartSummary();
      saveCartToStorage();
      return;
    }

    emptyBlock.style.display = "none";
    if (form) form.style.display = "";
    if (footer) footer.style.display = "";
    if (btnLimparCarrinho) btnLimparCarrinho.style.display = "";

    cartState.forEach(({ product, qty }) => {
      const unidade = getUnit(product);
      const subtotal = Number(product.valor) * qty;

      const itemEl = document.createElement('div');
      itemEl.className = 'd-flex align-items-stretch gap-2 borda-carrinho rounded-1 px-2 py-2';
      itemEl.dataset.id = product.id;

      itemEl.innerHTML = `
        <div class="d-flex align-items-center justify-content-center">
          <figure class="mb-0">
            <img class="foto-carrinho rounded-1" src="${product.imagem}" alt="${product.nome}">
          </figure>
        </div>
        <div class="w-100 d-flex flex-column justify-content-between">
          <div>
            <div class="categoria d-inline-block fw-semibold rounded-2 mb-1">
              <p class="px-4 mb-0">${productCategory[product.id]}</p>
            </div>
            <p class="fw-semibold mb-2 titulo-carrinho">${product.nome}</p>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <p class="fs-5 fw-semibold mb-0 preco-carrinho">
                ${moneyBR(subtotal)}${unidade ? ` /${unidade}.` : ''}
              </p>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <button class="btn-itens" data-action="decrement">
                <i class="fa-solid fa-minus" style="color:#ffffff;"></i>
              </button>
              <span class="fw-semibold fs-5 qtd-carrinho">${qty}</span>
              <button class="btn-itens" data-action="increment">
                <i class="fa-solid fa-plus" style="color:#ffffff;"></i>
              </button>
              <button class="btn-itens" data-action="remove" style="background-color:black!important">
                <i class="fa-solid fa-trash" style="color:#ffffff;"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(itemEl);
    });

    updateCartSummary();
    saveCartToStorage();
  }

  function addToCart(productId) {
    const product = productIndex[productId];
    if (!product) return;

    const atual = cartState.get(productId);
    if (atual) {
      atual.qty += 1;
    } else {
      cartState.set(productId, { product, qty: 1 });
    }

    renderCart();

    if (popup) {
      popup.classList.add('update');
      setTimeout(() => popup.classList.remove('update'), 200);
    }
  }

  // ==============================================
  // Inicio - Lógica de Envio (WhatsApp)
  // ==============================================

  function handleCompra(e) {
    e.preventDefault();

    if (!cartState || cartState.size === 0) {
      return;
    }

    let temErro = false;

    if (!selectTipoCliente.value) {
      selectTipoCliente.classList.add("is-invalid");
      temErro = true;
    } else {
      selectTipoCliente.classList.remove("is-invalid");
    }

    const cidade = inputCidade.value.trim();
    if (!cidade) {
      inputCidade.classList.add("is-invalid");
      temErro = true;
    } else {
      inputCidade.classList.remove("is-invalid");
    }

    if (temErro) {
      const form = document.getElementById('cart-form');
      if (!form) return;

      const firstInvalidField = form.querySelector('.is-invalid');
      if (firstInvalidField) {
        firstInvalidField.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      return;
    }

    const tipoTexto = selectTipoCliente.options[selectTipoCliente.selectedIndex].text;
    let total = 0;
    let itensTexto = '';

    cartState.forEach(({ product, qty }) => {
      const subtotal = Number(product.valor) * qty;
      total += subtotal;
      const valorFmt = moneyBR(subtotal);
      const valorSemRS = valorFmt.replace('R$', '').trim();
      itensTexto += `- ${product.nome} - (*Qtd*: ${qty}): R$${valorSemRS}\n`;
    });

    //Dispara evento de "Comprado com sucesso" (GTM)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'comprar_oxi_sucesso',
        tipo_cliente: selectTipoCliente.value,
        cidade: cidade,
        valor_total: total,
        qtd_itens: cartState.size
    });

    const mensagem =
      `Olá Fort Equipamentos! 
Estava navegando pela linha de oxicombustível no site de vocês e gostaria de finalizar a compra dos seguintes itens:

*Item(s)*:
${itensTexto}
*Objetivo* : ${tipoTexto}
*Cidade* : ${cidade}
*Total* : ${moneyBR(total)}`;

    const telefone = '5551994231147';
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    cartState.clear();
    renderCart();

    selectTipoCliente.value = "";
    inputCidade.value = "";
    selectTipoCliente.classList.remove("is-invalid");
    inputCidade.classList.remove("is-invalid");

    setTimeout(closeCart, 50);
  }

  // ==============================================
  // Inicio - Event Listeners (Conexões)
  // ==============================================

  // Botão de voltar ao topo
  if (btnTopo) {
    btnTopo.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Ações do Modal Carrinho (Abrir/Fechar)
  if (cartIcon) {
    cartIcon.addEventListener('click', openCart);
  }
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCart);
  }
  if (overlay && shopContainer) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeCart();
      }
    });
  }

  // Ações de Teclado (Enter/ESC)
  document.addEventListener('keydown', (e) => {
    if (!overlay || !overlay.classList.contains('active')) return;

    if (e.key === 'Enter' && btnComprar) {
      e.preventDefault();
      btnComprar.click(); // Reutiliza o listener de clique
    } else if (e.key === 'Escape') {
      closeCart();
    }
  });

  // Ações de Adicionar/Remover Itens (Delegação de Eventos)
  document.body.addEventListener('click', (e) => {
    const btnAdd = e.target.closest('.btn-add-carrinho');
    if (btnAdd) {
      const id = Number(btnAdd.getAttribute('data-id'));
      if (id) addToCart(id);
    }
  });

  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const itemEl = btn.closest('[data-id]');
      if (!itemEl) return;

      const id = Number(itemEl.dataset.id);
      const entry = cartState.get(id);
      if (!entry) return;

      if (action === 'increment') {
        entry.qty += 1;
      } else if (action === 'decrement') {
        if (entry.qty > 1) {
          entry.qty -= 1;
        } else {
          cartState.delete(id);
        }
      } else if (action === 'remove') {
        cartState.delete(id);
      }
      renderCart();
    });
  }

  // Ação de Limpar Carrinho
  if (btnLimparCarrinho) {
    btnLimparCarrinho.addEventListener('click', limparCarrinho);
  }

  // Ação de Comprar (WhatsApp)
  if (btnComprar) {
    btnComprar.addEventListener('click', handleCompra);
  }

  // ==============================================
  // Inicio - Execução Inicial (Boot)
  // ==============================================

  // Inicializa Swipers
  ['maçaricos', 'reguladores', 'válvulas-e-máquinas', 'acessórios', 'bicos', 'kits']
    .forEach(initSectionSwiper);

  // Animação do badge na carga
  if (popup) {
    popup.classList.add('update');
    setTimeout(() => popup.classList.remove('update'), 200);
  }

  // Ano do footer
  if (anoEl) {
    anoEl.textContent = new Date().getFullYear();
  }

  // Carregar e renderizar carrinho salvo
  loadCartFromStorage();
  renderCart();

}); // Fim do DOMContentLoaded