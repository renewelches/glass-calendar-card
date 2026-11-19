# Glass Calendar Card

<p align="center">
  <img src="docs/screenshot-dark.png" width="480" alt="Dark mode"><br><br>
  <img src="docs/screenshot-light.png" width="480" alt="Light mode">
</p>

A weekly calendar agenda for Home Assistant, in the same **liquid glass** style as the
[Glass Clock Weather Card](https://github.com/ironblaster/glass-clock-weather-card):
frosted backdrop blur, glow, color-coded events, dark/light auto mode — and a full
visual editor.

It replaces the stock `cal-card` with a card that fits a glass / "Casa Futura" look:

- Events of the next **1–14 days**, grouped by day (Today, Tomorrow, Tue 3 Feb, …)
- Each event is a pill in the same visual language as the calendar chips of the clock card:
  colored icon with glow, time, title, location
- Today's events glow a little stronger
- **Event types**: events whose title matches a pattern get their own label, icon and color
  (waste collection ready-made, in German, English and Italian)
- Standard tap / hold / double-tap actions
- Events are fetched through Home Assistant's own `calendars` API, cached for 15 minutes

## Install

The easiest way to install a custom Home Assistant dashboard card is through [HACS](https://hacs.xyz/) (Home Assistant Community Store), which handles file placement, resource registration, and updates. You can also install the card manually if you don't use HACS.

### Method 1: Install via HACS (recommended)

1. Open HACS in your Home Assistant sidebar.
2. Go to **Dashboards** (your HACS version may call this **Plugins**) and search for **Glass Calendar Card**.
   - If the card isn't listed by default, open the **three-dot menu** in HACS, choose **Custom repositories**, paste the card's GitHub URL — `https://github.com/renewelches/glass-calendar-card` — select **Dashboard** as the category, and add it.
3. Select the card and click **Download**.
4. Refresh your browser cache (such as `Ctrl + F5` on Windows, `⇧⌘R` on macOS) so Home Assistant loads the new frontend resource.

After this, the card can be added to the dashboard: **Edit dashboard → ＋ Add card → Glass Calendar Card** (or, in the custom-element list, `custom:glass-calendar-card`) and pick one of your `calendar.` entities.

### Method 2: Manual install (without HACS)

1. Copy `dist/glass-calendar-card.js` into your Home Assistant config folder: `config/www/`.
2. In `configuration.yaml`, make the folder available to the frontend:
   ```yaml
   http:
     extra_config_url_paths:
       - /local
   ```
   Then restart Home Assistant.
3. Edit your dashboard → **⋮ menu → Raw view editor** and add the resource to the end of `resources:`:
   ```yaml
   resources:
     - url: /local/glass-calendar-card.js
       type: module
   ```
4. Save and refresh your browser cache (`Ctrl + F5` / `⇧⌘R`).

Now the card can be added to the dashboard exactly as with HACS: **Edit dashboard → ＋ Add card → Custom element → `custom:glass-calendar-card`**. The only difference: updates have to be done manually (download a new `glass-calendar-card.js` and overwrite the old file in `config/www/`).

## Usage

```yaml
type: custom:glass-calendar-card
entity: calendar.waste
days: 7
max_events: 8
show_location: false
default_icon: mdi:calendar-star
calendar_types:
  - pattern: "Gelb|Plastik|Metall"
    label: "Gelber Sack"
    icon: mdi:bottle-soda-classic-outline
    color: [255, 198, 64]
  - pattern: "Papier|Blauer Sack"
    label: "Papier"
    icon: mdi:newspaper-variant-outline
    color: [96, 165, 250]
  - pattern: "Bio|Grün"
    label: "Bioabfall"
    icon: mdi:food-apple-outline
    color: [92, 210, 120]
  - pattern: "Glas"
    label: "Glas"
    icon: mdi:glass-fragile
    color: [92, 210, 200]
  - pattern: "Rest|Grauer Sack"
    label: "Restmüll"
    icon: mdi:trash-can-outline
    color: [170, 182, 200]
```

Everything can also be set in the visual editor: choose your calendar, add event types
(including one-click waste-collection examples), and tune the appearance to match the
clock card (accent color, font, glow, corner radius, …).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `entity` | entity | **required** | A `calendar.` entity. |
| `name` | text | from the entity | Card title in the header. |
| `show_header` | boolean | `true` | Title, week range and event count. |
| `days` | `1`–`14` | `7` | How many days from today are covered. |
| `max_events` | `1`–`50` | `8` | Maximum events shown per day. |
| `show_time` | boolean | `true` | Show the start time of timed events. |
| `show_location` | boolean | `false` | Show the event location, if it has one. |
| `default_icon` | icon | `mdi:calendar-star` | Icon for events without a matching type. |
| `default_color` | color | grey | Color for events without a matching type. |
| `calendar_types` | list | | Each item: `pattern`, `label`, `icon`, `color`. The pattern is searched in the event title case-insensitively; separate alternatives with `|`. |
| `appearance` | `auto`, `dark`, `light` | `auto` | `auto` follows the dark mode of your theme. |
| `font` | `space_grotesk`, `theme`, `custom` | `space_grotesk` | Same choices as the clock card, so both cards match. |
| `font_family` | text | | Font name, used with `font: custom`. |
| `text_scale` | `0.6`–`1.8` | `1` | Makes every text bigger or smaller. |
| `min_height` | pixels | `320` | Minimum height. In a sections view the grid sets the height instead. |
| `glass` | boolean | `true` | Glass background with blur. Off: the normal card background of your theme. |
| `glow` | `0`–`1` | `0.5` | Glow of the header icon and of today's events. |
| `border_radius` | pixels | `32` | Keep it the same as on the clock card to match. |
| `accent_color` | color | cyan | Header icon, day dots, event count badge. |
| `text_color` | color | white (dark), ink (light) | |
| `background_color` | color | | A tint over the glass. |
| `background_opacity` | `0`–`1` | `0.18` | Strength of the tint. |
| `tap_action` | action | more info of the calendar | Any standard Home Assistant action, e.g. `navigate` to the calendar page. |
| `hold_action` | action | none | |
| `double_tap_action` | action | none | |

Colors can be written as `[r, g, b]`, `"#rrggbb"` or `"r, g, b"`.

## Updates

Home Assistant itself does not update custom cards — the card is just a frontend resource your own HA serves. Updates arrive through whatever method you installed with:

- **HACS (recommended):** HACS watches the *git tags* of the repo. When a new version tag (e.g. `v1.1.0`) is pushed, a **red dot** appears on HACS in your sidebar. Click HACS → **Glass Calendar Card** → **New version available** → **Update**, then refresh your browser (`Ctrl + F5` / `⇧⌘R`).
- **Manual:** download the `glass-calendar-card.js` from the new [release](../../releases), overwrite the file in `config/www/`, and hard-refresh the browser.

## Security & third-party code

The card ships with **zero JavaScript dependencies** — there is no `package.json` and nothing is bundled from npm, so there is no JS supply chain to compromise. The only external resources it can load are:

| Resource | Where | Why | Opt-out |
| -------- | ----- | --- | ------- |
| Space Grotesk font (Google Fonts) | card | the default font | set `font: theme` |
| MDI webfont (jsDelivr) | demo page only | demo icons | n/a, not part of the card |

All event data stays inside your Home Assistant instance.

CI enforces this on every push/PR (`Security` workflow):

- **Dependency audit** — `npm audit` for high-severity vulnerabilities if a `package.json`/lockfile ever appears
- **Third-party URL scan** — `scripts/external-urls.mjs` fails the build if any new external origin (a new CDN, a new script source) shows up in the card or the demo, so a dependency can never sneak in unnoticed
- **CodeQL** — static analysis of the JavaScript for common vulnerability patterns (e.g. DOM XSS via `innerHTML`)

## Releases

Releases are created automatically by GitHub Actions: push a semver tag and the `Release` workflow runs the checks (syntax, HACS validation) and publishes `dist/glass-calendar-card.js` plus the LICENSE as a GitHub release:

```
git tag v1.1.0
git push origin v1.1.0
```

HACS uses these same tags to detect new versions (see *Updates* above).

## Demo

The repo includes a small demo page (no Home Assistant required):

```
python3 -m http.server -d . 8080
# → http://localhost:8080/demo/?theme=light  or  ?lang=de  or  ?lang=it
```

## Privacy

All event data is served by your own Home Assistant instance; the card never talks to
the internet. With `font: space_grotesk` (the default) the font is loaded from Google
Fonts. Choose `font: theme` to avoid that.

## License

MIT
