'use strict';

const IN_GAME = typeof GetParentResourceName === 'function';
const RESOURCE = IN_GAME ? GetParentResourceName() : 'report_system';

const TEXT_MIN = 10;
const TEXT_MAX = 300;
const SEND_TIMEOUT_MS = 8000;

const CATEGORIES = [
  { key: 'bug', label: 'Bug' },
  { key: 'player', label: 'Spieler melden' },
  { key: 'question', label: 'Frage' },
  { key: 'other', label: 'Sonstiges' }
];

const state = {
  view: 'form',
  category: 'bug',
  sending: false
};
let sendTimer = null;

const $ = (id) => document.getElementById(id);
const appEl = $('app');
const windowEl = $('window');
const titleEl = $('title');
const countEl = $('list-count');
const formView = $('form-view');
const listView = $('list-view');
const categoriesEl = $('categories');
const targetField = $('target-field');
const targetEl = $('target');
const textEl = $('text');
const counterEl = $('counter');
const messageEl = $('message');
const submitBtn = $('submit-btn');
const reportListEl = $('report-list');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function post(callback, data = {}) {
  try {
    const response = await fetch(`https://${RESOURCE}/${callback}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return null;
  }
}

function charCount(text) {
  return Array.from(text).length;
}

function showMessage(text, type) {
  messageEl.replaceChildren(
    el('span', null, type === 'error' ? '✕' : '✓'),
    el('span', null, text)
  );
  messageEl.className = 'message message--' + type;
  messageEl.hidden = false;
}

function hideMessage() {
  messageEl.hidden = true;
}

function renderCategories() {
  categoriesEl.replaceChildren();
  for (const category of CATEGORIES) {
    const btn = el('button', 'pill', category.label);
    btn.type = 'button';
    btn.dataset.category = category.key;
    btn.setAttribute('aria-pressed', String(category.key === state.category));
    if (category.key === state.category) btn.classList.add('is-active');
    categoriesEl.appendChild(btn);
  }
  targetField.hidden = state.category !== 'player';
}

function updateCounter() {
  const length = charCount(textEl.value.trim());
  counterEl.textContent = `${length} / ${TEXT_MAX}`;
  const invalid = length > TEXT_MAX || (length > 0 && length < TEXT_MIN);
  counterEl.classList.toggle('is-invalid', invalid);
}

function setSending(sending) {
  state.sending = sending;
  submitBtn.disabled = sending;
  submitBtn.textContent = sending ? 'Sende ...' : 'Absenden';
}

function submit() {
  if (state.sending) return;
  hideMessage();

  const text = textEl.value.trim();
  const length = charCount(text);
  if (length < TEXT_MIN || length > TEXT_MAX) {
    showMessage(`Der Text muss zwischen ${TEXT_MIN} und ${TEXT_MAX} Zeichen lang sein.`, 'error');
    return;
  }

  let targetId = null;
  if (state.category === 'player') {
    const raw = targetEl.value.trim();
    if (!/^\d+$/.test(raw)) {
      showMessage('Bitte gib eine gültige Server-ID an.', 'error');
      return;
    }
    targetId = Number(raw);
  }

  setSending(true);

  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => {
    handleResult(false, 'Keine Antwort vom Server. Bitte versuche es erneut.');
  }, SEND_TIMEOUT_MS);

  post('submit', { category: state.category, text, targetId }).then((response) => {
    if (!response || !response.ok) {
      handleResult(false, 'Der Report konnte nicht gesendet werden.');
    }
  });
}

function handleResult(ok, message) {
  clearTimeout(sendTimer);
  setSending(false);
  showMessage(message, ok ? 'success' : 'error');
  if (ok) {
    textEl.value = '';
    targetEl.value = '';
    updateCounter();
  }
}

function renderList(reports) {
  const list = Array.isArray(reports) ? reports : [];
  reportListEl.replaceChildren();
  countEl.textContent = String(list.length);

  if (list.length === 0) {
    reportListEl.appendChild(el('p', 'empty', 'Keine offenen Reports.'));
    return;
  }

  for (const report of list) {
    const card = el('article', 'report');

    const top = el('div', 'report__top');
    top.append(
      el('span', 'badge badge--accent', '#' + report.id),
      el('span', 'badge', report.category),
      el('span', 'report__who', `${report.senderName} (ID ${report.senderId})`),
      el('span', 'report__time', report.time)
    );
    card.appendChild(top);

    if (report.targetId !== undefined && report.targetId !== null) {
      card.appendChild(el('span', 'report__target', `Gemeldet: ${report.targetName || 'Unbekannt'} (ID ${report.targetId})`));
    }

    card.appendChild(el('p', 'report__text', report.text));

    const actions = el('div', 'report__actions');
    const done = el('button', 'btn btn--done', 'Erledigt');
    done.type = 'button';
    done.dataset.id = String(report.id);
    actions.appendChild(done);
    card.appendChild(actions);

    reportListEl.appendChild(card);
  }
}

function openUi(view, reports) {
  state.view = view === 'list' ? 'list' : 'form';
  const isList = state.view === 'list';

  windowEl.classList.toggle('window--wide', isList);
  titleEl.textContent = isList ? 'Offene Reports' : 'Report senden';
  countEl.hidden = !isList;
  formView.hidden = isList;
  listView.hidden = !isList;
  hideMessage();

  if (isList) {
    renderList(reports);
  } else {
    setSending(false);
    renderCategories();
    updateCounter();
  }

  appEl.hidden = false;
  if (!isList) textEl.focus();
}

function hideUi() {
  appEl.hidden = true;
}

function closeUi() {
  hideUi();
  post('close');
}

categoriesEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-category]');
  if (!btn) return;
  state.category = btn.dataset.category;
  renderCategories();
  hideMessage();
});

textEl.addEventListener('input', updateCounter);
submitBtn.addEventListener('click', submit);
$('cancel-btn').addEventListener('click', closeUi);
$('close-btn').addEventListener('click', closeUi);

reportListEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  btn.disabled = true;
  post('resolve', { id: Number(btn.dataset.id) });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !appEl.hidden) closeUi();
});

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.action !== 'string') return;

  switch (data.action) {
    case 'open':
      openUi(data.view, data.reports);
      break;
    case 'close':
      hideUi();
      break;
    case 'result':
      handleResult(data.ok === true, String(data.message || ''));
      break;
    case 'list':
      if (state.view === 'list') renderList(data.reports);
      break;
  }
});

if (!IN_GAME) openUi('form');
