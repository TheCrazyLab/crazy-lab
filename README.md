# dsh-zhihu

DeepSeek Harness（dsh）插件：让 agent 能**读 / 抓 / 解析知乎**——回答、专栏文章、搜索结果。
属于「知乎 DSH 插件组」的核心地基，其余 `dsh-zhihu-collector` / `dsh-zhihu-tracker` / `dsh-zhihu-rec` / `dsh-zhihu-export` 都挂在它上面。

> 本插件是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 生态的一部分，遵循 "Everything is a Plugin"。

## 安装

```bash
# 需要先在跑 dsh（开发者预览版）
npx @deepseek-ai/dsh web

# 安装本插件（打 #dsh-plugin 话题即可被生态索引）
dsh plugin --profile web add "github:gengyueworks/dsh-zhihu#main"
```

装好后，agent 就能直接调用下面三个工具。

## 提供的工具

| 工具 | 作用 |
|------|------|
| `zhihu_fetch_column` | 按 URL / ID 抓取并解析知乎专栏文章（`zhuanlan.zhihu.com/p/<id>`），返回干净的标题 / 作者 / 正文 |
| `zhihu_fetch_answer` | 按 URL 抓取并解析知乎回答 / 问题页，返回干净的回答正文 |
| `zhihu_search` | 按关键词搜索知乎，返回结果链接列表，便于先发现再精读 |

## 配置

`cordis.patch.yml` 里的 `config` 会传给插件：

| 字段 | 默认 | 说明 |
|------|------|------|
| `userAgent` | 桌面 Chrome UA | 部分知乎页面对 UA / Referer 敏感 |
| `timeoutMs` | `15000` | 单次抓取超时 |
| `cache` | `true` | 预留：是否缓存已抓页面 |

## 实现说明

- 知乎页面把状态嵌在 `window.__INITIAL_STATE__ = ({...})`（不是严格 JSON）里，插件用容错正则提取并剥离 HTML 成纯文本。
- 抓取带浏览器 UA + `Referer: https://www.zhihu.com/`，尽量拿到完整页面。
- 若遇到登录墙导致解析不到正文，工具会如实返回「无法解析 / 可能需要登录」，不会编造内容。

## 已知限制 / 生产化方向

- **403 反爬**：纯 Node 端抓取在数据中心 IP / 未登录时会拿到 `HTTP 403`（已实测，正是 web 端直抓知乎遇到的风控墙）。
- **正确姿势**：生产版应把抓取路由到用户**已登录的浏览器**（dsh 的 `web` 半边，即 `dsh-web-app` 提供的浏览器能力），类似 modlens 用 `ctx.inject` 挂浏览器半边 + loopback 路由的做法。`src/zhihu/tools.ts` 的 `buildTools(config, fetchImpl)` 已预留 `fetchImpl` 注入点，将来把浏览器端 fetch 传进来即可，解析逻辑完全复用。
- 解析逻辑与抓取解耦，可脱离 dsh 单独测；当前 `fetchZhihu` 作为默认实现保留给可访问页面 / 本地调试。

## 开发

```bash
pnpm install
pnpm build       # tsc -> lib/
pnpm typecheck
```

`src/zhihu/` 是与框架无关的核心逻辑（fetch / parse / tools），可以脱离 dsh 单独测试；
`src/runtime.ts` 通过 `ctx.tools.register(...)` 把工具挂进 dsh。

## 发布

仓库已打 `#dsh-plugin` 话题，推到 GitHub 后会被 DeepSeek Harness 生态索引。

## License

MIT © gengyueworks
