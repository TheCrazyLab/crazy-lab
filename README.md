# dsh-zhihu

DeepSeek Harness（dsh）插件：让 agent 能**读 / 抓 / 解析知乎**——回答、专栏文章、搜索结果。
属于「知乎 DSH 插件组」的核心地基，其余 `dsh-zhihu-collector` / `dsh-zhihu-tracker` / `dsh-zhihu-rec` / `dsh-zhihu-export` 都挂在它上面。

> 本插件是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 生态的一部分，遵循 "Everything is a Plugin"。

## 安装

```bash
# 需要先在跑 dsh（开发者预览版）
npx @deepseek-ai/dsh web

# 安装本插件（打 #dsh-plugin 话题即可被生态索引）
dsh plugin --profile web add "github:dsh-zhihu/dsh-zhihu#main"
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
npm install        # 或 pnpm install
npm run build      # tsc -> lib/（含 lib/types/*.d.ts，对应 package.json 的 exports）
npm run typecheck
npm test           # vitest：解析边界 + 三个工具的 execute/render/错误路径
```

`src/zhihu/` 是与框架无关的核心逻辑（fetch / parse / tools），可以脱离 dsh 单独测试；
`src/runtime.ts` 通过 `ctx.tools.register(defineTool(...))` 把工具挂进 dsh。
测试覆盖：`extractInitialState` 对 `({...})` 与 `JSON.parse("...")` 两种形态、`pickField` 词边界（避免 `subTitle`/`mytitle` 误匹配）、`htmlToText` 去标签/实体、登录墙检测，以及三个工具的成功 / 登录墙 / 错误参数的 execute+render 行为。

## 本地验证（先确认插件真的装上了）

```bash
npx @deepseek-ai/dsh web
# 另开一个终端：
dsh plugin --profile web add "github:dsh-zhihu/dsh-zhihu#main"
```

装好后在 dsh 的 agent 会话里直接说：

> 用 zhihu_fetch_column 抓 https://zhuanlan.zhihu.com/p/2071956716355425552 ，告诉我标题和前两段。

如果工具出现在 agent 可调用的清单里、并能返回「抓取到了但解析不到正文 / 403」这类**如实报错**而不是崩溃，说明插件骨架工作正常。

> ⚠️ **关于真实抓取**：本插件默认的抓取实现是 Node 端 fetch，而知乎对数据中心 IP / 未登录上下文会返回 `HTTP 403`。在你的本机（住宅 IP）通过 dsh 的 `web` 半边跑，仍可能命中 403——这是知乎风控，不是插件 bug。要让真实抓取稳定可用，下一步是把抓取路由到**已登录浏览器**（dsh `web` 半边 + loopback fetch），`buildTools(config, fetchImpl)` 已预留该注入点，解析逻辑可完全复用。

## 发布

仓库已打 `#dsh-plugin` 话题，推到 GitHub 后会被 DeepSeek Harness 生态索引。

## License

MIT © dsh-zhihu
