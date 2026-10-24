# dsh-opencode-go-usage

> Compatibility fork for DeepSeek Harness 0.2.1-rc.2: see [COMPATIBILITY.md](COMPATIBILITY.md).

English | [中文](README.md)

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

![Footer demo](assets/custom-footer.png)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **bundle** that shows [OpenCode Go](https://dev.opencode.ai/v2/docs/console/go) subscription usage in the Web GUI's input toolbar (logo-only in narrow toolbars).

The Web counterpart of the [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) Pi extension: three usage windows (rolling 5h, weekly, monthly) with percentages and reset countdowns, color-coded so you see a window approaching exhaustion before you hit the rate limit mid-work.

```
OpenCode Go: 5h 0% (1h 23m) · wk 65% (2d 20h) · mo 83% (6d 21h) · upd 20:15
```

## Features

- **Three windows** — rolling (5h) / weekly / monthly percent + reset countdown
- **Color thresholds** — muted → warning (≥80%) → error (≥90% or rate-limited)
- **Data freshness** — `upd HH:MM` shows the last successful fetch time
- **Lightweight polling** — every 10 s (and on tab refocus); the host caches for 300 s (TTL configurable) with a 60 s failure cooldown, so opencode.ai is never hammered
- **Provider-aware** — the chip shows only while the session's current model routes through the `opencode-go` provider. Visibility reads the live in-memory model selection (`modelDirectories`, ~ms warm) on every poll, so switching to e.g. DeepSeek official via `/model` hides it within one 10 s cycle and switching back re-shows it (mirrors pi-ocgo-usage)
- **Click to expand** — detail panel with per-window reset countdowns, a `Set` credential editor, and `refresh upd HH:MM`
- **Built-in credential editor** — no terminal needed: the `Set` panel edits workspace id and cookie in place (fields show `••••` + last 4 chars; click outside / Esc / Save confirms the write)
- **Graceful degradation** — missing config shows `<err:noconfig>`, HTTP failures `<err:httpXXX>`; on error, clicking the chip opens the Set editor directly
- **Cookie stays on the host** — the browser only ever talks to the same-origin `/api/ocgo-usage` JSON endpoint; the cookie never reaches the page

> **⚠️ Requires the OpenCode Console `__Host-console_session` cookie.** The cookie is a full user session (not an API key) and grants access to your entire OpenCode account. Treat it like a password — see [Configuration](#configuration).

## Requirements

- DeepSeek Harness **`0.2.1-rc.2` only** (web profile); later versions require validation
- pnpm on `PATH` (for `dsh plugin`)

## Installation

This package is a standard dsh **bundle**: it declares `dsh.bundle` in its manifest and installs through `dsh plugin --profile web add <spec>` (a pnpm forwarder), which links the package and appends it to the profile's `dsh.profile.bundles`. The repo ships pre-built `lib/` artifacts, so **no build step or install-time build permission is needed** — this follows the official [publish guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md).

### From GitHub (recommended for users)

```sh
dsh plugin --profile web add 'github:AiraCometes/dsh-opencode-go-usage#main'
```

Because `lib/` is committed, pnpm installs the built package directly and never asks for a build-script allowance.

### npm package identity

This compatibility fork is not published to npm. The registry package named
`dsh-ocgo-usage` belongs to upstream and does not select this fork. Use the GitHub
command above or build a tarball from this checkout. Installing DSH itself from
npm does not change the plugin installation command.

### From a tarball

```sh
pnpm pack            # in this repo → dsh-ocgo-usage-0.1.4-rc.2.3.tgz
dsh plugin --profile web add ./dsh-ocgo-usage-0.1.4-rc.2.3.tgz
```

### From a local checkout (development)

```sh
git clone --branch main https://github.com/AiraCometes/dsh-opencode-go-usage.git
cd dsh-opencode-go-usage
pnpm install
pnpm run build
dsh plugin --profile web add link:$(pwd)
```

**Restart Harness with your normal launch command, then refresh the page.** The usage chip appears in the input toolbar after selecting OpenCode Go. Verify the plugin layer is composed without booting:

```sh
dsh --profile web --dump-config   # shows a "# == dsh-ocgo-usage" layer
```

## Configuration

### Console credentials

1. Sign in at `https://opencode.ai/console` and open the workspace's Go page.
2. Copy the `org_…` (or existing `wrk_…`) ID from the URL. Keep its prefix; enter only the ID, not the whole URL.
3. In the browser developer tools, open Application → Cookies → `https://opencode.ai` and copy `__Host-console_session`. Paste `__Host-console_session=<value>` into the plugin's cookie field (a bare Console session value is also accepted).
4. The old `auth=<value>` cookie must be replaced, not renamed: it is a different login session. Do not paste real cookie values into issues or chat.

The `workspaceID` setting and environment variable retain their existing names and now accept organization IDs. Missing reset timestamps omit the countdown; they do not mean zero seconds. Only explicit meter reset timestamps produce countdowns; subscription/billing end dates are not assumed to be monthly resets.

### Option 1: the in-UI Set panel (easiest)

Click the chip to expand → `Set` (bottom-left) → type the workspace id and cookie (existing values show as `••••` + last 4 chars; focus a field to type a replacement) → click outside / press Esc / hit Save — successful saves take effect immediately. If saving fails, the editor stays open with the draft and an error message; retry or select Cancel to discard the draft without saving. Only an explicit Console-cookie validation error suggests replacing the cookie; other failures use a generic connection/settings message. Inputs and Cancel are disabled while a write is pending.

![Set editor](assets/set-cookie-wid.png)

### Option 2: environment variables (same names as pi-ocgo-usage)

```sh
export OPENCODE_GO_COOKIE="__Host-console_session=example-session; oc_locale=en"
export OPENCODE_GO_WORKSPACE_ID="org_example"
```

### Option 3: config file

Write `$DSH_HOME/ocgo-usage.json` (default `~/.dsh/ocgo-usage.json`):

```jsonc
{
  "cookie": "__Host-console_session=example-session; oc_locale=en",
  "workspaceID": "org_example"
}
```

```sh
chmod 600 ~/.dsh/ocgo-usage.json
```

Priority: env vars > config file > built-in defaults.

### Optional overrides

| Env var | Default | Description |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API base URL |
| `OPENCODE_GO_CACHE_TTL` | `300` | Host cache TTL in seconds, clamped to 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP timeout |

Composition-level config (via `~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- id: ocgo-usage
  config:
    enabled: false    # master switch, default true
```

> **Session expiration:** for an `org_…` ID, HTTP 401/403 can require signing in again and replacing `__Host-console_session`. For a rejected legacy `wrk_…` ID, first check the current ID in the Console URL as well as the session; a `workspace` error retains the original HTTP status in its message. The old website `auth` cookie alone cannot authenticate the Console and is rejected on save without modifying existing settings. Redirects are not followed. A response with no subscription is reported as `<err:nosubscription>`; invalid JSON/meters are `<err:parse>`, not an invented authentication error.

## Usage

Click the chip to expand the detail panel: each window shows its full name, percent, and reset countdown; `refresh upd HH:MM` (bottom-right) refreshes manually and shows the data time.

![Usage detail](assets/usage-detail.png)

## How it works

- **Host half** (`src/index.ts`, `src/service.ts`, `src/api.ts`, `src/routes.ts`) — fetches `GET /console/api/go/status` with the Console session cookie and `x-org-id` header, converts `access.meters.fiveHour/week/month` from used/limit micro-cents into percentages and reset timestamps, caches the result, and serves it as same-origin JSON at `/api/ocgo-usage` (+ `/api/ocgo-usage/refresh`, `/api/ocgo-usage/config`).
- **Browser half** (`src/client/`) — registers a chip into the `conversation.input.right` slot, polls the host endpoints every 10 s, and renders the three windows with severity colors; visibility comes from the live provider in `modelDirectories`.

The browser never sees the cookie; all fetching and parsing happen on the host.

## Security

- The `__Host-console_session` cookie is a **full OpenCode Console user session**. Anyone with it can access every workspace, subscription, and billing detail in your account.
- The plugin **never** logs the cookie, includes it in error messages, or sends it to the browser.
- The config editor only writes new values to `$DSH_HOME/ocgo-usage.json` (chmod 600); the browser only ever sees the `••••` + last-4 masked view.

## Development

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run (parser / config / service)
```

The build config (`shared/tsdown.client.ts`) is adapted from [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter) (BSD-3-Clause), itself a copy of the official DSH `packages/client/tsdown.client.ts` — it emits the `window.__ModuleLoader__.load({id, factory})` closure-factory artifact the web shell's module table consumes.

## License

MIT — see [LICENSE](./LICENSE).
