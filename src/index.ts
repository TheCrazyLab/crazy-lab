// DSH function-plugin entry. Named exports only — no default export.
// The Cordis Loader reads `name` / `inject` / `Config` / `apply` from the
// module namespace; a stray default export would shadow those.

export const name = 'dsh-zhihu'
export const inject = ['tools']

export { Config } from './config.js'
export type { Config as ZhihuConfig } from './config.js'
export { apply, assertPeerCompatible, TESTED_PEER_RANGE } from './runtime.js'
