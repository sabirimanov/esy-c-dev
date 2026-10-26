const TABLE_INFO = {
  comms: 'Readings and link status: volume, valve, state, IP',
  daily: 'Daily totals and the diagnostic counter',
  devices: 'Meter registry: region, address, coordinates, ICCID',
  gsm: 'Radio: RSRP, RSRQ, SNR, cell, band',
  meter_logs: 'Communication log. This table is empty',
  roster: 'Which meter sat on which cell each day',
};

const fmt = new Intl.NumberFormat('en-US');
const state = {
  databases: [],
  meta: null,
  table: null,
  page: 0,
  limit: 100,
  sort: null,
  rows: [],
  total: 0,
  ms: 0,
  sql: '',
  token: 0,
  viewToken: 0,
  metaToken: 0,
  navBound: false,
  deviceQ: '',
};

const side = document.getElementById('side');
const headerBar = document.getElementById('top');
const view = document.getElementById('view');
const drawer = document.getElementById('drawer');

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function label(name) {
  return String(name).replaceAll('mÂ³', 'm³').replaceAll('Â³', '³');
}

function formatCount(value) {
  return fmt.format(Number(value) || 0);
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function display(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function shortStat(value) {
  if (value == null || value === '' || String(value).startsWith('—')) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const digits = Math.abs(n) >= 100 ? 1 : 3;
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
}

function addDays(ymd, delta) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function toLocalInput(value) {
  if (!value || String(value).startsWith('—')) return '';
  return String(value).replace(' ', 'T').slice(0, 16);
}

function dbHash(file, tail = '') {
  return `#/db/${encodeURIComponent(file)}${tail}`;
}

function parseHash() {
  const parts = location.hash.replace(/^#/, '').split('/').filter(Boolean);
  if (parts[0] !== 'db' || !parts[1]) return {};
  const file = decodeURIComponent(parts[1]);
  if (parts[2] === 't' && parts[3]) {
    return { file, view: 'table', table: decodeURIComponent(parts.slice(3).join('/')) };
  }
  if (parts[2] === 'd' && parts[3]) {
    return { file, view: 'device', q: decodeURIComponent(parts.slice(3).join('/')) };
  }
  return { file, view: 'overview' };
}

async function boot() {
  const response = await fetch('/api/databases');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not list databases');
  state.databases = data.databases || [];
  if (!state.databases.length) throw new Error('No .duckdb files in this folder');
  window.addEventListener('hashchange', () => {
    route().catch((error) => {
      view.textContent = error.message;
    });
  });
  if (!parseHash().file) {
    location.hash = dbHash(state.databases[0].name);
    return;
  }
  await route();
}

async function ensureMeta(file) {
  if (state.meta?.file === file) return;
  const token = ++state.metaToken;
  state.table = null;
  view.replaceChildren(el('p', { class: 'muted', text: `Reading ${file}…` }));
  const response = await fetch(`/api/meta?database=${encodeURIComponent(file)}`);
  const data = await response.json();
  if (token !== state.metaToken) return;
  if (!response.ok) throw new Error(data.error || 'Could not read the schema');
  state.meta = data;
  renderChrome();
}

async function route() {
  const parsed = parseHash();
  const file = parsed.file || state.databases[0]?.name;
  if (!file) return;
  if (!parsed.file) {
    location.hash = dbHash(file);
    return;
  }
  await ensureMeta(file);
  if (state.meta?.file !== file) return;
  markNav();
  closeDrawer();
  if (parsed.view === 'table') {
    openTable(parsed.table);
    return;
  }
  if (parsed.view === 'device') {
    if (!state.meta.deviceLookup) {
      location.hash = dbHash(file);
      return;
    }
    const input = document.getElementById('q');
    if (input) input.value = parsed.q;
    openDevice(parsed.q);
    return;
  }
  renderOverview();
}

function renderChrome() {
  const dbSelect = el('select', { class: 'control db-select', id: 'database' });
  for (const database of state.databases) {
    const option = el('option', {
      value: database.name,
      text: `${database.name} · ${formatBytes(database.bytes)}`,
    });
    if (database.name === state.meta.file) option.selected = true;
    dbSelect.append(option);
  }
  dbSelect.addEventListener('change', () => {
    location.hash = dbHash(dbSelect.value);
  });

  side.replaceChildren(
    el('div', { class: 'brand' }, [
      el('div', { class: 'mark', text: 'D' }),
      el('h1', { text: 'DuckDB' }),
      el('p', { text: 'Explorer' }),
    ]),
    el('div', { class: 'nav-label', text: 'Database' }),
    dbSelect,
    el('div', { class: 'nav-label', text: 'Browse' }),
    navButton('overview', 'Overview', ''),
    el('div', { class: 'nav-label', text: 'Tables' }),
    ...state.meta.tables.map((table) => navButton(table.name, table.name, formatCount(table.count))),
  );
  if (!state.navBound) {
    side.addEventListener('click', onNav);
    state.navBound = true;
  }

  if (state.meta.deviceLookup) {
    const input = el('input', {
      id: 'q',
      type: 'search',
      placeholder: 'MSN, retrofit, account, ICCID, or address',
    });
    const form = el('form', { id: 'search' }, [
      input,
      el('button', { type: 'submit', text: 'Find meter' }),
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (query.length < 3) {
        input.focus();
        return;
      }
      location.hash = dbHash(state.meta.file, `/d/${encodeURIComponent(query)}`);
    });
    headerBar.replaceChildren(form, el('p', { class: 'readonly', text: 'Read only' }));
  } else {
    headerBar.replaceChildren(
      el('p', { class: 'muted', text: `${state.meta.file} · schema is loaded from the file itself` }),
      el('p', { class: 'readonly', text: 'Read only' }),
    );
  }
}

function navButton(nav, text, count) {
  return el('button', { class: 'nav-btn', type: 'button', 'data-nav': nav }, [
    el('span', { text }),
    el('small', { text: count }),
  ]);
}

function onNav(event) {
  const button = event.target.closest('[data-nav]');
  if (!button || !state.meta) return;
  const nav = button.dataset.nav;
  location.hash = nav === 'overview'
    ? dbHash(state.meta.file)
    : dbHash(state.meta.file, `/t/${encodeURIComponent(nav)}`);
}

function markNav() {
  const parsed = parseHash();
  for (const button of side.querySelectorAll('[data-nav]')) {
    const nav = button.dataset.nav;
    const active = nav === 'overview'
      ? parsed.view === 'overview'
      : parsed.view === 'table' && parsed.table === nav;
    button.classList.toggle('active', active);
  }
}

function tableMeta(name) {
  return state.meta.tables.find((table) => table.name === name);
}

function timeSpan(table) {
  const column = table.columns.find((item) => item.kind === 'time' && item.min && !String(item.min).startsWith('—'));
  if (!column) return 'No time column';
  return `${column.min} — ${column.max}`;
}

function renderOverview() {
  state.viewToken += 1;
  state.table = null;
  const intro = state.meta.deviceLookup
    ? `${state.meta.file} has ${state.meta.tables.length} tables. Filter by time, number, or category, and open a row for every field. Search finds one meter across the registry, readings, GSM, and roster. API spec on a table turns the columns you pick into a text block you can send back.`
    : `${state.meta.file} has ${state.meta.tables.length} tables. The explorer follows whatever columns are in the file. API spec on a table turns the columns you pick into a text block you can send back. Drop more .duckdb files in this folder and refresh to switch.`;
  view.replaceChildren(
    el('p', { class: 'intro', text: intro }),
    el('div', { class: 'cards' }, state.meta.tables.map((table) => {
      const card = el('button', { class: 'card', type: 'button' }, [
        el('h2', { text: table.name }),
        el('div', { class: 'count', text: formatCount(table.count) }),
        el('p', { text: TABLE_INFO[table.name] || `${table.columns.length} columns` }),
        el('div', { class: 'span', text: timeSpan(table) }),
        el('div', { class: 'pills' }, (table.columns.find((column) => column.options)?.options || [])
          .filter((option) => option.value != null)
          .slice(0, 4)
          .map((option) => el('span', { class: 'pill', text: `${option.value} · ${formatCount(option.n)}` }))),
      ]);
      card.addEventListener('click', () => {
        location.hash = dbHash(state.meta.file, `/t/${encodeURIComponent(table.name)}`);
      });
      return card;
    })),
  );
}

function defaultSort(table) {
  const time = table.columns.find((column) => column.kind === 'time');
  if (time) return { column: time.name, dir: 'desc' };
  return { column: table.columns[0]?.name, dir: 'asc' };
}

function openTable(name) {
  state.viewToken += 1;
  const table = tableMeta(name);
  if (!table) {
    view.replaceChildren(el('p', { class: 'error', text: 'That table is not in this database' }));
    return;
  }
  const same = state.table === name && document.getElementById('grid');
  state.table = name;
  if (!same) {
    state.page = 0;
    state.limit = 100;
    state.sort = defaultSort(table);
    renderTableChrome(table);
  }
  loadRows();
}

function renderTableChrome(table) {
  const title = el('div', { class: 'toolbar' }, [
    el('h2', { text: table.name }),
    el('span', { class: 'muted', text: TABLE_INFO[table.name] || `${table.columns.length} columns` }),
  ]);
  const filters = el('div', { class: 'filters', id: 'filters' });
  const timeColumns = table.columns.filter((column) => column.kind === 'time');
  const categories = table.columns.filter((column) => column.options?.length);
  const texts = table.columns.filter((column) => column.kind === 'text' && !column.options);
  const numbers = table.columns.filter((column) => column.kind === 'number' && !column.options);

  if (timeColumns.length) {
    const block = el('section', { class: 'filter-block' }, [
      el('h3', { text: 'Time range' }),
      el('p', { class: 'hint', text: 'An empty side is unbounded. A date with no time includes the whole day.' }),
    ]);
    const grid = el('div', { class: 'range-row' });
    for (const column of timeColumns) {
      const from = el('input', {
        class: 'control',
        type: 'datetime-local',
        'data-filter': '1',
        'data-kind': 'time',
        'data-bound': 'from',
        step: '1',
      });
      const to = el('input', {
        class: 'control',
        type: 'datetime-local',
        'data-filter': '1',
        'data-kind': 'time',
        'data-bound': 'to',
        step: '1',
      });
      from.dataset.col = column.name;
      to.dataset.col = column.name;
      from.addEventListener('change', scheduleLoad);
      to.addEventListener('change', scheduleLoad);
      const box = el('div', {}, [
        el('span', { class: 'field-label', text: label(column.name) }),
        el('div', { class: 'pair' }, [from, to]),
        el('div', { class: 'quantile', text: `in database ${column.min || '—'} — ${column.max || '—'}` }),
      ]);
      if (column === timeColumns[0] && column.max && !String(column.max).startsWith('—')) {
        const presets = el('div', { class: 'presets' });
        for (const [text, days] of [['Day', 1], ['7 days', 7], ['30 days', 30], ['All', 0]]) {
          const button = el('button', { class: 'preset', type: 'button', text });
          button.addEventListener('click', () => {
            if (!days) {
              from.value = '';
              to.value = '';
            } else {
              const max = String(column.max);
              const endDay = max.slice(0, 10);
              from.value = `${addDays(endDay, -(days - 1))}T00:00`;
              to.value = toLocalInput(max);
            }
            scheduleLoad();
          });
          presets.append(button);
        }
        box.append(presets);
      }
      grid.append(box);
    }
    block.append(grid);
    filters.append(block);
  }

  if (categories.length) {
    const block = el('section', { class: 'filter-block' }, [
      el('h3', { text: 'Categories' }),
      el('p', { class: 'hint', text: 'Leave everything unchecked to ignore the column. Checked values are combined with OR.' }),
    ]);
    for (const column of categories) {
      const cats = el('div', { class: 'cats' });
      const wrap = column.options.length > 8
        ? el('details', {}, [el('summary', { text: `${label(column.name)} · ${column.options.length}` }), cats])
        : el('div', {}, [el('span', { class: 'field-label', text: label(column.name) }), cats]);
      for (const option of column.options) {
        const box = el('input', { type: 'checkbox', 'data-filter': '1', 'data-kind': 'cat' });
        box.dataset.col = column.name;
        if (option.value == null) box.dataset.null = '1';
        else box.dataset.value = option.value;
        box.addEventListener('change', scheduleLoad);
        const caption = option.value == null ? 'empty' : option.value;
        cats.append(el('label', {}, [box, el('span', { text: `${caption} · ${formatCount(option.n)}` })]));
      }
      block.append(wrap);
    }
    filters.append(block);
  }

  if (texts.length) {
    const block = el('section', { class: 'filter-block' }, [el('h3', { text: 'Text' })]);
    const grid = el('div', { class: 'text-grid' });
    for (const column of texts) {
      const input = el('input', { class: 'control', type: 'search', 'data-filter': '1', 'data-kind': 'text', 'data-role': 'value' });
      const mode = el('select', { class: 'text-mode', 'data-filter': '1', 'data-kind': 'text', 'data-role': 'mode' }, [
        el('option', { value: 'contains', text: 'contains' }),
        el('option', { value: 'eq', text: 'exact' }),
      ]);
      input.dataset.col = column.name;
      mode.dataset.col = column.name;
      input.addEventListener('input', scheduleLoad);
      mode.addEventListener('change', scheduleLoad);
      grid.append(el('label', {}, [
        el('span', { class: 'field-label', text: label(column.name) }),
        el('div', { class: 'pair' }, [input, mode]),
      ]));
    }
    block.append(grid);
    filters.append(block);
  }

  if (numbers.length) {
    const block = el('section', { class: 'filter-block' }, [
      el('h3', { text: 'Numeric ranges' }),
      el('p', { class: 'hint', text: 'Bounds are inclusive. Either side can be left blank.' }),
    ]);
    const grid = el('div', { class: 'num-grid' });
    for (const column of numbers) {
      const from = el('input', { class: 'control', type: 'number', step: 'any', placeholder: 'from', 'data-filter': '1', 'data-kind': 'number', 'data-bound': 'from' });
      const to = el('input', { class: 'control', type: 'number', step: 'any', placeholder: 'to', 'data-filter': '1', 'data-kind': 'number', 'data-bound': 'to' });
      from.dataset.col = column.name;
      to.dataset.col = column.name;
      from.addEventListener('input', scheduleLoad);
      to.addEventListener('input', scheduleLoad);
      const hint = [`min ${shortStat(column.min)}`, `max ${shortStat(column.max)}`];
      if (column.q50 != null) hint.push(`median ${shortStat(column.q50)}`);
      grid.append(el('div', {}, [
        el('span', { class: 'field-label', text: label(column.name) }),
        el('div', { class: 'pair' }, [from, to]),
        el('div', { class: 'quantile', text: hint.join(' · ') }),
      ]));
    }
    block.append(grid);
    filters.append(block);
  }

  const pageSize = el('select', { class: 'control fit', id: 'page-size' }, [50, 100, 250, 500].map((size) => {
    const option = el('option', { value: String(size), text: `${size} rows` });
    if (size === state.limit) option.selected = true;
    return option;
  }));
  pageSize.addEventListener('change', () => {
    state.limit = Number(pageSize.value);
    state.page = 0;
    loadRows();
  });

  const csv = el('button', { class: 'btn ghost', type: 'button', text: 'Download CSV', title: 'Up to 20,000 rows of the current filter' });
  csv.addEventListener('click', exportCsv);

  view.replaceChildren(
    title,
    el('div', { class: 'toolbar' }, [
      el('button', { class: 'btn ghost', type: 'button', id: 'prev', text: 'Back' }),
      el('span', { id: 'page-label', class: 'muted', text: '…' }),
      el('button', { class: 'btn ghost', type: 'button', id: 'next', text: 'Next' }),
      pageSize,
      csv,
      el('button', { class: 'btn ghost', type: 'button', id: 'reset', text: 'Reset filters' }),
    ]),
    filters,
    el('div', { id: 'status', class: 'status-row muted', text: 'Loading…' }),
    el('div', { class: 'grid-wrap' }, [el('table', { id: 'grid' })]),
    el('details', { class: 'sql' }, [
      el('summary', { text: 'SQL for this query' }),
      el('pre', { id: 'sql' }),
    ]),
    specPanel(table),
    el('details', { class: 'profile' }, [
      el('summary', { text: 'Column profile' }),
      profileTable(table),
    ]),
  );

  view.querySelector('#prev').addEventListener('click', () => {
    if (state.page === 0) return;
    state.page -= 1;
    loadRows();
  });
  view.querySelector('#next').addEventListener('click', () => {
    if ((state.page + 1) * state.limit >= state.total) return;
    state.page += 1;
    loadRows();
  });
  view.querySelector('#reset').addEventListener('click', () => {
    for (const input of filters.querySelectorAll('input, select')) {
      if (input.type === 'checkbox') input.checked = false;
      else if (input.dataset.role === 'mode') input.value = 'contains';
      else input.value = '';
    }
    scheduleLoad();
  });
}

function roleOptions(column) {
  const options = [
    ['return', 'return'],
    ['group', 'group by'],
    ['count', 'count'],
  ];
  if (column.kind === 'number' || column.kind === 'time') {
    options.push(['min', 'min'], ['max', 'max']);
  }
  if (column.kind === 'number') options.push(['sum', 'sum'], ['avg', 'avg']);
  return options;
}

function specPanel(table) {
  const list = el('div', { class: 'spec-list' });
  for (const column of table.columns) {
    const box = el('input', { type: 'checkbox', 'data-spec-col': '1' });
    box.dataset.col = column.name;
    const role = el('select', { class: 'control', 'data-spec-role': '1' });
    role.dataset.col = column.name;
    for (const [value, text] of roleOptions(column)) role.append(el('option', { value, text }));
    list.append(el('div', { class: 'spec-row' }, [
      box,
      el('span', { class: 'name', text: `${label(column.name)} · ${column.type}` }),
      role,
    ]));
  }
  const calculation = el('textarea', {
    class: 'control',
    id: 'calculation',
    placeholder: 'How should the API calculate the result? Example: daily average of Total Vb per MSN, valves Open only.',
  });
  const output = el('pre', { class: 'spec-out', id: 'spec-out', text: 'The spec appears here.' });
  const copy = el('button', { class: 'btn', type: 'button', text: 'Copy spec' });
  copy.addEventListener('click', async () => {
    const text = buildSpec(table);
    output.textContent = text;
    if (!text.startsWith('{')) return;
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy spec'; }, 1200);
    } catch {
      copy.textContent = 'Select the text below';
    }
  });
  const all = el('button', { class: 'btn ghost', type: 'button', text: 'All columns' });
  all.addEventListener('click', () => {
    for (const box of list.querySelectorAll('[data-spec-col]')) box.checked = true;
  });
  const none = el('button', { class: 'btn ghost', type: 'button', text: 'Clear' });
  none.addEventListener('click', () => {
    for (const box of list.querySelectorAll('[data-spec-col]')) box.checked = false;
  });

  return el('details', { class: 'filter-block', id: 'spec' }, [
    el('summary', { text: 'API spec' }),
    el('p', {
      class: 'hint',
      text: 'Check the columns the API should use. Mark each as return, group by, or an aggregate. Current filters are included. Describe the calculation, then copy the block and send it back.',
    }),
    el('div', { class: 'presets' }, [all, none]),
    list,
    el('span', { class: 'field-label', text: 'Calculation method' }),
    calculation,
    el('div', { class: 'presets' }, [copy]),
    output,
  ]);
}

function buildSpec(table) {
  const columns = [];
  for (const box of document.querySelectorAll('#spec [data-spec-col]')) {
    if (!box.checked) continue;
    const meta = table.columns.find((column) => column.name === box.dataset.col);
    const role = document.querySelector(`#spec [data-spec-role][data-col="${CSS.escape(box.dataset.col)}"]`)?.value || 'return';
    const aggregate = ['count', 'sum', 'avg', 'min', 'max'].includes(role) ? role : null;
    columns.push({
      name: meta.name,
      type: meta.type,
      kind: meta.kind,
      role: aggregate ? 'aggregate' : role,
      aggregate,
      min: meta.min,
      max: meta.max,
      null_pct: meta.nullPct,
    });
  }
  const output = document.getElementById('spec-out');
  if (!columns.length) {
    if (output) output.textContent = 'Select at least one column.';
    return 'Select at least one column.';
  }
  const spec = {
    spec: 'duckdb-api-spec',
    version: 1,
    database: state.meta.file,
    table: table.name,
    shape: columns.some((column) => column.role !== 'return') ? 'aggregate' : 'rows',
    filter_row_count: state.total,
    filters: collectFilters(),
    columns,
    calculation: document.getElementById('calculation')?.value.trim() || '',
    sample_rows: state.rows.slice(0, 3).map((row) => {
      const sample = {};
      for (const column of columns) sample[column.name] = row[column.name] ?? null;
      return sample;
    }),
  };
  return JSON.stringify(spec, null, 2);
}

function profileTable(table) {
  const head = el('tr', {}, ['Column', 'Type', 'Min', 'Max', 'Median', 'Distinct', 'Null %'].map((text) => el('th', { text })));
  const body = el('tbody', {}, table.columns.map((column) => el('tr', {}, [
    el('td', { text: label(column.name) }),
    el('td', { text: column.type }),
    el('td', { text: display(column.min) }),
    el('td', { text: display(column.max) }),
    el('td', { text: display(column.q50) }),
    el('td', { text: display(column.approxUnique) }),
    el('td', { text: display(column.nullPct) }),
  ])));
  return el('div', { class: 'grid-wrap' }, [el('table', {}, [el('thead', {}, [head]), body])]);
}

let timer = 0;
function scheduleLoad() {
  state.page = 0;
  clearTimeout(timer);
  timer = setTimeout(loadRows, 220);
}

function collectFilters() {
  const root = document.getElementById('filters');
  if (!root) return [];
  const grouped = new Map();
  for (const node of root.querySelectorAll('[data-filter]')) {
    const key = node.dataset.col;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(node);
  }
  const filters = [];
  for (const [column, nodes] of grouped) {
    const kind = nodes[0].dataset.kind;
    if (kind === 'time' || kind === 'number') {
      const from = nodes.find((node) => node.dataset.bound === 'from')?.value.trim() || '';
      const to = nodes.find((node) => node.dataset.bound === 'to')?.value.trim() || '';
      if (from || to) filters.push({ column, op: 'between', from, to });
    } else if (kind === 'text') {
      const value = nodes.find((node) => node.dataset.role === 'value')?.value.trim() || '';
      const op = nodes.find((node) => node.dataset.role === 'mode')?.value || 'contains';
      if (value) filters.push({ column, op, value });
    } else if (kind === 'cat') {
      const checked = nodes.filter((node) => node.checked);
      if (!checked.length || checked.length === nodes.length) continue;
      filters.push({
        column,
        op: 'in',
        values: checked.filter((node) => node.dataset.null !== '1').map((node) => node.dataset.value),
        includeNull: checked.some((node) => node.dataset.null === '1'),
      });
    }
  }
  return filters;
}

function payload(extra = {}) {
  return {
    database: state.meta.file,
    table: state.table,
    filters: collectFilters(),
    sort: state.sort,
    limit: state.limit,
    offset: state.page * state.limit,
    ...extra,
  };
}

async function loadRows() {
  const token = ++state.token;
  const status = document.getElementById('status');
  if (status) status.textContent = 'Loading…';
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload()),
  });
  const data = await response.json();
  if (token !== state.token) return;
  if (!response.ok) {
    if (status) {
      status.className = 'status-row error';
      status.textContent = data.error || 'Query failed';
    }
    return;
  }
  state.rows = data.rows;
  state.total = data.total;
  state.ms = data.ms;
  state.sql = data.sql;
  renderGrid();
}

