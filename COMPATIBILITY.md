# DeepSeek Harness compatibility fork

This fork targets DeepSeek Harness **0.2.1-rc.2 only**. Newer prereleases and stable versions are not claimed compatible until their SDK and runtime have been validated. It uses the shared
`modelDirectories` service instead of the removed `connection.api.sessions`
interface, and registers the usage entry through `slots.inject` in
`conversation.input.right` in the input toolbar.

The usage entry remains visible only for an OpenCode Go model. The selected
provider is read from the live Session model projection on each poll, without
fetching the model catalog. Setting names are preserved. Console reads require `__Host-console_session` and an `org_…` or `wrk_…` ID; an old `auth` cookie must be replaced with the actual Console session, not renamed.

With the npm-installed `dsh` command, install the rc.2 revision in WSL:

```sh
dsh plugin --profile web add 'github:AiraCometes/dsh-opencode-go-usage#main'
```

Stop the existing Harness process, start it again with the same command you
normally use, and refresh the browser. Do not start a second process on 3080.
This revision requires the rc.2 SDK and Cordis ~4.0.5; it does not claim compatibility with alpha.2. The older 0.1.2-harness.2 revision requires alpha.2 and is correctly rejected on rc.2. No `allow-version` exemption is needed for this rc.2 revision. The prebuilt `lib` artifacts are committed and this package has no `prepare` script, so no `allowBuilds` entry is required for it. The original upstream repository remains available at
https://github.com/v587d/dsh-opencode-go-usage.

## Validation

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm test
pnpm run verify:bundle
pnpm peers check
```

The unit tests cover provider changes, session isolation, disposed sessions and rendered usage details. Build and bundle checks pass against rc.2. At commit `60eac01372f253d89659a2c55902ac2283ad502b`, an isolated DSH_HOME test using the npm-installed rc.2 CLI accepted the plugin without a compatibility exemption; an ephemeral loopback server included its client manifest and returned HTTP 200 from the config and usage APIs (usage reported `noconfig` without account credentials).
The bundle check executes the prebuilt browser factory through Harness's module
loader interface. A live authenticated browser check is still required after
installation; these checks do not verify an OpenCode account session.

## New conversation visibility

The usage entry registers in `conversation.input.right`, which the Harness renders for a selected session in both the new-conversation hero and the ongoing conversation. `conversation.composer.dock` only renders when the composer variant is `composer`; using it hides the entry on the hero even when OpenCode Go is selected. No API credentials are required to show the entry: missing usage configuration produces `<err:noconfig>`.

## Narrow input toolbars

At toolbar container widths up to 560px, the usage button shows only the OpenCode Go logo; click it to open all usage windows. Wider toolbars retain the inline readout. Error and unavailable states also collapse, with accessible button labels retained. The query uses the Harness toolbar's existing inline-size container, so it also applies to a narrow center pane in a wide browser window.

The earlier alpha.2 layout check used a local Edge fixture with the built browser bundle and Harness InputBar CSS and verified send-button containment at toolbar widths of 240, 320, 560 and 800px. With all three windows at 100%, the chip measured 36px in the narrow layouts and approximately 243px at 800px. The compact button opened all three detail windows; error and unavailable buttons also measured 36px. This fixture does not replace validation in an authenticated Harness session.

## SDK compatibility policy

Every package in `dsh.client.inject` is also an exact rc.2 peer dependency, alongside the host webserver and Cordis peer. These requirements let the plugin manager reject a partially upgraded SDK. Do not widen them solely to avoid an installation rejection: rc.3 and 0.2.1 stable must first be validated. Development SDK dependencies remain pinned for reproducible builds.

The repository's release-age exceptions list only exact DeepSeek package versions present in the lockfile. Obsolete alpha/rc pins are removed; no wildcard or global release-age bypass is used.

## Console usage migration

This revision fetches `/console/api/go/status` with the Console session cookie and `x-org-id`. It does not request `/workspace/<id>/go`. Legacy SSR parser exports remain for existing imports only. Percentages are floored integers from `usedMicroCents / limitMicroCents`; calculations use integer arithmetic, without fixed plan prices. Unknown reset deadlines stay absent in both the API response and UI. The month deadline falls back to `access.endsAt`.

Protocol evidence and test limitations are recorded in [docs/console-api.md](docs/console-api.md).
