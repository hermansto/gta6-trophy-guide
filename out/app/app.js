const STORAGE_KEY = 'gta6-trophy-tracker-v1';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_LABEL = { story: 'Story', collectible: 'Collectible', activity: 'Activity', online: 'Online' };
const FILTER_LABEL = { all: 'All', story: 'Story', missable: 'Missable', collectible: 'Collectibles', activity: 'Activities' };

const state = {
  trophies: [],
  byId: new Map(),
  bySlug: new Map(),
  earned: new Set(),
  spoiler: false,
  view: 'checklist',
  filter: 'all',
  grade: 'all',
  search: '',
  sort: 'stage',
  selected: null,
  ready: false
};

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      earned: [...state.earned],
      spoiler: state.spoiler
    }));
  } catch {
    toast('Progress could not be saved in this browser context.');
  }
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.earned)) {
      for (const id of data.earned) {
        if (state.byId.has(Number(id))) state.earned.add(Number(id));
      }
    }
    state.spoiler = data.spoiler === true;
  } catch {
    toast('Saved progress was unreadable; starting fresh.');
  }
}

function platinum() {
  return state.trophies.find((t) => t.grade === 'platinum');
}

function otherTrophies() {
  return state.trophies.filter((t) => t.grade !== 'platinum');
}

function allOthersEarned() {
  return otherTrophies().every((t) => state.earned.has(t.id));
}

function syncPlatinum() {
  const plat = platinum();
  if (!plat) return;
  if (allOthersEarned()) state.earned.add(plat.id);
  else state.earned.delete(plat.id);
}

function isHidden(t) {
  return state.spoiler && t.kind === 'story' && !state.earned.has(t.id);
}

function displayName(t) {
  return isHidden(t) ? '???' : t.name;
}

function displayDescription(t) {
  return isHidden(t) ? 'Hidden until earned' : t.description;
}

function toggleEarned(id) {
  const t = state.byId.get(id);
  if (!t) return;
  if (t.grade === 'platinum') {
    if (!allOthersEarned()) {
      toast('Earn the other 54 trophies before the platinum award.');
      return;
    }
    state.earned.delete(id);
  } else if (state.earned.has(id)) {
    state.earned.delete(id);
  } else {
    state.earned.add(id);
  }
  syncPlatinum();
  save();
  render();
}

