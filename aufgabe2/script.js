'use strict';

const ITEMS = [
  { id: 'burger',    name: 'Burger',    price: 12,  category: 'Essen',    icon: '\u{1F354}' },
  { id: 'sandwich',  name: 'Sandwich',  price: 8,   category: 'Essen',    icon: '\u{1F96A}' },
  { id: 'donut',     name: 'Donut',     price: 4,   category: 'Essen',    icon: '\u{1F369}' },
  { id: 'chips',     name: 'Chips',     price: 5,   category: 'Essen',    icon: '\u{1F35F}' },
  { id: 'water',     name: 'Wasser',    price: 3,   category: 'Getränke', icon: '\u{1F4A7}' },
  { id: 'cola',      name: 'Cola',      price: 5,   category: 'Getränke', icon: '\u{1F964}' },
  { id: 'coffee',    name: 'Kaffee',    price: 6,   category: 'Getränke', icon: '\u2615' },
  { id: 'phone',     name: 'Handy',     price: 250, category: 'Technik',  icon: '\u{1F4F1}' },
  { id: 'radio',     name: 'Funkgerät', price: 120, category: 'Technik',  icon: '\u{1F4FB}' },
  { id: 'powerbank', name: 'Powerbank', price: 35,  category: 'Technik',  icon: '\u{1F50B}' }
];

const START_MONEY = 500;
const MAX_QTY = 99;
const STORAGE_KEY = 'shop_cart';

const state = {
  money: START_MONEY,
  cart: loadCart(),
  category: 'Alle',
  search: '',
  selected: ITEMS[0].id,
  qty: 1
};

const $ = (id) => document.getElementById(id);
const shopEl = $('shop');
const moneyEl = $('money');
const messageEl = $('message');
const searchEl = $('search');
const filtersEl = $('filters');
const catalogEl = $('catalog-list');
const cartListEl = $('cart-list');
const totalEl = $('total');
const buyBtn = $('buy-btn');

let messageTimer = null;

function formatPrice(value) {
  return '$' + value.toLocaleString('de-DE');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function findItem(id) {
  return ITEMS.find((item) => item.id === id);
}

function getTotal() {
  let sum = 0;
  for (const id in state.cart) {
    sum += findItem(id).price * state.cart[id];
  }
  return sum;
}

function getMaxQty() {
  const item = findItem(state.selected);
  return Math.min(MAX_QTY, Math.max(1, Math.floor(state.money / item.price)));
}

function loadCart() {
  const cart = {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && typeof raw === 'object') {
      for (const id in raw) {
        const qty = raw[id];
        if (findItem(id) && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY) {
          cart[id] = qty;
        }
      }
    }
  } catch (e) {
  }
  return cart;
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  } catch (e) {
  }
}

function showMessage(text, type) {
  messageEl.replaceChildren(el('span', 'message__icon', type === 'error' ? '✕' : '✓'), el('span', null, text));
  messageEl.className = 'message message--' + type;
  messageEl.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { messageEl.hidden = true; }, 3000);
}

function renderDetail() {
  const item = findItem(state.selected);
  $('sel-name').textContent = item.name;
  $('sel-cat').textContent = item.category;
  $('sel-price').textContent = formatPrice(item.price);
  $('sel-icon').textContent = item.icon;
  $('qty-value').textContent = String(state.qty);
}

function renderFilters() {
  filtersEl.replaceChildren();
  const categories = ['Alle', ...new Set(ITEMS.map((item) => item.category))];
  for (const cat of categories) {
    const btn = el('button', 'pill', cat);
    btn.type = 'button';
    btn.dataset.category = cat;
    if (cat === state.category) btn.classList.add('is-active');
    filtersEl.appendChild(btn);
  }
}

function renderCatalog() {
  const term = state.search.trim().toLowerCase();
  const visible = ITEMS.filter((item) => {
    const matchesCategory = state.category === 'Alle' || item.category === state.category;
    return matchesCategory && item.name.toLowerCase().includes(term);
  });

  catalogEl.replaceChildren();

  if (visible.length === 0) {
    catalogEl.appendChild(el('p', 'empty', 'Keine Artikel gefunden.'));
    return;
  }

  const categories = [...new Set(visible.map((item) => item.category))];
  for (const cat of categories) {
    const group = visible.filter((item) => item.category === cat);

    const head = el('div', 'section-head');
    head.append(el('span', 'section-head__title', cat), el('span', 'count', String(group.length)), el('span', 'section-head__line'));
    catalogEl.appendChild(head);

    const list = el('ul', 'rows');
    for (const item of group) {
      const li = el('li');
      const row = el('button', 'row');
      row.type = 'button';
      row.dataset.id = item.id;
      if (item.id === state.selected) row.classList.add('is-selected');
      if (item.price > state.money) row.classList.add('is-locked');

      row.append(
        el('span', 'row__icon', item.icon),
        el('span', 'row__name', item.name),
        el('span', 'badge', formatPrice(item.price)),
        el('span', 'row__end', item.price > state.money ? '\u{1F512}' : '')
      );
      li.appendChild(row);
      list.appendChild(li);
    }
    catalogEl.appendChild(list);
  }
}

