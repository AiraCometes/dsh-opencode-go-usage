import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

// Execute the committed browser artifact through the same factory seam as
// Harness. No DOM or authenticated provider request is needed for this check.
let bundle
runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load(value) { bundle = value } } },
})
assert.equal(bundle.id, 'dsh-ocgo-usage')
const client = bundle.factory(createRequire(import.meta.url))
let entry
let provider = 'opencode-go'
const scope = {
  slots: {
    inject(name, callback) { assert.equal(name, 'conversation.composer.dock'); return callback() },
    register(options) { entry = options; return () => {} },
  },
  modelDirectories: { directoryFor() {
    return { store: { getSnapshot: () => ({ current: { provider } }) } }
  } },
}
client.apply({
  effect: callback => callback(),
  locale: { register: () => () => {} },
  inject(services, callback) {
    assert.deepEqual(Array.from(services), ['slots', 'modelDirectories'])
    callback(scope)
  },
})
assert.equal(entry.name, 'conversation.composer.dock')
const injected = entry.inject('example')
assert.equal(await injected.provider(), 'opencode-go')
provider = 'deepseek'
assert.equal(await injected.provider(), 'deepseek')
console.log('Browser bundle factory and live model-directory integration passed')