function visibleTrophies() {
  const query = state.search.trim().toLowerCase();
  let list = state.trophies.filter((t) => {
    if (state.filter === 'story' && t.kind !== 'story') return false;
    if (state.filter === 'missable' && !t.missable) return false;
    if (state.filter === 'collectible' && t.kind !== 'collectible') return false;
    if (state.filter === 'activity' && t.kind !== 'activity') return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (query) {
      const haystack = isHidden(t) ? '' : `${t.name} ${t.description} ${t.guide} ${t.slug}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  if (state.sort === 'name') {
    list = [...list].sort((a, b) => displayName(a).localeCompare(displayName(b)) || a.stage - b.stage);
  } else if (state.sort === 'grade') {
    list = [...list].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.stage - b.stage);
  } else {
    list = [...list].sort((a, b) => a.stage - b.stage);
  }
  return list;
}

function gradeBadge(t) {
  return `<span class="badge ${esc(t.grade)}">${esc(t.grade)}</span>`;
}

function metaPills(t) {
  const pills = [
    `<span class="pill kind">${esc(KIND_LABEL[t.kind] || t.kind)}</span>`,
    `<span class="pill">Stage ${t.stage}</span>`
  ];
  if (t.missable) pills.push('<span class="pill missable">Missable</span>');
  if (t.hidden) pills.push('<span class="pill hidden">Hidden trophy</span>');
  if (state.earned.has(t.id)) pills.push('<span class="pill">Earned</span>');
  return pills.join('');
}

function renderProgress() {
  const total = state.trophies.length || 55;
  const count = state.earned.size;
  const pct = total ? Math.round((count / total) * 100) : 0;
  $('progressLabel').textContent = `${count}/${total} · platinum progress`;
  $('progressPct').textContent = `${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(count));
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const earnedCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of state.trophies) {
    counts[t.grade] = (counts[t.grade] || 0) + 1;
    if (state.earned.has(t.id)) earnedCounts[t.grade] = (earnedCounts[t.grade] || 0) + 1;
  }
  $('gradeCounts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<span><b>${earnedCounts[g]}/${counts[g]}</b> ${g}</span>`)
    .join('');
}

function renderList() {
  const list = visibleTrophies();
  const container = $('trophyList');
  if (!list.length) {
    container.innerHTML = '<div class="empty">No trophies match the current search and filters.</div>';
    renderDetail(null);
    return;
  }
  if (!state.selected || !list.some((t) => t.id === state.selected)) {
    state.selected = list[0].id;
  }
  container.innerHTML = list.map((t) => {
    const earned = state.earned.has(t.id);
    const disabled = t.grade === 'platinum' && !allOthersEarned();
    return `
      <article class="trophy-card ${earned ? 'earned' : ''} ${state.selected === t.id ? 'selected' : ''}"
               role="listitem" data-id="${t.id}" tabindex="0" aria-label="${esc(displayName(t))}">
        <input type="checkbox" data-check="${t.id}" ${earned ? 'checked' : ''} ${disabled ? 'disabled' : ''}
               aria-label="Mark ${esc(displayName(t))} earned">
        <div>
          <div class="card-top">${gradeBadge(t)}<span class="trophy-name">${esc(displayName(t))}</span></div>
          <p class="trophy-desc">${esc(displayDescription(t))}</p>
          <div class="meta">${metaPills(t)}</div>
        </div>
      </article>`;
  }).join('');
  renderDetail(state.byId.get(state.selected));
}

function renderDetail(t) {
  const detail = $('detail');
  if (!t) {
    detail.innerHTML = '<div class="empty">Select a trophy to see its official description, original guide, sources, and roadmap stage.</div>';
    return;
  }
  const earned = state.earned.has(t.id);
  const hidden = isHidden(t);
  const platLocked = t.grade === 'platinum' && !allOthersEarned();
  const warning = t.missable
    ? `<div class="warning"><strong>Missable priority.</strong> ${esc(t.missableReason || 'The official description suggests a limited story window.')}</div>`
    : '';
  const body = hidden
    ? `<div class="locked"><strong>???</strong><br>Hidden until earned. Turn off the spoiler shield or mark this story trophy earned to reveal its official name, description, and guide.</div>`
    : `
      <h3>Official description</h3>
      <p class="official">${esc(t.description)}</p>
      <h3>Guide · original interpretation</h3>
      <p class="guide">${esc(t.guide)}</p>
      <h3>Sources</h3>
      <ul class="sources">${t.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${warning}
    `;
  detail.innerHTML = `
    <div class="card-top">${gradeBadge(t)}<span class="pill kind">${esc(KIND_LABEL[t.kind] || t.kind)}</span><span class="pill">Roadmap stage ${t.stage}</span></div>
    <h2>${esc(displayName(t))}</h2>
    <div class="meta">${metaPills(t)}</div>
    ${hidden ? warning : ''}
    ${body}
    <button class="mark-btn ${earned ? 'earned' : ''}" type="button" data-mark="${t.id}" ${platLocked ? 'disabled' : ''}>
      ${earned ? 'Earned · click to unmark' : platLocked ? 'Platinum locked · earn the other 54 first' : 'Mark earned'}
    </button>
  `;
}

function roadmapGroups() {
  return [
    { title: 'Story chapters & missions', sub: 'Stages 1–18 · earn chapter checkpoints in order', min: 1, max: 18 },
    { title: 'Collectibles & exploration', sub: 'Stages 19–24 · close location and collection sets', min: 19, max: 24 },
    { title: 'Activities & challenges', sub: 'Stages 25–53 · clear repeatable activities and cumulative goals', min: 25, max: 53 },
    { title: 'Completion & platinum', sub: 'Stages 54–55 · finish 100% and the platinum award', min: 54, max: 55 }
  ];
}

function renderRoadmap() {
  const groups = roadmapGroups();
  $('roadmapGroups').innerHTML = groups.map((group) => {
    const items = state.trophies
      .filter((t) => t.stage >= group.min && t.stage <= group.max)
      .sort((a, b) => a.stage - b.stage);
    const earned = items.filter((t) => state.earned.has(t.id)).length;
    const missable = items.filter((t) => t.missable).length;
    return `
      <section class="roadmap-group">
        <h2>${esc(group.title)}</h2>
        <div class="sub">${esc(group.sub)} · ${earned}/${items.length} earned · ${missable} missable flag${missable === 1 ? '' : 's'}</div>
        ${items.map((t) => `
          <div class="roadmap-item ${t.missable ? 'missable' : ''} ${state.earned.has(t.id) ? 'earned' : ''}">
            <div class="stage-num">${t.stage}</div>
            <div>
              <div class="roadmap-name">${esc(displayName(t))} ${t.missable ? '<span class="pill missable">Missable</span>' : ''}</div>
              <div class="roadmap-sub">${esc(t.grade)} · ${esc(KIND_LABEL[t.kind] || t.kind)}${state.earned.has(t.id) ? ' · earned' : ''}</div>
            </div>
            <button class="open-btn" type="button" data-open="${t.id}">Open</button>
          </div>`).join('')}
      </section>`;
  }).join('');
}

function renderControls() {
  $('spoilerToggle').checked = state.spoiler;
  $('spoilerBanner').hidden = !state.spoiler;
  $('checklistTab').classList.toggle('active', state.view === 'checklist');
  $('roadmapTab').classList.toggle('active', state.view === 'roadmap');
  $('checklistTab').setAttribute('aria-pressed', String(state.view === 'checklist'));
  $('roadmapTab').setAttribute('aria-pressed', String(state.view === 'roadmap'));
  $('checklistView').hidden = state.view !== 'checklist';
  $('roadmapView').hidden = state.view !== 'roadmap';
  for (const chip of document.querySelectorAll('#kindChips .chip')) {
    const active = chip.dataset.filter === state.filter;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
  $('gradeFilter').value = state.grade;
  $('sortSelect').value = state.sort;
  $('search').value = state.search;
}

function updateHash() {
  const parts = [];
  if (state.view === 'roadmap') parts.push('roadmap');
  if (state.selected && state.view === 'checklist') {
    const t = state.byId.get(state.selected);
    if (t) parts.push(`trophy=${t.slug}`);
  }
  if (state.filter !== 'all') parts.push(`filter=${state.filter}`);
  if (state.spoiler) parts.push('spoiler');
  const hash = parts.length ? `#${parts.join('&')}` : '';
  if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
}

function render() {
  if (!state.ready) return;
  syncPlatinum();
  renderControls();
  renderProgress();
  if (state.view === 'checklist') renderList();
  else renderRoadmap();
  updateHash();
}

function applyHash() {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return;
  for (const part of raw.split('&')) {
    if (part === 'roadmap') state.view = 'roadmap';
    else if (part === 'checklist') state.view = 'checklist';
    else if (part === 'spoiler') state.spoiler = true;
    else if (part.startsWith('trophy=')) {
      const key = decodeURIComponent(part.slice(7));
      const t = state.bySlug.get(key) || state.byId.get(Number(key));
      if (t) {
        state.selected = t.id;
        state.view = 'checklist';
      }
    } else if (part.startsWith('filter=')) {
      const value = part.slice(7);
      const map = { collectibles: 'collectible', activities: 'activity', story: 'story', missable: 'missable', all: 'all' };
      if (map[value]) state.filter = map[value];
    }
  }
}

function exportProgress() {
  const payload = {
    app: 'gta6-trophy-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    spoiler: state.spoiler
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gta6-trophy-progress.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Progress exported as JSON.');
}

async function importProgress(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.earned)) throw new Error('Missing earned array');
    const next = new Set();
    for (const id of data.earned) {
      const numeric = Number(id);
      if (!state.byId.has(numeric)) throw new Error(`Unknown trophy id ${id}`);
      next.add(numeric);
    }
    state.earned = next;
    state.spoiler = data.spoiler === true;
    syncPlatinum();
    save();
    render();
    toast(`Imported ${state.earned.size} earned trophies.`);
  } catch (err) {
    toast(`Import failed: ${err.message}`);
  }
}

function bindEvents() {
  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    save();
    render();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  $('checklistTab').addEventListener('click', () => {
    state.view = 'checklist';
    render();
  });
  $('roadmapTab').addEventListener('click', () => {
    state.view = 'roadmap';
    render();
  });
  $('search').addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });
  $('gradeFilter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    render();
  });
  $('sortSelect').addEventListener('change', (event) => {
    state.sort = event.target.value;
    render();
  });
  $('kindChips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    render();
  });
  $('trophyList').addEventListener('click', (event) => {
    const check = event.target.closest('input[data-check]');
    if (check) {
      toggleEarned(Number(check.dataset.check));
      return;
    }
    const card = event.target.closest('.trophy-card');
    if (!card) return;
    state.selected = Number(card.dataset.id);
    render();
  });
  $('trophyList').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.trophy-card');
    if (!card || event.target.matches('input')) return;
    event.preventDefault();
    state.selected = Number(card.dataset.id);
    render();
  });
  $('detail').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mark]');
    if (button) toggleEarned(Number(button.dataset.mark));
  });
  $('roadmapGroups').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-open]');
    if (!button) return;
    state.selected = Number(button.dataset.open);
    state.view = 'checklist';
    render();
  });
  window.addEventListener('hashchange', () => {
    applyHash();
    render();
  });
}

async function init() {
  try {
    const response = await fetch('data/trophies.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.trophies = data.trophies;
    state.byId = new Map(state.trophies.map((t) => [t.id, t]));
    state.bySlug = new Map(state.trophies.map((t) => [t.slug, t]));
    state.ready = true;
    loadSaved();
    applyHash();
    if (!state.selected) {
      const first = [...state.trophies].sort((a, b) => a.stage - b.stage)[0];
      state.selected = first ? first.id : null;
    }
    bindEvents();
    render();
  } catch (err) {
    $('trophyList').innerHTML = `<div class="empty">Could not load trophy data: ${esc(err.message)}. Serve the app over a local static server so data/trophies.json can be read.</div>`;
  }
}

init();
