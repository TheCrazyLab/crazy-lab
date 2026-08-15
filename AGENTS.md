# dsh-zhihu

知乎核心插件（DSH 插件组地基）。让 dsh 里的 agent 能读 / 抓 / 解析知乎。

## 仓库约定

- 入口：`src/index.ts`（命名导出 name / inject / Config / apply，禁止 default export）。
- 运行时：`src/runtime.ts` 的 `apply(ctx, config)` 通过 `ctx.tools.register(...)` 注册工具。
- 框架无关逻辑放在 `src/zhihu/`：`client.ts`（抓取）、`parse.ts`（解析）、`tools.ts`（工具定义）。
- manifest：`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- peer 依赖 `@deepseek-ai/dsh-tools` 与 `cordis`；`ctx.tools.register` 的真实签名以安装版本为准。

## 改动底线

- 不要加 default export 到 `src/index.ts`。
- 抓取必须带浏览器 UA + Zhihu Referer。
- 解析失败时如实报错，绝不编造知乎内容。
- 新增工具：在 `src/zhihu/tools.ts` 的 `buildTools` 里追加，并在 README 表格登记。