function renderGrid() {
  const table = tableMeta(state.table);
  const grid = document.getElementById('grid');
  const status = document.getElementById('status');
  const sql = document.getElementById('sql');
  const labelNode = document.getElementById('page-label');
  if (!grid) return;

  const from = state.total === 0 ? 0 : state.page * state.limit + 1;
  const to = Math.min(state.total, (state.page + 1) * state.limit);
  if (labelNode) labelNode.textContent = `${formatCount(from)}–${formatCount(to)} of ${formatCount(state.total)}`;
  if (status) {
    status.className = 'status-row muted';
    status.textContent = `${formatCount(state.total)} rows match · ${state.ms} ms · click a row for every field`;
  }
  if (sql) sql.textContent = state.sql;
  document.getElementById('prev').disabled = state.page === 0;
  document.getElementById('next').disabled = (state.page + 1) * state.limit >= state.total;

  const head = el('tr', {}, table.columns.map((column) => {
    const sorted = state.sort?.column === column.name;
    const mark = sorted ? (state.sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
    const button = el('button', { type: 'button', class: sorted ? 'sorted' : '', text: `${label(column.name)}${mark}` });
    button.addEventListener('click', () => {
      if (state.sort?.column === column.name) {
        state.sort = { column: column.name, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' };
      } else {
        state.sort = { column: column.name, dir: column.kind === 'time' || column.kind === 'number' ? 'desc' : 'asc' };
      }
      state.page = 0;
      loadRows();
    });
    return el('th', {}, [button]);
  }));
  const body = el('tbody', {}, state.rows.map((row, index) => {
    const tr = el('tr', { 'data-i': String(index) }, table.columns.map((column) => {
      const cell = el('td', { text: display(row[column.name]) });
      if (String(column.name).includes('Address') || String(column.name).includes('description')) cell.className = 'clip';
      return cell;
    }));
    tr.addEventListener('click', () => openDrawer(row, table.columns));
    return tr;
  }));
  if (!state.rows.length) {
    body.append(el('tr', {}, [el('td', { text: 'No rows', colspan: String(table.columns.length) })]));
  }
  grid.replaceChildren(el('thead', {}, [head]), body);
}

async function exportCsv() {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload({ offset: 0, limit: 20000 })),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const status = document.getElementById('status');
    if (status) {
      status.className = 'status-row error';
      status.textContent = data.error || 'Could not export CSV';
    }
    return;
  }
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${state.table}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function openDrawer(row, columns) {
  const fields = columns
    ? columns.map((column) => ({ name: column.name, value: row[column.name] }))
    : Object.keys(row).map((name) => ({ name, value: row[name] }));
  const kv = el('div', { class: 'kv' });
  const actions = el('div', { class: 'drawer-actions' });
  for (const field of fields) {
    kv.append(el('div', {}, [
      el('div', { class: 'k', text: label(field.name) }),
      el('div', { class: 'v', text: display(field.value) }),
    ]));
    if (state.meta.deviceLookup && idKind(field.name) && field.value) {
      const button = el('button', { class: 'btn ghost', type: 'button', text: `Find meter by ${label(field.name)}` });
      button.addEventListener('click', () => {
        location.hash = dbHash(state.meta.file, `/d/${encodeURIComponent(String(field.value))}`);
      });
      actions.append(button);
    }
  }
  const copy = el('button', { class: 'btn ghost', type: 'button', text: 'Copy JSON' });
  copy.addEventListener('click', () => navigator.clipboard.writeText(JSON.stringify(row, null, 2)));
  drawer.replaceChildren(
    el('div', { class: 'drawer-head' }, [
      el('h2', { text: 'Row' }),
      el('button', { class: 'btn ghost', type: 'button', text: 'Close' }),
    ]),
    actions,
    kv,
    el('div', { class: 'drawer-actions' }, [copy]),
  );
  drawer.querySelector('.drawer-head button').addEventListener('click', closeDrawer);
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function idKind(name) {
  return /msn|retrofit|device_id|accountid|iccid/i.test(name);
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});

async function openDevice(query, extra = {}) {
  const viewToken = ++state.viewToken;
  state.deviceQ = query;
  if (!document.querySelector('.device-layout')) {
    view.replaceChildren(el('p', { class: 'muted', text: 'Looking up the meter…' }));
  }
  const params = new URLSearchParams({ database: state.meta.file, q: query });
  if (extra.msn) params.set('msn', extra.msn);
  if (extra.retrofit) params.set('retrofit', extra.retrofit);
  const response = await fetch(`/api/device?${params}`);
  const data = await response.json();
  if (viewToken !== state.viewToken) return;
  if (!response.ok) {
    view.replaceChildren(el('p', { class: 'error', text: data.error || 'Lookup failed' }));
    return;
  }
  renderDevice(query, data);
}

function renderDevice(query, data) {
  const matches = el('div', { class: 'matches' }, [el('h2', { text: 'Matches' })]);
  if (!data.devices.length && !data.readings.length) {
    matches.append(el('p', { class: 'empty', text: 'Nothing in the registry or the readings matches that text.' }));
  }
  if (data.devices.length) {
    matches.append(el('div', { class: 'nav-label', text: 'Registry' }));
    for (const device of data.devices) {
      matches.append(matchButton(
        device['New Msn'],
        `${device['Retrofit id'] || '—'} · ${device.Region || '—'}`,
        data.selected?.msn === device['New Msn'],
        () => openDevice(query, { msn: device['New Msn'] || '', retrofit: device['Retrofit id'] || '' }),
      ));
    }
  }
  if (data.readings.length) {
    matches.append(el('div', { class: 'nav-label', text: 'Readings' }));
    for (const reading of data.readings) {
      matches.append(matchButton(
        reading.msn || '—',
        `${reading.retrofit || '—'} · ${formatCount(reading.n)} · ${reading.last_rtc || ''}`,
        data.selected?.msn === reading.msn && data.selected?.retrofit === reading.retrofit,
        () => openDevice(query, { msn: reading.msn || '', retrofit: reading.retrofit || '' }),
      ));
    }
  }

  const main = el('div', {});
  const selected = data.selected;
  if (!selected) {
    main.append(el('p', { class: 'empty', text: 'Pick a match on the left.' }));
  } else {
    main.append(el('h2', { text: selected.msn || selected.retrofit || 'Meter' }));
    main.append(el('p', { class: 'muted', text: selected.retrofit || '' }));
    const stats = selected.stats;
    main.append(el('div', { class: 'stats' }, [
      stat('Link', formatCount(stats.comms?.n), `${stats.comms?.first || '—'} → ${stats.comms?.last || '—'}`),
      stat('Volume Vb', `${display(stats.comms?.min_vb)} → ${display(stats.comms?.max_vb)}`, 'min and max, m³'),
      stat('Daily', formatCount(stats.daily?.n), `${stats.daily?.first || '—'} → ${stats.daily?.last || '—'}`),
      stat('GSM', formatCount(stats.gsm?.n), `RSRP ${display(stats.gsm?.min_rsrp)}…${display(stats.gsm?.max_rsrp)}, avg ${display(stats.gsm?.avg_rsrp)}`),
      stat('SNR avg', display(stats.gsm?.avg_snr), 'across all GSM rows'),
      stat('Roster', formatCount(stats.roster), 'days on cells'),
    ]));
    if (selected.device) {
      const card = el('section', { class: 'device-card' }, [el('h3', { text: 'Registry card' })]);
      const kv = el('div', { class: 'kv' });
      for (const [key, value] of Object.entries(selected.device)) {
        kv.append(el('div', {}, [
          el('div', { class: 'k', text: label(key) }),
          el('div', { class: 'v', text: display(value) }),
        ]));
      }
      card.append(kv);
      main.append(card);
    } else {
      main.append(el('p', { class: 'empty', text: 'This MSN / retrofit pair is not in devices. Telemetry is below.' }));
    }
    main.append(series('Latest comms', selected.comms));
    main.append(series('Latest daily', selected.daily));
    main.append(series('Latest GSM', selected.gsm));
    main.append(series('Roster', selected.roster));
  }

  view.replaceChildren(el('div', { class: 'device-layout' }, [matches, main]));
}

function matchButton(title, subtitle, active, onClick) {
  const button = el('button', { class: active ? 'match active' : 'match', type: 'button' }, [
    el('b', { text: title || '—' }),
    el('span', { text: subtitle }),
  ]);
  button.addEventListener('click', onClick);
  return button;
}

function stat(name, value, note) {
  return el('div', { class: 'stat' }, [
    el('span', { text: name }),
    el('b', { text: value }),
    el('span', { text: note }),
  ]);
}

function series(title, rows) {
  const section = el('section', { class: 'series' }, [el('h3', { text: `${title} · ${formatCount(rows.length)}` })]);
  if (!rows.length) {
    section.append(el('p', { class: 'empty', text: 'No rows' }));
    return section;
  }
  const columns = Object.keys(rows[0]).map((name) => ({ name }));
  const head = el('tr', {}, columns.map((column) => el('th', { text: label(column.name) })));
  const body = el('tbody', {}, rows.map((row) => {
    const tr = el('tr', {}, columns.map((column) => el('td', { text: display(row[column.name]) })));
    tr.addEventListener('click', () => openDrawer(row, columns));
    return tr;
  }));
  section.append(el('div', { class: 'grid-wrap' }, [el('table', {}, [el('thead', {}, [head]), body])]));
  return section;
}

boot().catch((error) => {
  view.textContent = error.message;
});
