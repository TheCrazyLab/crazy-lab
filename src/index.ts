// DSH function-plugin entry. Named exports only — no default export.
// The Cordis Loader unwraps `exports.default ?? exports`; a stray default
// export would discard the namespace exports (name / inject / Config / apply).

export const name = 'dsh-zhihu'
export const inject: string[] = []

export { Config } from './config.js'
export { apply } from './runtime.js'
export type { ZhihuConfig } from './config.js'
