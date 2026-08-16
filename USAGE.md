# 怎么用 · How to Use CRAZY LAB

> 这个号是独立实验站，和任何品牌号不挂钩。下面三样东西，用法不一样。

---

## 1. 两个网页玩具 —— 不用装，直接开

纯静态页面，打开即玩，不需要任何安装、不需要登录。

| 玩具 | 地址 | 每天怎么玩 |
|---|---|---|
| 🌊 全球冲浪随机器 | https://thecrazylab.github.io/crazy-lab/experiments/surf.html | 打开点一下，今天去哪儿浪它替你决定 |
| 📜 知乎时间轴·记录 | https://thecrazylab.github.io/crazy-lab/experiments/zhihu-records.html | 把读过的知乎链接贴进去，自动排成倒序时间轴；数据只存在你浏览器本地 |

这两个是**已完成**的，打开就能用，可以放心分享。

---

## 2. 知乎阅读插件 —— 真插件，要装到 dsh web profile

让 dsh 里的 agent 能读 / 抓 / 解析知乎。装好后 agent 有三个工具：

- `zhihu_fetch_column` —— 抓知乎专栏文章
- `zhihu_fetch_answer` —— 抓回答 / 问题页
- `zhihu_search` —— 搜知乎

### 安装（只做一次）

前提：你本机装了 dsh 的 web half，且浏览器**登录了知乎**。

```bash
# 1) 启动 dsh web half（会在浏览器开一个 Tab）
npx @deepseek-ai/dsh web

# 2) 在 dsh 里把本插件加进 web profile
dsh plugin --profile web add "github:TheCrazyLab/crazy-lab#main"
```

装完 agent 就能直接调上面三个工具了。

### 每天试（发布前质量关，见 zhihu_plugin_trial.md）

每天挑一个**你登录后能看**的知乎页，跑：

```
zhihu_fetch_answer https://www.zhihu.com/question/xxxxxxxx/answer/yyyyyyyy
```

- 拿到正文 = ✅
- 拿到 login wall / 403 = ⚠️（说明这次请求没走你登录态浏览器，要检查 dsh web half 是否在登录态下跑）

**连续 5 天 ✅，再考虑对外公布。** 没满 5 天、或出现过 ⚠️ 没查清，就先别发——避免别人点开发现是半成品。

---

## 为什么「能不能用」必须你本机验

知乎：① 封数据中心 IP（裸 Node 请求直接 403）；② 很多内容要登录才放。

所以插件从设计上就把抓取请求**路由到你本机已登录的浏览器**（dsh web half），解析逻辑完全复用。这也意味着：

- 本沙箱没有你的登录态，代跑只会造出假成功。
- 最终「它真的能抓知乎吗」这一锤，得在你自己机器、你自己的知乎登录态下敲定。
- 插件已经留好注入点（`client.ts` 的 `fetchImpl`），解析层可独立复用，不用担心「抓回来是空」是解析 bug。
