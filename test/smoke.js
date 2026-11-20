// Minimal DOM/HA mocks to smoke-test the card rendering in Node (test only).
'use strict';
class FakeEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.style = { setProperty() {}, };
    this.classList = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
    this._attrs = {};
    this._listeners = {};
    this.innerHTML = '';
    this.textContent = '';
    this.hidden = false;
    this.clientWidth = 800;
    this.scrollHeight = 0;
  }
  setAttribute(k, v) { this._attrs[k] = v; }
  getAttribute(k) { return this._attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent() { return true; }
  querySelector() { return null; }
  contains() { return false; }
  get firstElementChild() { return this.children[0] || null; }
  set id(v) { this._id = v; }
  get id() { return this._id; }
}
class FakeShadowRoot {
  constructor() { this._byId = new Map(); this._html = ''; }
  set innerHTML(v) {
    this._html = v;
    this._byId.clear();
    (v.match(/id="([^"]+)"/g) || []).forEach((m) => {
      const id = m.slice(4, -1);
      this._byId.set(id, new FakeEl());
    });
  }
  get innerHTML() { return this._html; }
  getElementById(id) { return this._byId.get(id) || null; }
}
class FakeHTMLElement {
  constructor() { this.attachShadow = () => this._sr; this._sr = new FakeShadowRoot(); this._listeners = {}; }
  get shadowRoot() { return this._sr; }
  get isConnected() { return true; }
  connectedCallback() {}
  disconnectedCallback() {}
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent() { return true; }
  setAttribute() {}
}
const defined = {};
global.customElements = {
  define(name, cls) { defined[name] = cls; },
  get(name) { return defined[name]; },
  whenDefined(name) { return new Promise((res) => setTimeout(res, 100)); }
};
global.HTMLElement = FakeHTMLElement;
global.CustomEvent = class CustomEvent { constructor(t, o) { this.type = t; Object.assign(this, o); } };
global.ResizeObserver = class { observe() {} disconnect() {} };
global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.window = globalThis;
global.document = {
  createElement: (t) => new FakeEl(t),
  querySelector: () => null,
  head: new FakeEl('head')
};
// ha-icon / ha-card / ha-form / ha-expansion-panel are referenced from the editor; define dummies
['ha-icon', 'ha-card', 'ha-form', 'ha-expansion-panel', 'ha-expansion-panel'].forEach((t) => {
  if (!defined[t]) defined[t] = class extends FakeHTMLElement {};
});

// ---- the card under test ----
require('../dist/glass-calendar-card.js');

const Card = defined['glass-calendar-card'];
const card = new Card();

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ds = (n) => ({ date: ymd(day(n)) });
const dts = (n, h, m) => { const d = day(n); d.setHours(h, m || 0, 0, 0); return { dateTime: d.toISOString() }; };
const events = [
  { summary: 'Yellow bag', start: ds(0), end: ds(1) },
  { summary: 'Dentist', start: dts(0, 9, 30), end: dts(0, 11, 30), location: '12 Main St' },
  { summary: 'Paper & cardboard', start: ds(1), end: ds(2) },
  { summary: 'Soccer practice', start: dts(1, 19, 0), end: dts(1, 21, 0), location: 'Stadium' },
  { summary: 'Team meeting', start: dts(2, 8, 30), end: dts(2, 10, 0), location: 'Room A' },
  { summary: 'Glass', start: ds(3), end: ds(4) },
  { summary: "Anna's birthday", start: ds(4), end: ds(5) },
  { summary: 'General waste', start: ds(6), end: ds(7) },
  { summary: 'Hidden', start: dts(1, 12, 0), end: dts(1, 13, 0), hidden: true }
];

const hass = {
  language: 'en', locale: { language: 'en', time_format: 'language' },
  themes: { darkMode: true },
  config: { latitude: 1, longitude: 1, unit_system: { temperature: '°C' } },
  localize: () => '',
  states: { 'calendar.waste': { entity_id: 'calendar.waste', state: '2', attributes: { friendly_name: 'Waste' } }, 'calendar.holidays': { entity_id: 'calendar.holidays', state: '1', attributes: { friendly_name: 'Holidays' } } },
  callApi: (method, path) => {
    const which = String(path).split('/')[1].split('?')[0];
    console.log('  callApi:', method, path);
    return Promise.resolve(which === 'calendar.holidays' ? [
      { summary: 'National holiday', start: ds(3), end: ds(4) },
      { summary: 'Winter break starts', start: ds(6), end: ds(7) }
    ] : events);
  }
};

card.setConfig({
  type: 'custom:glass-calendar-card',
  entities: ['calendar.waste', 'calendar.holidays'],
  days: 7, max_events: 8, show_location: true,
  calendar_types: [
    { pattern: 'Yellow', label: 'Yellow bag', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] },
    { pattern: 'Paper|Cardboard', label: 'Paper', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] }
  ]
});
card.hass = hass;

setTimeout(() => {
  const list = card.shadowRoot.getElementById('list');
  const legend = card.shadowRoot.getElementById('legend');
  const out = list.innerHTML;
  const checks = {
    'renders dentist': out.includes('Dentist'),
    'renders dentist time': /time">[\d:]+/.test(out),
    'renders dentist location': out.includes('12 Main St'),
    'applies type label+color': out.includes('Yellow bag') && out.includes('--c:255,198,64'),
    'applies default icon for untyped': out.includes('Team meeting') && out.includes('mdi:calendar-star'),
    'all-day rows have .all': out.includes('evrow all'),
    'hides hidden event': !out.includes('Hidden'),
    'today section marked': out.includes('day today'),
    'tomorrow section labeled': out.includes('Tomorrow') || out.includes('Morgen'),
    'applies calendar palette color to untyped cal2 event': out.includes('--c:96,165,250'),
    'holidays row has a calendar dot': out.includes('cdot'),
    'legend lists both calendars': legend.innerHTML.includes('Waste') && legend.innerHTML.includes('Holidays'),
    'header title multi': card.shadowRoot.getElementById('ht').textContent === 'Calendars',
    'event count 10': card.shadowRoot.getElementById('count').textContent === '10 events'
  };
  let fail = 0;
  for (const k in checks) { console.log((checks[k] ? 'PASS' : 'FAIL') + '  ' + k); if (!checks[k]) fail++; }
  console.log('\n--- sample html (first 600 chars) ---\n' + out.slice(0, 600));
  process.exit(fail ? 1 : 0);
}, 300);
