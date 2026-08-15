import type { Context } from 'cordis'
import type { ZhihuConfig } from './config.js'
import { buildTools, type ToolDef } from './zhihu/tools.js'

// Minimal tool-service surface we register against. Once @deepseek-ai/dsh-tools
// is installed, replace this with the real ToolService type. The registration
// path `ctx.tools.register(...)` is the documented DSH integration contract.
interface ToolService {
  register(def: ToolDef): void
}

export function apply(ctx: Context, config: ZhihuConfig): void {
  const tools = buildTools(config)
  const registry = ctx.tools as unknown as ToolService

  ctx.effect(() => {
    for (const tool of tools) {
      registry.register(tool)
    }
  })
}
