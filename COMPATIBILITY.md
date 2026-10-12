# DeepSeek Harness compatibility fork

This fork targets DeepSeek Harness **0.2.1-alpha.2**. It uses the shared
`modelDirectories` service instead of the removed `connection.api.sessions`
interface, and registers the usage entry through `slots.inject` in
`conversation.input.right` in the input toolbar.

The usage entry remains visible only for an OpenCode Go model. The selected
provider is read from the live Session model projection on each poll, without
fetching the model catalog. Cookie and workspace configuration are unchanged.

Run this command from the Harness repository to install this revision:

```sh
pnpm dsh plugin --profile web add github:AiraCometes/dsh-opencode-go-usage#fix/usage-runtime-integration
```

Stop the existing `dsh web` process, start it again with the same command you
normally use, and refresh the browser. Do not start a second process on 3080.
Earlier Harness versions using the old connection API are not supported by this
compatibility branch. The original upstream repository remains available at
https://github.com/v587d/dsh-opencode-go-usage.

## Validation

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm test
pnpm run verify:bundle
pnpm peers check
```

The unit tests cover provider changes, session isolation and disposed sessions.
The bundle check executes the prebuilt browser factory through Harness's module
loader interface. A live authenticated browser check is still required after
installation; these checks do not verify an OpenCode account session.

## New conversation visibility

The usage entry registers in `conversation.input.right`, which the Harness renders for a selected session in both the new-conversation hero and the ongoing conversation. `conversation.composer.dock` only renders when the composer variant is `composer`; using it hides the entry on the hero even when OpenCode Go is selected. No API credentials are required to show the entry: missing usage configuration produces `<err:noconfig>`.
