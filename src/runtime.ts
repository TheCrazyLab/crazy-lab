import type { Context } from '@deepseek-ai/cordis'
import { createRequire } from 'node:module'
import { buildTools } from './zhihu/tools.js'
import type { Config } from './config.js'

export const TESTED_PEER_RANGE = '^0.1.0-rc.6'

// Soft compatibility check against the installed @deepseek-ai/dsh-tools.
// Warns (never throws) when the runtime version differs from what we tested,
// so a newer/older harness still loads the plugin.
export function assertPeerCompatible(): void {
  try {
    const require = createRequire(import.meta.url)
    const pkg = require('@deepseek-ai/dsh-tools/package.json') as {
      version?: string
    }
    if (pkg.version && !pkg.version.startsWith('0.1.0-rc')) {
      console.warn(
        `[dsh-zhihu] dsh-tools@${pkg.version} differs from tested ${TESTED_PEER_RANGE}; behavior may vary.`
      )
    }
  } catch {
    // Peer not resolvable at load time — ignore.
  }
}

export function apply(ctx: Context, config: Config): void {
  assertPeerCompatible()
  const tools = buildTools(config)
  ctx.effect(() => {
    const disposers = tools.map((tool) => ctx.tools.register(tool))
    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}
