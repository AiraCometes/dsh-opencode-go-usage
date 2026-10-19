# dsh-opencode-go-usage

> Compatibility fork for DeepSeek Harness 0.2.1-rc.2: see [COMPATIBILITY.md](COMPATIBILITY.md).

[English](README.en.md) | 中文

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

![Footer demo](assets/custom-footer.png)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **bundle**，在 Web 界面的输入框工具栏（窄工具栏中仅显示 Logo）显示 [OpenCode Go](https://dev.opencode.ai/v2/docs/console/go) 订阅用量。

它是 [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage)（Pi 插件）的 Web 对应物：三个用量窗口（5h 滚动 / 每周 / 每月）的百分比与重置倒计时，按阈值变色，让你在窗口耗尽、请求被限流之前就发现。

```
OpenCode Go: 5h 0% (1h 23m) · wk 65% (2d 20h) · mo 83% (6d 21h) · upd 20:15
```

## 特性

- **三个窗口** —— 5h 滚动 / 每周 / 每月 的百分比 + 重置倒计时
- **颜色阈值** —— 正常 → 黄色警告（≥80%）→ 红色错误（≥90% 或已限流）
- **数据新鲜度** —— `upd HH:MM` 显示最近一次成功抓取时间
- **轻量轮询** —— 每 10s 轮询（切回标签页立即刷新）；host 端 300s 缓存（TTL 可配）+ 60s 失败冷却，不会频繁打扰 opencode.ai
- **Provider 感知** —— 仅当会话当前模型走 `opencode-go` provider 时显示；每次轮询读取内存中的实时模型选择（`modelDirectories`，毫秒级），切到 DeepSeek 官方等其它 provider 后一个轮询周期内自动隐藏，切回自动恢复（与 pi-ocgo-usage 行为一致）
- **点击展开** —— 详情面板显示每个窗口的重置倒计时，左下角 `Set` 可配置凭据，右侧 `refresh upd HH:MM` 手动刷新
- **内置凭据编辑器** —— 无需碰终端：`Set` 面板直接修改 workspace id 与 cookie（输入框以 `••••` + 末尾 4 位显示，点击外部 / Esc / 保存确认写入）
- **优雅降级** —— 配置缺失显示 `<err:noconfig>`，HTTP 失败显示 `<err:httpXXX>`；出错时点击 chip 直接进入 Set 面板
- **Cookie 只在 host 侧** —— 浏览器只访问同源 `/api/ocgo-usage` JSON 端点，cookie 永不进入页面

> **⚠️ 需要 OpenCode Console 的 `__Host-console_session` cookie。** 该 cookie 是完整用户会话（不是 API key），可访问你 OpenCode 账户的全部内容。请像对待密码一样对待它——见 [配置](#配置)。

## 环境要求

- DeepSeek Harness **仅 `0.2.1-rc.2`**（web profile）；后续版本需要单独验证
- `PATH` 上有 pnpm（`dsh plugin` 需要）

## 安装

这是一个标准的 dsh **bundle**：`package.json` 声明了 `dsh.bundle`，通过 `dsh plugin --profile web add <spec>` 安装（pnpm 转发器），自动加入 profile 的 `dsh.profile.bundles`。仓库内置预构建的 `lib/` 产物，**安装无需任何构建步骤或构建权限**——遵循官方 [publish 指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add 'github:AiraCometes/dsh-opencode-go-usage#main'
```

因为 `lib/` 已提交到仓库，pnpm 直接安装构建好的包，不会要求构建脚本授权。

### npm 包说明

此兼容 fork 尚未发布到 npm。注册表中的 `dsh-ocgo-usage` 是上游包，
不会安装此 fork。请使用上面的 GitHub 命令，或从当前仓库构建 tarball。
即使 DSH 本身通过 npm 安装，插件仍使用上面的 GitHub 命令。

### 从 tarball 安装

```sh
pnpm pack            # 在本仓库内 → dsh-ocgo-usage-0.1.4-rc.2.3.tgz
dsh plugin --profile web add ./dsh-ocgo-usage-0.1.4-rc.2.3.tgz
```

### 本地开发安装

```sh
git clone --branch main https://github.com/AiraCometes/dsh-opencode-go-usage.git
cd dsh-opencode-go-usage
pnpm install
pnpm run build
dsh plugin --profile web add link:$(pwd)
```

**使用平时的启动命令重启 Harness 并刷新页面**，选择 OpenCode Go 后 chip 出现在输入框工具栏中。不启动即可验证插件层已组合：

```sh
dsh --profile web --dump-config   # 应显示 "# == dsh-ocgo-usage" 层
```

## 配置

### Console 凭据

1. 登录 `https://opencode.ai/console`，打开工作区的 Go 页面。
2. 从 URL 复制 `org_…`（或现有 `wrk_…`）ID，保留原来的前缀，只填 ID，不要填完整 URL。
3. 在浏览器开发者工具的 Application → Cookies → `https://opencode.ai` 中复制 `__Host-console_session`，粘贴为 `__Host-console_session=<值>`（也接受直接粘贴 Console 会话值）。
4. 旧 `auth=<值>` 与 Console 是不同的会话，必须重新获取，不能只改名称。不要将真实 cookie 发到 Issue 或聊天中。

配置字段仍叫 `workspaceID`，现在接受组织 ID。无重置时间时不显示倒计时；倒计时只使用用量窗口明确返回的重置时间，不把订阅结束时间当作月度重置时间。

### 方式一：界面内 Set 面板（最简单）

点击 chip 展开详情 → 左下角 `Set` → 输入 workspace id 与 cookie（已设置的值以 `••••` + 末尾 4 位显示，聚焦即可输入新值）→ 点击外部 / Esc / 保存按钮确认；保存成功后立即生效。保存失败时保留面板和输入内容并显示错误，可重试或点击取消丢弃更改。只有明确的 Cookie 验证错误才提示更新 Console cookie；其他错误使用连接和设置的通用提示。保存期间输入和取消按钮暂时禁用。

![Set editor](assets/set-cookie-wid.png)

### 方式二：环境变量（与 pi-ocgo-usage 同名）

```sh
export OPENCODE_GO_COOKIE="__Host-console_session=example-session; oc_locale=en"
export OPENCODE_GO_WORKSPACE_ID="org_example"
```

### 方式三：配置文件

写入 `$DSH_HOME/ocgo-usage.json`（默认 `~/.dsh/ocgo-usage.json`）：

```jsonc
{
  "cookie": "__Host-console_session=example-session; oc_locale=en",
  "workspaceID": "org_example"
}
```

```sh
chmod 600 ~/.dsh/ocgo-usage.json
```

优先级：环境变量 > 配置文件 > 内置默认。

### 可选覆盖项

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API 基础地址 |
| `OPENCODE_GO_CACHE_TTL` | `300` | host 缓存秒数，范围 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP 超时 |

组合层配置（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: ocgo-usage
  config:
    enabled: false    # 总开关，默认 true
```

> **会话过期：** 使用 `org_…` 时 Console 返回 HTTP 401/403，可能需要重新登录并更新 `__Host-console_session`；旧 `wrk_…` 被拒绝时，还应先确认 Console URL 中当前的 ID。旧的 `auth` cookie 不能单独用于 Console，且不会自动跟随重定向。未订阅显示 `<err:nosubscription>`，无效 JSON 或用量字段显示 `<err:parse>`。

## 使用

点击 chip 展开详情面板：每个窗口显示完整名称、百分比与重置倒计时；右下角 `refresh upd HH:MM` 手动刷新并显示数据时间。

![Usage detail](assets/usage-detail.png)

## 工作原理

- **Host 半**（`src/index.ts`、`src/service.ts`、`src/api.ts`、`src/routes.ts`）—— 携带 Console 会话 cookie 和 `x-org-id` 请求 `GET /console/api/go/status`，将 `access.meters.fiveHour/week/month` 的微分用量与限额转换为百分比和重置时间，缓存结果，通过同源 JSON 端点 `/api/ocgo-usage`（+ `/api/ocgo-usage/refresh`、`/api/ocgo-usage/config`）提供数据。
- **浏览器半**（`src/client/`）—— 向 `conversation.input.right` slot 注册 chip，每 10s 轮询 host 端点，按严重级别着色渲染三个窗口；可见性来自 `modelDirectories` 的实时 provider 判断。

浏览器永远看不到 cookie；抓取与解析全部在 host 侧完成。

## 安全

- `__Host-console_session` cookie 是**完整的 OpenCode Console 用户会话**。任何人拿到它都能访问你账户内的所有 workspace、订阅与账单信息。
- 插件**绝不**记录 cookie、不把它放进错误信息、不发送给浏览器。
- 配置编辑器只把新值写入 `$DSH_HOME/ocgo-usage.json`（chmod 600），浏览器始终只看到 `••••` + 末尾 4 位的掩码视图。

## 开发

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run（解析器 / 配置 / 服务）
```

构建配置（`shared/tsdown.client.ts`）改编自 [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter)（BSD-3-Clause），后者是官方 DSH `packages/client/tsdown.client.ts` 的副本——它产出 web shell 模块表所需的 `window.__ModuleLoader__.load({id, factory})` 闭包工厂产物。

## License

MIT —— 见 [LICENSE](./LICENSE)。

## Changelog

### v2.0.0 - 中英双语支持

**🎉 重大更新：现在支持中文界面了！**

- **🌏 国际化 (i18n) 支持**：自动识别 DeepSeek Harness 的中文/英文界面语言
  - 新增中文标签解析：`滚动用量`、`每周用量`、`每月用量`
  - 新增中文时间单位支持：秒、分钟、小时、天、周、月、年
  - 智能匹配中英文重置提示：`Resets in` / `重置于`
- **🎨 深色模式优化**：调整 Logo 在深色主题下的对比度，视觉更舒适
- **🧪 完整测试覆盖**：新增中文场景单元测试，确保解析准确性

特别感谢 [@waknow](https://github.com/waknow) 贡献了核心的中文本地化功能！🙏

> 💡 **版本选择建议**：
> - 喜欢纯英文界面？继续使用 [v1.1.0](https://github.com/v587d/dsh-opencode-go-usage/releases/tag/v1.1.0)
> - 需要中英双语支持？升级到 v2.0.0+

---
