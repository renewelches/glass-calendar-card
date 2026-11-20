/*!
 * Glass Calendar Card for Home Assistant
 * A weekly calendar agenda in the same liquid glass style as the
 * Glass Clock Weather Card, with color-coded calendars and event types.
 *
 * Released under the MIT License.
 */
(function () {
  'use strict';

  var CARD = 'glass-calendar-card';
  var EDITOR = CARD + '-editor';
  var VERSION = '1.1.2';
  var REPO = 'https://github.com/renewelches/glass-calendar-card';
  if (customElements.get(CARD)) return;

  /* ================================================================ helpers */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function st(hass, id) { return hass && hass.states && id ? hass.states[id] : undefined; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function fire(node, type, detail) {
    node.dispatchEvent(new CustomEvent(type, { detail: detail, bubbles: true, composed: true }));
  }
  function langOf(hass) {
    return String((hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || 'en');
  }
  function baseLang(l) { return String(l || 'en').toLowerCase().split(/[-_]/)[0]; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // colors can be [r,g,b], "#rrggbb", "#rgb", "r,g,b" or "rgb(r,g,b)"; returns "r,g,b"
  function rgb(v, fb) {
    if (Array.isArray(v) && v.length >= 3) {
      return v.slice(0, 3).map(function (x) { return clamp(Math.round(+x || 0), 0, 255); }).join(',');
    }
    if (typeof v === 'string') {
      var s = v.trim(), m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
      if (m) {
        var h = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1];
        return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',');
      }
      m = /^(?:rgba?\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(s);
      if (m) return [m[1], m[2], m[3]].map(function (x) { return clamp(+x, 0, 255); }).join(',');
    }
    return fb;
  }
  function rgbArr(s) { return String(s).split(',').map(Number); }
  function mix(a, b, t) {
    var x = rgbArr(a), y = rgbArr(b);
    return [0, 1, 2].map(function (i) { return Math.round(x[i] * t + y[i] * (1 - t)); }).join(',');
  }

  /* ================================================================ translations */

  var T = {
    en: {
      today: 'Today', tomorrow: 'Tomorrow', loading: 'Loading…', noentity: 'Choose a calendar entity',
      empty: 'No events in the next %d days', events: 'events', event: 'event',
      s_calendar: 'Calendar', s_calendars: 'Calendars', s_types: 'Event types', s_look: 'Appearance', s_colors: 'Colors', s_actions: 'Interactions',
      s_calendar_h: 'One or more calendar entities of Home Assistant. Their upcoming events are listed day by day.',
      entities: 'Calendar entities', name: 'Card title (optional)', name_h: 'Default: the name of the calendar.',
      days: 'Number of days', days_h: 'How many days from today are covered.',
      max_events: 'Maximum events per day', show_time: 'Show times', show_location: 'Show locations',
      show_header: 'Show header', default_icon: 'Icon for other events', default_color: 'Color for other events',
      types_h: 'Events whose title contains the text get their own label, icon and color.',
      pattern: 'Text to look for', label: 'Label', icon: 'Icon', color: 'Color',
      add_type: 'Add event type', add_examples: 'Add waste collection examples', remove: 'Remove',
      appearance: 'Style', ap_auto: 'Automatic (follows the theme)', ap_dark: 'Dark', ap_light: 'Light',
      font: 'Font', f_space: 'Space Grotesk (from Google Fonts)', f_theme: 'Theme font', f_custom: 'Custom font',
      font_family: 'Custom font family',
      text_scale: 'Text size', text_scale_h: 'Larger values make the card easier to read from a distance.',
      min_height: 'Minimum height',
      cals_h: 'Display name and color for each calendar. With multiple calendars, every event gets a small dot in its calendar’s color.',
      add_calendar: 'Add calendar',
      glass: 'Glass effect', glow: 'Glow intensity', border_radius: 'Corner radius',
      accent_color: 'Accent color', text_color: 'Text color',
      background_color: 'Background tint', background_opacity: 'Tint strength', reset_colors: 'Reset colors',
      tap_action: 'Tap action', hold_action: 'Hold action', double_tap_action: 'Double tap action'
    },
    de: {
      today: 'Heute', tomorrow: 'Morgen', loading: 'Lade…', noentity: 'Wähle eine Kalender-Einheit',
      empty: 'Keine Ereignisse in den nächsten %d Tagen', events: 'Ereignisse', event: 'Ereignis',
      s_calendar: 'Kalender', s_calendars: 'Kalender', s_types: 'Ereignistypen', s_look: 'Aussehen', s_colors: 'Farben', s_actions: 'Bedienung',
      s_calendar_h: 'Eine oder mehrere Kalender-Einheiten von Home Assistant. Ihre bevorstehenden Ereignisse werden Tag für Tag aufgelistet.',
      entities: 'Kalender-Einheiten', name: 'Karten-Titel (optional)', name_h: 'Standard: der Name des Kalenders.',
      days: 'Anzahl Tage', days_h: 'Wie viele Tage ab heute abgedeckt werden.',
      max_events: 'Max. Ereignisse pro Tag', show_time: 'Uhrzeiten anzeigen', show_location: 'Orte anzeigen',
      show_header: 'Kopfzeile anzeigen', default_icon: 'Symbol für andere Ereignisse', default_color: 'Farbe für andere Ereignisse',
      types_h: 'Ereignisse, deren Titel den Text enthält, bekommen eigenes Label, Symbol und Farbe.',
      pattern: 'Text zum Suchen', label: 'Anzeigename', icon: 'Symbol', color: 'Farbe',
      add_type: 'Ereignistyp hinzufügen', add_examples: 'Müllabfuhr-Beispiele hinzufügen', remove: 'Entfernen',
      appearance: 'Stil', ap_auto: 'Automatisch (folgt dem Thema)', ap_dark: 'Dunkel', ap_light: 'Hell',
      font: 'Schriftart', f_space: 'Space Grotesk (von Google Fonts)', f_theme: 'Thema-Schriftart', f_custom: 'Eigene Schriftart',
      font_family: 'Eigene Schriftfamilie',
      text_scale: 'Textgröße', text_scale_h: 'Größere Werte machen die Karte auch aus der Entfernung lesbar.',
      min_height: 'Minimale Höhe',
      cals_h: 'Anzeigename und Farbe für jeden Kalender. Bei mehreren Kalendern erhält jedes Ereignis einen Punkt in der Farbe seines Kalenders.',
      add_calendar: 'Kalender hinzufügen',
      glass: 'Glas-Effekt', glow: 'Leuchtstärke', border_radius: 'Eckenradius',
      accent_color: 'Akzentfarbe', text_color: 'Textfarbe',
      background_color: 'Hintergrundtönung', background_opacity: 'Tönungsstärke', reset_colors: 'Farben zurücksetzen',
      tap_action: 'Tippen-Aktion', hold_action: 'Halten-Aktion', double_tap_action: 'Doppeltippen-Aktion'
    },
    it: {
      today: 'Oggi', tomorrow: 'Domani', loading: 'Carico…', noentity: 'Scegli un’entità calendario',
      empty: 'Nessun evento nei prossimi %d giorni', events: 'eventi', event: 'evento',
      s_calendar: 'Calendario', s_calendars: 'Calendari', s_types: 'Tipi di evento', s_look: 'Aspetto', s_colors: 'Colori', s_actions: 'Interazioni',
      s_calendar_h: 'Una o più entità calendario di Home Assistant. I loro eventi in arrivo sono elencati giorno per giorno.',
      entities: 'Entità calendario', name: 'Titolo della card (facoltativo)', name_h: 'Predefinito: il nome del calendario.',
      days: 'Numero di giorni', days_h: 'Quanti giorni a partire da oggi sono coperti.',
      max_events: 'Numero massimo di eventi per giorno', show_time: 'Mostra gli orari', show_location: 'Mostra i luoghi',
      show_header: 'Mostra l’intestazione', default_icon: 'Icona per gli altri eventi', default_color: 'Colore per gli altri eventi',
      types_h: 'Gli eventi il cui titolo contiene il testo indicato prendono nome, icona e colore propri.',
      pattern: 'Testo da cercare', label: 'Nome mostrato', icon: 'Icona', color: 'Colore',
      add_type: 'Aggiungi un tipo di evento', add_examples: 'Aggiungi gli esempi della raccolta differenziata', remove: 'Rimuovi',
      appearance: 'Stile', ap_auto: 'Automatico (segue il tema)', ap_dark: 'Scuro', ap_light: 'Chiaro',
      font: 'Carattere', f_space: 'Space Grotesk (da Google Fonts)', f_theme: 'Carattere del tema', f_custom: 'Carattere personalizzato',
      font_family: 'Nome del carattere',
      text_scale: 'Grandezza dei testi', text_scale_h: 'Valori più alti rendono la card leggibile anche da lontano.',
      min_height: 'Altezza minima',
      cals_h: 'Nome e colore per ogni calendario. Con più calendari, ogni evento porta un punto nel colore del suo calendario.',
      add_calendar: 'Aggiungi calendario',
      glass: 'Effetto vetro', glow: 'Intensità del bagliore', border_radius: 'Raggio degli angoli',
      accent_color: 'Colore principale', text_color: 'Colore dei testi',
      background_color: 'Tinta dello sfondo', background_opacity: 'Intensità della tinta', reset_colors: 'Ripristina i colori',
      tap_action: 'Azione al tocco', hold_action: 'Azione tenendo premuto', double_tap_action: 'Azione al doppio tocco'
    }
  };

  var tr = function (l, k) {
    l = baseLang(l);
    return (T[l] && T[l][k] != null ? T[l][k] : T.en[k] != null ? T.en[k] : k);
  };

  /* ================================================================ calendar data */

  // events of the next N days, cached 15 minutes per calendar and day
  var CAL = {};
  function calFetch(hass, id, days) {
    var key = id + ':' + days + ':' + dayKey(new Date());
    var c = CAL[key];
    if (c && c.ev && Date.now() - c.t < 15 * 60 * 1000) return Promise.resolve(c.ev);
    if (c && c.p) return c.p;
    if (!hass || !hass.callApi) return Promise.resolve([]);
    var s = new Date(); s.setHours(0, 0, 0, 0);
    var e = new Date(s.getTime() + days * 86400000);
    var p = hass.callApi('GET', 'calendars/' + id + '?start=' + encodeURIComponent(s.toISOString()) + '&end=' + encodeURIComponent(e.toISOString()))
      .then(function (ev) { CAL[key] = { t: Date.now(), ev: ev || [] }; return ev || []; })
      .catch(function () { CAL[key] = { t: Date.now(), ev: [] }; return []; });
    CAL[key] = { t: c ? c.t : 0, ev: c ? c.ev : null, p: p };
    return p;
  }
  function evDate(x) {
    if (!x) return null;
    var d = typeof x === 'string' ? new Date(/^\d{4}-\d\d-\d\d$/.test(x) ? x + 'T00:00:00' : x)
      : x.date ? new Date(x.date + 'T00:00:00') : new Date(x.dateTime || x);
    return isNaN(d) ? null : d;
  }

  // auto-assigned color for a calendar that has none of its own
  var CAL_PALETTE = [[95, 243, 255], [96, 165, 250], [255, 198, 64], [92, 210, 120], [230, 120, 220], [167, 139, 250], [255, 140, 105], [120, 220, 200]];
  function normId(x) {
    x = String(x || '').trim();
    if (!x) return null;
    return x.indexOf('calendar.') === 0 ? x : 'calendar.' + x;
  }
  // resolve entity / entities / calendars into a flat list of {id, name, color}
  function resolveCals(c) {
    var ids = [];
    [c.entity].concat(Array.isArray(c.entities) ? c.entities : []).forEach(function (x) {
      var id = normId(x);
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    var cfgs = Array.isArray(c.calendars) ? c.calendars : [];
    return ids.map(function (id, i) {
      var m = null;
      cfgs.forEach(function (m2) { if (m2 && normId(m2.entity) === id) m = m2; });
      var color = m && m.color ? rgb(m.color, null) : null;
      return {
        id: id,
        name: (m && m.name) || '',
        color: color || CAL_PALETTE[i % CAL_PALETTE.length].join(',')
      };
    });
  }

  // group the fetched events by day, capped per day; events carry their calendar index (ev._cal)
  function calItems(events, c, l, cals) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var days = clamp(parseInt(c.days, 10) || 7, 1, 14);
    var types = Array.isArray(c.calendar_types) ? c.calendar_types : [];
    var max = clamp(parseInt(c.max_events, 10) || 8, 1, 50);
    var byDay = [], flat = [];
    (events || []).forEach(function (ev) {
      if (ev.hidden) return;
      var s = evDate(ev.start);
      if (!s) return;
      var idx = Math.floor((s - t0) / 86400000);
      if (idx < 0 || idx >= days) return;
      var sum = String(ev.summary || ''), low = sum.toLowerCase(), hit = null;
      types.forEach(function (t) {
        if (hit || !t) return;
        String(t.pattern || t.label || '').split('|').forEach(function (p) {
          p = p.trim().toLowerCase();
          if (!hit && p && low.indexOf(p) >= 0) hit = t;
        });
      });
      var e = evDate(ev.end) || new Date(s.getTime() + 86400000);
      var allDay = !(ev.start && (ev.start.dateTime || (typeof ev.start === 'string' && ev.start.length > 10))) || (idx > 0 && e.getTime() - s.getTime() >= 86400000);
      var time = (!allDay && c.show_time !== false)
        ? s.toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit', hourCycle: 'h24' })
        : '';
      var cal = (cals || [])[ev._cal] || { color: null };
      var fallback = rgb(c.default_color, '170,182,200');
      var item = {
        day: idx, time: time, label: (hit && hit.label) || sum,
        location: c.show_location ? (ev.location || '') : '',
        icon: (hit && hit.icon) || c.default_icon || 'mdi:calendar-star',
        color: hit ? rgb(hit.color, fallback) : rgb(cal.color, fallback),
        cal: ev._cal | 0, ccolor: cal.color,
        sort: s.getTime()
      };
      if (!byDay[idx]) byDay[idx] = [];
      if (byDay[idx].length < max) { byDay[idx].push(item); flat.push(item); }
    });
    byDay.forEach(function (list) { list.sort(function (a, b) { return a.sort - b.sort; }); });
    return { days: byDay, total: flat.length };
  }

  /* ================================================================ styles */

  var DEF = {
    entity: null, entities: [], calendars: [], name: '', show_header: true, days: 7, max_events: 8, show_time: true, show_location: false,
    default_icon: 'mdi:calendar-star', default_color: null, calendar_types: [],
    appearance: 'auto', font: 'space_grotesk', font_family: '', text_scale: 1, min_height: 320,
    accent_color: null, text_color: null,
    glass: true, glow: 0.5, border_radius: 32, background_color: null, background_opacity: 0.18,
    tap_action: null, hold_action: null, double_tap_action: null
  };
  var PALETTE = {
    dark: { accent_color: [95, 243, 255], text_color: [238, 244, 255] },
    light: { accent_color: [0, 150, 190], text_color: [28, 36, 51] }
  };
  var COLOR_KEYS = ['accent_color', 'text_color'];
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
  function loadFont() {
    if (document.querySelector('link[data-gcal-font]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONT_URL; l.setAttribute('data-gcal-font', '');
    document.head.appendChild(l);
  }

  var CSS =
    ':host{display:block;height:100%}' +
    '*{box-sizing:border-box}' +
    'ha-card.gc{position:relative;height:100%;min-height:var(--gcal-minh);display:flex;flex-direction:column;overflow:hidden;isolation:isolate;' +
    '  padding:calc(20px * var(--s)) calc(24px * var(--s)) calc(16px * var(--s));border-radius:var(--gcal-radius);color:rgb(var(--gcal-text));' +
    '  font-family:var(--gcal-font);-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:transform .15s;outline:none}' +
    'ha-card.gc.act{cursor:pointer}' +
    'ha-card.gc.pressed{transform:scale(.995)}' +
    'ha-card.gc.glass{background:linear-gradient(155deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,.05) 34%,rgba(255,255,255,.02) 60%,rgba(255,255,255,.085) 100%);' +
    '  -webkit-backdrop-filter:blur(34px) saturate(185%);backdrop-filter:blur(34px) saturate(185%);border:1px solid rgba(255,255,255,.15);' +
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 1px 0 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.05),0 28px 80px rgba(0,0,0,.5)}' +
    'ha-card.gc.glass::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;z-index:-1;' +
    '  background:radial-gradient(130% 75% at 0% -15%,rgba(255,255,255,.20),transparent 42%),radial-gradient(90% 60% at 105% 115%,rgba(110,190,255,.13),transparent 55%)}' +
    'ha-card.gc.light.glass{background:linear-gradient(155deg,rgba(255,255,255,.78),rgba(255,255,255,.5) 60%,rgba(255,255,255,.66));border:1px solid rgba(255,255,255,.7);' +
    '  box-shadow:inset 0 1px 0 #fff,0 18px 50px rgba(20,30,60,.14)}' +
    'ha-card.gc.light.glass::before{background:radial-gradient(120% 70% at 0% -15%,rgba(255,255,255,.7),transparent 45%)}' +
    '.tint{position:absolute;top:0;left:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;z-index:-1;background:rgba(var(--gcal-bg),var(--gcal-bga))}' +
    /* header */
    '.hdr{display:flex;align-items:center;gap:calc(12px * var(--s));flex:none;margin-bottom:calc(14px * var(--s))}' +
    '.hdr ha-icon{--mdc-icon-size:calc(26px * var(--s));width:calc(26px * var(--s));height:calc(26px * var(--s));flex:none;color:rgb(var(--gcal-accent));' +
    '  filter:drop-shadow(0 0 8px rgba(var(--gcal-accent),var(--gcal-ga)))}' +
    '.ht{flex:1;min-width:0;font-size:calc(21px * var(--s));font-weight:500;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.hr{display:flex;align-items:center;gap:calc(10px * var(--s));flex:none}' +
    '.range{font-size:calc(14px * var(--s));opacity:.62;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.chip{--c:var(--gcal-text);display:inline-flex;align-items:center;gap:calc(8px * var(--s));min-height:calc(28px * var(--s));padding:0 calc(12px * var(--s));' +
    '  border-radius:999px;font-size:calc(13px * var(--s));white-space:nowrap;background:rgba(var(--gcal-text),.07);border:1px solid rgba(var(--gcal-text),.12);color:rgba(var(--gcal-text),.88)}' +
    '.chip.n{background:linear-gradient(160deg,rgba(var(--gcal-accent),.4),rgba(var(--gcal-accent),.14));border-color:rgba(var(--gcal-accent),.8);' +
    '  color:rgb(var(--gcal-text));box-shadow:0 0 18px rgba(var(--gcal-accent),calc(var(--gcal-ga) * .8))}' +
    /* body */
    '.list{flex:1;min-height:0;overflow:auto;scrollbar-width:none;display:flex;flex-direction:column;gap:calc(18px * var(--s))}' +
    '.list::-webkit-scrollbar{display:none}' +
    '.day{display:flex;flex-direction:column;gap:calc(8px * var(--s))}' +
    '.dlabel{display:flex;align-items:baseline;gap:calc(10px * var(--s));font-size:calc(14px * var(--s));font-weight:600;' +
    '  letter-spacing:.22em;text-transform:uppercase;opacity:.62}' +
    '.dlabel .dt{font-weight:400;letter-spacing:.08em;opacity:.8;text-transform:none;font-variant-numeric:tabular-nums}' +
    '.dlabel .dot{width:calc(6px * var(--s));height:calc(6px * var(--s));border-radius:50%;flex:none;align-self:center;' +
    '  background:rgb(var(--gcal-accent));box-shadow:0 0 8px rgba(var(--gcal-accent),var(--gcal-ga))}' +
    '.evs{display:flex;flex-direction:column;gap:calc(8px * var(--s))}' +
    /* an event row in the same pill language as the calendar chips of the clock card */
    '.evrow{--c:var(--gcal-text);display:flex;align-items:center;gap:calc(11px * var(--s));min-height:calc(46px * var(--s));' +
    '  padding:calc(9px * var(--s)) calc(18px * var(--s)) calc(9px * var(--s)) calc(14px * var(--s));border-radius:999px;' +
    '  font-size:calc(17px * var(--s));background:rgba(var(--c),.13);border:1px solid rgba(var(--c),.4);' +
    '  min-width:0;transition:background .2s,border-color .2s,box-shadow .2s}' +
    '.evrow:hover{background:rgba(var(--c),.2);border-color:rgba(var(--c),.55)}' +
    '.evrow ha-icon{--mdc-icon-size:calc(24px * var(--s));width:calc(24px * var(--s));height:calc(24px * var(--s));flex:none;display:inline-flex;' +
    '  color:rgb(var(--c));filter:drop-shadow(0 0 5px rgba(var(--c),.7))}' +
    '.evrow .time{flex:none;font-size:calc(15px * var(--s));opacity:.6;font-variant-numeric:tabular-nums}' +
    '.evrow .lab{flex:1;min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.evrow .loc{flex:none;max-width:45%;font-size:calc(14px * var(--s));opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.evrow.all .lab{opacity:.85;font-weight:400}' +
    /* a dot marks which calendar an event comes from (multiple calendars) */
    '.cdot{width:calc(9px * var(--s));height:calc(9px * var(--s));border-radius:50%;flex:none;box-shadow:0 0 6px currentcolor}' +
    '.legend{display:flex;flex-wrap:wrap;align-items:center;gap:calc(6px * var(--s)) calc(14px * var(--s));flex:none;margin:-4px 0 calc(12px * var(--s));' +
    '  font-size:calc(13px * var(--s));opacity:.72}' +
    '.legend .li{display:inline-flex;align-items:center;gap:calc(7px * var(--s));white-space:nowrap;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.legend .cdot{box-shadow:none}' +
    /* today's events glow a little stronger */
    '.day.today .evrow{background:linear-gradient(160deg,rgba(var(--c),.42),rgba(var(--c),.14));border-color:rgba(var(--c),.85);' +
    '  box-shadow:0 0 22px rgba(var(--c),calc(var(--gcal-ga) * .9)),inset 0 1px 0 rgba(255,255,255,.28)}' +
    '.day.today .dlabel .dot{transform:scale(1.3)}' +
    '.msg{text-align:center;opacity:.5;font-size:calc(15px * var(--s));padding:calc(18px * var(--s)) 0 8px}' +
    '[hidden]{display:none!important}' +
    '@media (prefers-reduced-motion:reduce){.evrow{transition:none}}';

  /* ================================================================ card */

  class GlassCalendarCard extends HTMLElement {
    static getConfigElement() { return document.createElement(EDITOR); }
    static getStubConfig() { return { entity: 'calendar.calendar' }; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._slow = this._slow.bind(this);
    }

    setConfig(config) {
      if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
      var c = Object.assign({}, DEF, config);
      c._cals = resolveCals(c);
      if (!c._cals.length) throw new Error('entity or entities: at least one calendar entity (calendar.x) is required');
      if (!c.entity) c.entity = c._cals[0].id;
      c.days = clamp(parseInt(c.days, 10) || 7, 1, 14);
      c.max_events = clamp(parseInt(c.max_events, 10) || 8, 1, 50);
      this._config = c;
      this._stopData();
      this._items = null; this._cday = null;
      if (this._hass) this._build();
    }

    set hass(h) {
      var old = this._hass;
      this._hass = h;
      if (!this._config) return;
      if (!this._built) { this._build(); return; }
      if (!old || this._changed(old)) this._update();
      if (old && old.themes !== h.themes) this._applyVars();
      if (!this._dataStarted && this.isConnected) this._startData();
    }
    get hass() { return this._hass; }

    // in a sections view the grid sets the height
    set layout(v) { this._layout = v; if (this._built) this._applyVars(); }

    connectedCallback() {
      if (this._built) { this._startTimers(); this._startData(); this._observe(); }
    }
    disconnectedCallback() {
      this._stopTimers(); this._stopData();
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
    }

    getCardSize() { return 7; }
    getGridOptions() { return { columns: 12, rows: 10, min_columns: 6, min_rows: 5 }; }

    _$(id) { return this.shadowRoot.getElementById(id); }

    _changed(old) {
      var c = this._config;
      if (c) c._cals.forEach(function (cal) {
        if (old.states[cal.id] !== this._hass.states[cal.id]) this._dirty = true;
      }, this);
      return this._dirty === true || langOf(old) !== langOf(this._hass);
    }

    _build() {
      var c = this._config;
      if (c.font === 'space_grotesk') loadFont();
      this.shadowRoot.innerHTML = '<style>' + CSS + '</style>' +
        '<ha-card class="gc" id="card"><div class="tint" id="tint"></div>' +
        '<div class="hdr" id="hdr">' +
        '<ha-icon id="hic" icon="mdi:calendar-month-outline"></ha-icon>' +
        '<div class="ht" id="ht"></div>' +
        '<div class="hr"><span class="range" id="range"></span><span class="chip n" id="count" hidden></span></div>' +
        '</div>' +
        '<div class="legend" id="legend" hidden></div>' +
        '<div class="list" id="list"><div class="msg" id="msg">' + esc(tr(langOf(this._hass), 'loading')) + '</div></div>' +
        '</ha-card>';
      this._built = true;
      this._bindActions();
      this._applyVars();
      this._update();
      if (this.isConnected) { this._startTimers(); this._startData(); this._observe(); }
    }

    _palette() {
      var mode = this._config.appearance;
      if (mode !== 'light' && mode !== 'dark') mode = this._hass && this._hass.themes && this._hass.themes.darkMode === false ? 'light' : 'dark';
      return mode;
    }

    _applyVars() {
      var c = this._config, card = this._$('card'); if (!card) return;
      var mode = this._palette(), P = PALETTE[mode];
      var acc = rgb(c.accent_color, P.accent_color.join(','));
      var glow = clamp(num(c.glow) == null ? 0.5 : num(c.glow), 0, 1);
      var font = c.font === 'theme' ? 'var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif))'
        : c.font === 'custom' && c.font_family ? c.font_family + ', system-ui, sans-serif'
          : "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      var grid = this._layout === 'grid';
      var vars = {
        '--gcal-accent': acc,
        '--gcal-text': rgb(c.text_color, P.text_color.join(',')),
        '--gcal-ga': (glow * 0.85).toFixed(3),
        '--gcal-font': font,
        '--gcal-radius': clamp(num(c.border_radius) == null ? 32 : num(c.border_radius), 0, 64) + 'px',
        '--gcal-minh': grid ? '0px' : clamp(num(c.min_height) || 0, 0, 2000) + 'px',
        '--gcal-bg': rgb(c.background_color, '0,0,0'),
        '--gcal-bga': c.background_color ? clamp(num(c.background_opacity) == null ? 0.18 : num(c.background_opacity), 0, 1) : 0
      };
      for (var k in vars) card.style.setProperty(k, vars[k]);
      card.classList.toggle('glass', c.glass !== false);
      card.classList.toggle('light', mode === 'light');
      var act = this._actionOf('tap') || this._actionOf('hold') || this._actionOf('double_tap');
      card.classList.toggle('act', !!act);
      card.setAttribute('tabindex', act ? '0' : '-1');
      this._layoutNow();
    }

    /* ---------- size: everything scales with the card width */
    _observe() {
      var self = this, card = this._$('card');
      if (this._ro || !card || !window.ResizeObserver) return;
      this._ro = new ResizeObserver(function () {
        if (self._raf) return;
        self._raf = requestAnimationFrame(function () { self._raf = null; self._layoutNow(); });
      });
      this._ro.observe(card);
    }
    _layoutNow() {
      var card = this._$('card'); if (!card) return;
      var w = card.clientWidth; if (!w) return;
      var scale = clamp(num(this._config.text_scale) || 1, 0.5, 2);
      var s = clamp(0.35 + 0.65 * w / 800, 0.6, 1.3) * scale;
      if (Math.abs((this._s || 0) - s) > 0.005) { this._s = s; card.style.setProperty('--s', s.toFixed(3)); }
    }

    /* ---------- interactions: standard Home Assistant actions */
    _actionOf(kind) {
      var c = this._config, a = c[kind + '_action'];
      if (!a && kind === 'tap' && c.entity) a = { action: 'more-info' };
      return a && a.action && a.action !== 'none' ? a : null;
    }
    _fireAction(kind) {
      var cfg = {
        entity: this._config.entity,
        tap_action: this._actionOf('tap') || { action: 'none' },
        hold_action: this._actionOf('hold') || { action: 'none' },
        double_tap_action: this._actionOf('double_tap') || { action: 'none' }
      };
      fire(this, 'hass-action', { config: cfg, action: kind });
    }
    _bindActions() {
      var self = this, card = this._$('card'), timer = null, held = false, down = false, sx = 0, sy = 0, lastTap = 0, tapT = null;
      function clear() { clearTimeout(timer); card.classList.remove('pressed'); }
      card.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        down = true; held = false; sx = e.clientX; sy = e.clientY;
        if (self._actionOf('tap') || self._actionOf('hold')) card.classList.add('pressed');
        if (self._actionOf('hold')) timer = setTimeout(function () { if (!down) return; held = true; clear(); self._fireAction('hold'); }, 500);
      });
      card.addEventListener('pointermove', function (e) {
        if (down && (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12)) { down = false; clear(); }
      });
      card.addEventListener('pointerup', function () {
        if (!down) return;
        down = false; clear();
        if (held) return;
        if (self._actionOf('double_tap')) {
          var now = Date.now();
          if (now - lastTap < 280) { clearTimeout(tapT); lastTap = 0; self._fireAction('double_tap'); return; }
          lastTap = now;
          tapT = setTimeout(function () { if (self._actionOf('tap')) self._fireAction('tap'); }, 280);
        } else if (self._actionOf('tap')) self._fireAction('tap');
      });
      card.addEventListener('pointercancel', function () { down = false; clear(); });
      card.addEventListener('pointerleave', function () { if (down) { down = false; clear(); } });
      card.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && self._actionOf('tap')) { e.preventDefault(); self._fireAction('tap'); } });
    }

    /* ---------- timers and data */
    _startTimers() {
      var self = this;
      if (!this._t1) this._t1 = setInterval(function () { self._slow(); }, 60000);
    }
    _stopTimers() { clearInterval(this._t1); this._t1 = null; }
    _stopData() { this._dataStarted = false; }
    _startData() {
      if (!this._hass || !this._built || this._dataStarted) return;
      this._dataStarted = true;
      this._slow();
    }
    _slow() {
      var self = this, c = this._config, k = dayKey(new Date());
      this._cday = k;
      this._dirty = false;
      Promise.all(c._cals.map(function (cal, ci) {
        return calFetch(self._hass, cal.id, c.days).then(function (ev) {
          return (ev || []).map(function (e) { e._cal = ci; return e; });
        });
      })).then(function (lists) {
        var ev = [];
        lists.forEach(function (l) { ev = ev.concat(l); });
        self._items = calItems(ev, self._config, langOf(self._hass), self._config._cals);
        self._render();
      });
    }

    /* ---------- rendering */
    _rangeLabel(l) {
      var c = this._config;
      var a = new Date(); a.setHours(0, 0, 0, 0);
      var b = new Date(a.getTime() + (c.days - 1) * 86400000);
      var f = function (d, opts) { return d.toLocaleDateString(l, opts); };
      var s, sameYear = a.getFullYear() === b.getFullYear(), sameMonth = sameYear && a.getMonth() === b.getMonth();
      if (sameMonth) s = f(a, { day: 'numeric' }) + ' – ' + f(b, { day: 'numeric', month: 'short' });
      else if (sameYear) s = f(a, { day: 'numeric', month: 'short' }) + ' – ' + f(b, { day: 'numeric', month: 'short' });
      else s = f(a, { day: 'numeric', month: 'short' }) + ' – ' + f(b, { day: 'numeric', month: 'short', year: 'numeric' });
      return s;
    }

    _dayLabel(l, idx) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + idx);
      if (idx === 0) return tr(l, 'today');
      if (idx === 1) return tr(l, 'tomorrow');
      var s = d.toLocaleDateString(l, { weekday: 'short' }).replace('.', '');
      s = s.charAt(0).toUpperCase() + s.slice(1);
      return s + ' ' + d.toLocaleDateString(l, { day: 'numeric', month: 'short' });
    }

    _render() {
      if (!this._built) return;
      var c = this._config, l = langOf(this._hass);
      var hdr = this._$('hdr'), ht = this._$('ht'), range = this._$('range'), count = this._$('count'), legend = this._$('legend');
      if (!hdr) return;
      hdr.hidden = c.show_header === false;
      if (!hdr.hidden) {
        var multi = c._cals.length > 1;
        var st2 = st(this._hass, c.entity);
        var friendly = st2 && st2.attributes && st2.attributes.friendly_name;
        ht.textContent = c.name || (!multi && friendly) || tr(l, multi ? 's_calendars' : 's_calendar');
        range.textContent = this._rangeLabel(l);
        var n = this._items ? this._items.total : 0;
        count.hidden = !n;
        if (n) count.textContent = n + ' ' + (n === 1 ? tr(l, 'event') : tr(l, 'events'));
        if (legend) {
          if (multi) {
            legend.hidden = false;
            legend.innerHTML = c._cals.map(function (cal) {
              var nm = st(this._hass, cal.id);
              nm = (cal.name || (nm && nm.attributes && nm.attributes.friendly_name)) || cal.id.replace(/^calendar\./, '');
              return '<span class="li"><i class="cdot" style="background:rgb(' + cal.color + ')"></i>' + esc(nm) + '</span>';
            }, this).join('');
          } else legend.hidden = true;
        }
      }
      this._renderList();
    }

    _renderList() {
      var el = this._$('list'); if (!el) return;
      var c = this._config, l = langOf(this._hass);
      var items = this._items;
      if (!items) {
        el.innerHTML = '<div class="msg">' + esc(tr(l, 'loading')) + '</div>';
        return;
      }
      if (!items.total) {
        el.innerHTML = '<div class="msg">' + esc(tr(l, 'empty').replace('%d', c.days)) + '</div>';
        return;
      }
      var html = '';
      var multi = c._cals.length > 1;
      for (var i = 0; i < c.days; i++) {
        var list = items.days[i];
        if (!list || !list.length) continue;
        html += '<div class="day' + (i === 0 ? ' today' : '') + '">' +
          '<div class="dlabel"><span class="dot"></span>' + esc(this._dayLabel(l, i)) + (i > 0 ? '' : '<span class="dt">' + new Date().toLocaleDateString(l, { day: 'numeric', month: 'short' }) + '</span>') + '</div>' +
          '<div class="evs">' + list.map(function (t) {
            var dot = multi && t.ccolor ? '<i class="cdot" style="background:rgb(' + t.ccolor + ');color:rgb(' + t.ccolor + ')"></i>' : '';
            return '<div class="evrow' + (t.time ? '' : ' all') + '" style="--c:' + t.color + '">' + dot +
              '<ha-icon icon="' + esc(t.icon) + '"></ha-icon>' +
              (t.time ? '<span class="time">' + esc(t.time) + '</span>' : '') +
              '<span class="lab">' + esc(t.label) + '</span>' +
              (t.location ? '<span class="loc">' + esc(t.location) + '</span>' : '') +
              '</div>';
          }).join('') + '</div></div>';
      }
      el.innerHTML = html;
    }

    _update() {
      if (!this._built) return;
      this._render();
    }
  }

  /* ================================================================ visual editor */

  var EXAMPLES = {
    de: [
      { pattern: 'Rest|Grauer Sack', label: 'Restmüll', icon: 'mdi:trash-can-outline', color: [170, 182, 200] },
      { pattern: 'Papier|Blauer Sack', label: 'Papier', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] },
      { pattern: 'Bio|Grün|Bioabfall', label: 'Bioabfall', icon: 'mdi:food-apple-outline', color: [92, 210, 120] },
      { pattern: 'Glas', label: 'Glas', icon: 'mdi:glass-fragile', color: [92, 210, 200] },
      { pattern: 'Gelb|Plastik|Metall', label: 'Gelber Sack', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] }
    ],
    it: [
      { pattern: 'Umido|Organico', label: 'Umido', icon: 'mdi:food-apple-outline', color: [186, 134, 102] },
      { pattern: 'Carta|Cartone', label: 'Carta', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] },
      { pattern: 'Plastica|Metalli', label: 'Plastica', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] },
      { pattern: 'Vetro', label: 'Vetro', icon: 'mdi:glass-fragile', color: [92, 210, 120] },
      { pattern: 'Indifferenziat|Secco', label: 'Indifferenziato', icon: 'mdi:trash-can-outline', color: [170, 182, 200] }
    ],
    en: [
      { pattern: 'Residual|Landfill|Black bag', label: 'General waste', icon: 'mdi:trash-can-outline', color: [170, 182, 200] },
      { pattern: 'Paper|Cardboard|Blue bag', label: 'Paper', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] },
      { pattern: 'Organic|Food|Compost|Garden', label: 'Organic', icon: 'mdi:food-apple-outline', color: [92, 210, 120] },
      { pattern: 'Glass', label: 'Glass', icon: 'mdi:glass-fragile', color: [92, 210, 200] },
      { pattern: 'Plastic|Packaging|Yellow|Metal', label: 'Plastic', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] }
    ]
  };

  // the Home Assistant form elements are loaded on demand: make sure they exist before drawing the editor
  var FORM = null;
  function ensureForm() {
    if (customElements.get('ha-form') && customElements.get('ha-expansion-panel')) return Promise.resolve();
    if (FORM) return FORM;
    FORM = new Promise(function (resolve) {
      var done = function () { resolve(); };
      try {
        var h = window.loadCardHelpers ? window.loadCardHelpers() : null;
        if (h) {
          h.then(function (helpers) { return helpers.createCardElement({ type: 'entities', entities: [] }); })
            .then(function (c) { return c && c.constructor && c.constructor.getConfigElement ? c.constructor.getConfigElement() : null; })
            .catch(function () { /* ignore */ });
        }
      } catch (e) { /* ignore */ }
      customElements.whenDefined('ha-form').then(done);
      setTimeout(done, 5000);
    });
    return FORM;
  }

  class GlassCalendarCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = Object.assign({}, config || {});
      this._draw();
    }
    set hass(h) {
      this._hass = h;
      if (this._form) this._form.hass = h;
      (this._rows || []).forEach(function (r) { r.hass = h; });
      (this._calRows || []).forEach(function (r) { r.hass = h; });
      if (this._calsPanel) {
        var pick = this._calsPanel.querySelector('#pick');
        if (pick) { pick.hass = h; pick.domain = 'calendar'; }
      }
      if (!this._form) this._draw();
    }
    connectedCallback() { this._draw(); }

    _L(k) { var t = T[baseLang(langOf(this._hass))] || T.en; return t[k] != null ? t[k] : (T.en[k] != null ? T.en[k] : k); }
    _mode() {
      var a = this._config.appearance;
      if (a === 'light' || a === 'dark') return a;
      return this._hass && this._hass.themes && this._hass.themes.darkMode === false ? 'light' : 'dark';
    }

    _schema() {
      var c = this._config, L = this._L.bind(this), sel = function (o) { return { select: { mode: 'dropdown', options: o } }; };
      var n = resolveCals(c).length;
      var calendar = [
        { name: 'name', selector: { text: {} } }
      ];
      if (n > 0) {
        calendar.push({ name: 'days', selector: { number: { min: 1, max: 14, step: 1, mode: 'slider', unit_of_measurement: L('days') } } });
        calendar.push({ type: 'grid', name: '', schema: [
          { name: 'max_events', selector: { number: { min: 1, max: 50, step: 1, mode: 'box' } } },
          { name: 'show_header', selector: { boolean: {} } }
        ] });
        calendar.push({ type: 'grid', name: '', schema: [
          { name: 'show_time', selector: { boolean: {} } },
          { name: 'show_location', selector: { boolean: {} } }
        ] });
        calendar.push({ type: 'grid', name: '', schema: [
          { name: 'default_icon', selector: { icon: {} } },
          { name: 'default_color', selector: { color_rgb: {} } }
        ] });
      }

      var look = [
        { name: 'appearance', selector: sel([{ value: 'auto', label: L('ap_auto') }, { value: 'dark', label: L('ap_dark') }, { value: 'light', label: L('ap_light') }]) },
        { name: 'font', selector: sel([{ value: 'space_grotesk', label: L('f_space') }, { value: 'theme', label: L('f_theme') }, { value: 'custom', label: L('f_custom') }]) }
      ];
      if (c.font === 'custom') look.push({ name: 'font_family', selector: { text: {} } });
      look.push({ name: 'text_scale', selector: { number: { min: 0.6, max: 1.8, step: 0.05, mode: 'slider' } } });
      look.push({ name: 'min_height', selector: { number: { min: 150, max: 1200, step: 10, mode: 'slider', unit_of_measurement: 'px' } } });
      look.push({ type: 'grid', name: '', schema: [
        { name: 'glass', selector: { boolean: {} } },
        { name: 'glow', selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } } }
      ] });
      look.push({ name: 'border_radius', selector: { number: { min: 0, max: 64, step: 1, mode: 'slider', unit_of_measurement: 'px' } } });

      var colors = [{ type: 'grid', name: '', schema: [
        { name: 'accent_color', selector: { color_rgb: {} } },
        { name: 'text_color', selector: { color_rgb: {} } },
        { name: 'background_color', selector: { color_rgb: {} } }
      ] }];
      if (c.background_color) colors.push({ name: 'background_opacity', selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } } });

      var actions = [
        { name: 'tap_action', selector: { ui_action: { default_action: n > 0 ? 'more-info' : 'none' } } },
        { name: 'hold_action', selector: { ui_action: { default_action: 'none' } } },
        { name: 'double_tap_action', selector: { ui_action: { default_action: 'none' } } }
      ];

      var X = function (title, icon, schema, expanded, helper) {
        return { type: 'expandable', name: '', title: L(title), icon: icon, flatten: true, expanded: !!expanded, schema: schema, _help: helper };
      };
      return [
        X('s_calendar', 'mdi:calendar-month-outline', calendar, true),
        X('s_look', 'mdi:palette-outline', look),
        X('s_colors', 'mdi:format-color-fill', colors),
        X('s_actions', 'mdi:gesture-tap', actions)
      ];
    }

    _data() {
      var c = this._config, P = PALETTE[this._mode()], d = {};
      Object.keys(DEF).forEach(function (k) { if (DEF[k] != null) d[k] = DEF[k]; });
      COLOR_KEYS.forEach(function (k) { d[k] = P[k]; });
      d = Object.assign(d, c);
      COLOR_KEYS.concat(['background_color', 'default_color']).forEach(function (k) {
        if (c[k] != null) d[k] = rgbArr(rgb(c[k], (P[k] || [0, 0, 0]).join(',')));
      });
      return d;
    }

    // keep the YAML tidy: only what differs from the defaults is saved
    _clean(v) {
      var P = PALETTE[this._mode()], out = {};
      Object.keys(v).forEach(function (k) {
        var x = v[k];
        if (x === undefined || x === null || x === '') return;
        if (k === 'type' || k === 'calendar_types') { out[k] = x; return; }
        if (k === 'entities') {
          if (Array.isArray(x) && x.length) out[k] = x;
          return;
        }
        if (k === 'calendars') {
          if (Array.isArray(x) && x.length) out[k] = x;
          return;
        }
        if (COLOR_KEYS.indexOf(k) >= 0 && P[k] && same(rgbArr(rgb(x, '')), P[k])) return;
        if (k in DEF && same(x, DEF[k])) return;
        out[k] = x;
      });
      if ('entities' in v && Array.isArray(v.entities)) delete out.entity; // the editor speaks “entities”
      if (Array.isArray(out.calendar_types) && !out.calendar_types.length) delete out.calendar_types;
      return out;
    }

    _emit(cfg) {
      this._config = cfg;
      fire(this, 'config-changed', { config: cfg });
      this._draw();
    }

    _draw() {
      var self = this;
      if (!this._hass || !this._config || !this.isConnected) return;
      ensureForm().then(function () { self._drawNow(); });
    }

    _drawNow() {
      var self = this, L = this._L.bind(this);
      if (!this._root) {
        this._root = this.attachShadow({ mode: 'open' });
        this._root.innerHTML = '<style>' +
          ':host{display:block}.box{display:flex;flex-direction:column;gap:12px}' +
          '.types{display:flex;flex-direction:column;gap:12px;padding:4px 0 8px}' +
          '.help{color:var(--secondary-text-color);font-size:13px;line-height:1.4;margin:0 0 4px}' +
          '.row{border:1px solid var(--divider-color);border-radius:12px;padding:10px 10px 4px;position:relative}' +
          '.row .del{position:absolute;top:6px;right:6px}' +
          '.btns{display:flex;flex-wrap:wrap;gap:8px}' +
          'button.b{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:14px;cursor:pointer;border-radius:18px;padding:7px 14px;' +
          '  border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}' +
          'button.b:hover{background:var(--secondary-background-color)}' +
          'button.b ha-icon{--mdc-icon-size:18px}' +
          'button.icon{border:0;background:none;cursor:pointer;color:var(--secondary-text-color);padding:6px;border-radius:50%}' +
          'button.icon:hover{color:var(--error-color, #db4437);background:var(--secondary-background-color)}' +
          '.chips{display:flex;flex-wrap:wrap;gap:6px}' +
          '.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:16px;padding:5px 10px;font:inherit;font-size:13px;cursor:pointer}' +
          '.chip:hover{border-color:var(--error-color, #db4437);color:var(--error-color, #db4437)}' +
          '.chip ha-icon{--mdc-icon-size:14px}' +
          '.chip .cdot{width:8px;height:8px;border-radius:50%;background:var(--cc);box-shadow:0 0 6px var(--cc);flex:none}' +
          '.addrow{display:flex;gap:8px;align-items:flex-start;margin-top:10px}.addrow .grow{flex:1;min-width:0}' +
          '.calid{font-size:12px;color:var(--secondary-text-color);font-family:var(--ha-font-family-monospace, monospace);margin:0 0 6px}' +
          '.foot{font-size:12px;color:var(--secondary-text-color);text-align:right}.foot a{color:inherit}' +
          '</style><div class="box"><div id="form"></div><div id="cals"></div><div id="types"></div>' +
          '<div class="foot">Glass Calendar Card ' + VERSION + ' · <a href="' + REPO + '" target="_blank" rel="noreferrer">GitHub</a></div></div>';
        this._form = document.createElement('ha-form');
        this._form.computeLabel = function (s) { return s.title || L(s.name); };
        this._form.computeHelper = function (s) {
          var k = s.name + '_h';
          if (s.type === 'expandable') return s.title === L('s_calendar') ? L('s_calendar_h') : '';
          var v = L(k); return v === k ? '' : v;
        };
        this._form.addEventListener('value-changed', function (ev) {
          ev.stopPropagation();
          var v = Object.assign({}, self._config, ev.detail.value);
          if (Array.isArray(v.entities)) {
            delete v.entity;
            self._syncCalData(v.entities);
            v.calendars = self._calEntries(v.entities);
          }
          self._emit(self._clean(v));
        });
        this._root.getElementById('form').appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = this._schema();
      this._form.data = this._data();
      this._drawCals();
      this._drawTypes();
    }

    /* ---------- per-calendar name & color (only useful with multiple calendars) */
    _syncCalData(ids) {
      var c = this._config, old = {}, i;
      var oldIds = resolveCals(c).map(function (x) { return x.id; });
      var cfgs = Array.isArray(c.calendars) ? c.calendars : [];
      for (i = 0; i < oldIds.length; i++) {
        (function (id) {
          var e = null;
          cfgs.forEach(function (m) { if (m && normId(m.entity) === id) e = m; });
          old[id] = { name: (e && e.name) || '', color: e && e.color ? rgbArr(rgb(e.color, null)) : null };
        })(oldIds[i]);
      }
      this._calData = ids.map(function (id) {
        return old[id] || { name: '', color: null };
      });
    }
    _calEntries(ids) {
      var out = [];
      (ids || []).forEach(function (id, i) {
        var d = this._calData[i] || {}, e = { entity: id };
        if (d.name) e.name = d.name;
        if (d.color) {
          var pal = CAL_PALETTE[i % CAL_PALETTE.length].join(',');
          if (rgbArr(d.color).join(',') !== pal) e.color = d.color;
        }
        if (Object.keys(e).length > 1) out.push(e);
      }, this);
      return out;
    }
    _setCals(ids) {
      var v = Object.assign({}, this._config, { entities: ids });
      delete v.entity;
      this._syncCalData(ids);
      v.calendars = this._calEntries(ids);
      this._emit(this._clean(v));
    }
    _addCal(id) {
      id = normId(id);
      if (!id) return false;
      var ids = resolveCals(this._config).map(function (x) { return x.id; });
      if (ids.indexOf(id) < 0) ids.push(id);
      this._setCals(ids);
      return true;
    }
    _drawCals() {
      var self = this, L = this._L.bind(this), host = this._root.getElementById('cals'), c = this._config;
      var cals = resolveCals(c);
      var key = cals.map(function (x) { return x.id; }).join(',');
      if (!cals.length) { host.innerHTML = ''; this._calRows = []; this._calsPanel = null; this._calKey = null; return; }
      if (!this._calsPanel || !host.contains(this._calsPanel)) {
        host.innerHTML = '';
        var p = document.createElement('ha-expansion-panel');
        p.outlined = true; p.expanded = true; p.header = L('s_calendars');
        p.innerHTML = '<div class="types"><div id="chips"></div>' +
          '<div class="addrow"><div class="grow"><ha-entity-picker id="pick" allow-custom-entity></ha-entity-picker></div>' +
          '<button class="b" id="addc"><ha-icon icon="mdi:plus"></ha-icon>' + esc(L('add_calendar')) + '</button></div>' +
          '<p class="help" id="chelp">' + esc(L('cals_h')) + '</p><div id="rows"></div></div>';
        host.appendChild(p);
        this._calsPanel = p; this._calKey = null;
        // the picker reports its choice via value-changed (reliable across HA versions);
        // the button is a fallback that reads the same value
        p.querySelector('#pick').addEventListener('value-changed', function (ev) {
          ev.stopPropagation();
          self._calPickId = ev.detail.value;
          if (self._calPickId && self._addCal(self._calPickId)) { self._calPickId = null; ev.target.value = ''; }
        });
        p.querySelector('#addc').addEventListener('click', function () {
          var id = p.querySelector('#pick').value || self._calPickId;
          if (!self._addCal(id)) { self._calPickId = null; console.info('Glass Calendar Card: pick a calendar first'); }
        });
      }
      var pick = this._calsPanel.querySelector('#pick');
      pick.hass = this._hass;
      pick.domain = 'calendar';
      if ('label' in pick) pick.label = L('add_calendar');
      if (!pick.value) pick.value = '';
      this._calsPanel.querySelector('#chelp').style.display = cals.length > 1 ? '' : 'none';
      var chipsEl = this._calsPanel.querySelector('#chips');
      var rowsEl = this._calsPanel.querySelector('#rows');
      if (this._calKey !== key) {
        this._calKey = key;
        this._syncCalData(cals.map(function (x) { return x.id; }));
        chipsEl.innerHTML = ''; this._calRows = [];
        cals.forEach(function (cal, i) {
          var chip = document.createElement('button');
          chip.className = 'chip'; chip.style.setProperty('--cc', 'rgb(' + cal.color + ')');
          chip.title = cal.id;
          chip.innerHTML = '<i class="cdot"></i><span>' + esc(cal.name || cal.id) + '</span><ha-icon icon="mdi:close"></ha-icon>';
          chip.addEventListener('click', function () {
            var ids = resolveCals(self._config).map(function (x) { return x.id; }).filter(function (x) { return x !== cal.id; });
            self._setCals(ids);
          });
          chipsEl.appendChild(chip);
          if (cals.length > 1) {
            var row = document.createElement('div'); row.className = 'row';
            var id = document.createElement('p'); id.className = 'calid'; id.textContent = cal.id; row.appendChild(id);
            var f = document.createElement('ha-form');
            f.hass = self._hass;
            f.computeLabel = function (s) { return L(s.name); };
            f.schema = [{ type: 'grid', name: '', schema: [
              { name: 'name', selector: { text: {} } }, { name: 'color', selector: { color_rgb: {} } }
            ] }];
            f.addEventListener('value-changed', function (ev) {
              ev.stopPropagation();
              self._calData[i] = ev.detail.value;
              var ids = resolveCals(self._config).map(function (x) { return x.id; });
              var v = Object.assign({}, self._config, { entities: ids, calendars: self._calEntries(ids) });
              delete v.entity;
              self._emit(self._clean(v));
            });
            row.appendChild(f); rowsEl.appendChild(row);
            self._calRows.push(f);
          }
        });
      }
      cals.forEach(function (cal, i) {
        var chip = chipsEl.children[i];
        if (chip) {
          chip.style.setProperty('--cc', 'rgb(' + cal.color + ')');
          var s = chip.querySelector('span'); if (s) s.textContent = cal.name || cal.id;
        }
        var f = self._calRows[i]; if (!f) return;
        f.hass = self._hass;
        f.data = { name: cal.name, color: rgbArr(cal.color) };
      });
    }

    _drawTypes() {
      var self = this, L = this._L.bind(this), host = this._root.getElementById('types'), c = this._config;
      if (!resolveCals(c).length) { host.innerHTML = ''; this._rows = []; this._typesPanel = null; return; }
      var types = Array.isArray(c.calendar_types) ? c.calendar_types : [];
      if (!this._typesPanel || !host.contains(this._typesPanel)) {
        host.innerHTML = '';
        var p = document.createElement('ha-expansion-panel');
        p.outlined = true; p.header = L('s_types');
        p.setAttribute('outlined', '');
        p.innerHTML = '<div class="types"><p class="help">' + esc(L('types_h')) + '</p><div id="rows"></div>' +
          '<div class="btns"><button class="b" id="add"><ha-icon icon="mdi:plus"></ha-icon>' + esc(L('add_type')) + '</button>' +
          '<button class="b" id="ex"><ha-icon icon="mdi:recycle"></ha-icon>' + esc(L('add_examples')) + '</button></div></div>';
        host.appendChild(p);
        this._typesPanel = p; this._rowsKey = null;
        p.querySelector('#add').addEventListener('click', function () {
          var t = (self._config.calendar_types || []).slice();
          t.push({ pattern: '', label: '', icon: 'mdi:calendar-star', color: [95, 243, 255] });
          if (self._typesPanel) self._typesPanel.expanded = true;
          self._emit(self._clean(Object.assign({}, self._config, { calendar_types: t })));
        });
        p.querySelector('#ex').addEventListener('click', function () {
          var ex = EXAMPLES[baseLang(langOf(self._hass))] || EXAMPLES.en;
          var t = (self._config.calendar_types || []).concat(JSON.parse(JSON.stringify(ex)));
          self._emit(self._clean(Object.assign({}, self._config, { calendar_types: t })));
        });
      }
      var rowsEl = this._typesPanel.querySelector('#rows');
      if (this._rowsKey !== types.length) {
        this._rowsKey = types.length;
        rowsEl.innerHTML = ''; this._rows = [];
        types.forEach(function (t, i) {
          var row = document.createElement('div'); row.className = 'row';
          var f = document.createElement('ha-form');
          f.hass = self._hass;
          f.computeLabel = function (s) { return L(s.name); };
          f.schema = [{ type: 'grid', name: '', schema: [
            { name: 'pattern', selector: { text: {} } }, { name: 'label', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } }, { name: 'color', selector: { color_rgb: {} } }
          ] }];
          f.addEventListener('value-changed', function (ev) {
            ev.stopPropagation();
            var list = (self._config.calendar_types || []).slice();
            list[i] = Object.assign({}, list[i], ev.detail.value);
            self._emit(self._clean(Object.assign({}, self._config, { calendar_types: list })));
          });
          var del = document.createElement('button');
          del.className = 'icon del'; del.title = L('remove'); del.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon>';
          del.addEventListener('click', function () {
            var list = (self._config.calendar_types || []).slice(); list.splice(i, 1);
            self._emit(self._clean(Object.assign({}, self._config, { calendar_types: list })));
          });
          row.appendChild(f); row.appendChild(del); rowsEl.appendChild(row);
          self._rows.push(f);
        });
      }
      types.forEach(function (t, i) {
        var f = self._rows[i]; if (!f) return;
        f.hass = self._hass;
        f.data = Object.assign({ pattern: '', label: '', icon: 'mdi:calendar-star' }, t, { color: rgbArr(rgb(t.color, '95,243,255')) });
      });
    }
  }

  /* ================================================================ registration */

  customElements.define(CARD, GlassCalendarCard);
  customElements.define(EDITOR, GlassCalendarCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: CARD, name: 'Glass Calendar Card', preview: true, documentationURL: REPO,
    description: 'A weekly calendar agenda in the liquid glass style of the Glass Clock Weather Card, with color-coded event types.'
  });
  console.info('%c GLASS-CALENDAR-CARD %c ' + VERSION + ' ', 'color:#0b0f1a;background:#5ff3ff;font-weight:700;border-radius:4px 0 0 4px', 'color:#5ff3ff;background:#0b0f1a;border-radius:0 4px 4px 0');
})();