function renderCart() {
  cartListEl.replaceChildren();
  const ids = Object.keys(state.cart);

  if (ids.length === 0) {
    cartListEl.appendChild(el('li', 'empty', 'Dein Warenkorb ist leer.'));
  }

  for (const id of ids) {
    const item = findItem(id);
    const qty = state.cart[id];

    const li = el('li', 'cart-item');
    const controls = el('div', 'mini-stepper');
    controls.append(
      makeButton('−', 'dec', id, 'Menge verringern'),
      el('span', 'mini-stepper__value', String(qty)),
      makeButton('+', 'inc', id, 'Menge erhöhen')
    );

    li.append(
      el('span', 'row__icon', item.icon),
      el('span', 'cart-item__name', item.name),
      controls,
      el('span', 'cart-item__sum', formatPrice(item.price * qty)),
      makeButton('✕', 'remove', id, 'Entfernen')
    );
    cartListEl.appendChild(li);
  }

  totalEl.textContent = formatPrice(getTotal());
  buyBtn.disabled = ids.length === 0;
}

function makeButton(label, action, id, ariaLabel) {
  const btn = el('button', action === 'remove' ? 'mini-btn mini-btn--danger' : 'mini-btn', label);
  btn.type = 'button';
  btn.dataset.action = action;
  btn.dataset.id = id;
  btn.setAttribute('aria-label', ariaLabel);
  return btn;
}

function renderMoney() {
  moneyEl.textContent = formatPrice(state.money);
}

function selectItem(id) {
  if (!findItem(id)) return;
  state.selected = id;
  state.qty = 1;
  renderDetail();
  renderCatalog();
}

function changeSelectedQty(next) {
  state.qty = Math.min(Math.max(next, 1), MAX_QTY);
  renderDetail();
}

function addSelectedToCart() {
  const id = state.selected;
  state.cart[id] = Math.min((state.cart[id] || 0) + state.qty, MAX_QTY);
  state.qty = 1;
  renderDetail();
  updateCart();
}

function changeCartQty(id, delta) {
  if (!(id in state.cart)) return;
  const next = state.cart[id] + delta;
  if (next <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = Math.min(next, MAX_QTY);
  }
  updateCart();
}

function removeFromCart(id) {
  delete state.cart[id];
  updateCart();
}

function updateCart() {
  saveCart();
  renderCart();
}

function buy() {
  const total = getTotal();
  if (total === 0) return;

  if (total > state.money) {
    showMessage('Nicht genug Geld. Dir fehlen ' + formatPrice(total - state.money) + '.', 'error');
    return;
  }

  state.money -= total;
  state.cart = {};
  renderMoney();
  renderCatalog();
  updateCart();
  showMessage('Kauf erfolgreich: ' + formatPrice(total) + ' bezahlt.', 'success');
}

function openShop() {
  shopEl.hidden = false;
}

function closeShop() {
  shopEl.hidden = true;
}

$('open-btn').addEventListener('click', openShop);
$('close-btn').addEventListener('click', closeShop);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !shopEl.hidden) closeShop();
});

searchEl.addEventListener('input', () => {
  state.search = searchEl.value;
  renderCatalog();
});

filtersEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-category]');
  if (!btn) return;
  state.category = btn.dataset.category;
  renderFilters();
  renderCatalog();
});

catalogEl.addEventListener('click', (event) => {
  const row = event.target.closest('button[data-id]');
  if (row) selectItem(row.dataset.id);
});

cartListEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'inc') changeCartQty(id, 1);
  if (btn.dataset.action === 'dec') changeCartQty(id, -1);
  if (btn.dataset.action === 'remove') removeFromCart(id);
});

$('qty-dec').addEventListener('click', () => changeSelectedQty(state.qty - 1));
$('qty-inc').addEventListener('click', () => changeSelectedQty(state.qty + 1));
$('qty-max').addEventListener('click', () => changeSelectedQty(getMaxQty()));
$('add-btn').addEventListener('click', addSelectedToCart);
buyBtn.addEventListener('click', buy);

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.action !== 'string') return;
  if (data.action === 'open') openShop();
  if (data.action === 'close') closeShop();
});

renderDetail();
renderFilters();
renderCatalog();
renderCart();
renderMoney();