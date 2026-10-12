# Proposal: add-chat-tui

## Why

当前 CLI 是一次性问答：每问一个问题都要重启进程、重新加载历史和 wiki，连续咨询体验割裂。育儿咨询天然是多轮对话（先问月龄、再追问细节），需要一个常驻的交互式对话界面。用 Ink（终端里的 React）实现 TUI，还能把现在只能打日志的工具调用过程升级为可视化状态。

## What Changes

- 新增 `src/chat.tsx`：基于 ink + react 的常驻对话 TUI
  - 历史消息用 `Static` 渲染（防闪烁、保留终端滚动缓冲），启动时从会话存储加载并展示
  - 流式回答逐字渲染；工具调用过程通过订阅 agent 生命周期事件显示为状态行（spinner + 工具名）
  - 输入框支持持续提问（运行中禁用）；`/exit` 退出、`/clear` 清除当前会话
  - `--session <id>` 参数（默认 `cli`），每轮结束后增量保存历史
- **MODIFIED** flow-logging：新增 `FLOW_LOG=off` 环境变量开关，关闭 console 日志输出（TUI 模式必需，否则打花界面；事件监听机制不变，TUI 自挂监听器渲染为 UI）
- 新增依赖：`ink`、`react`、`ink-text-input`、`ink-spinner`；tsconfig 增加 `"jsx": "react-jsx"`
- 保持不变：`cli.ts`（脚本化入口，TUI 依赖 TTY raw mode 无法覆盖管道/CI 场景）、smoke、server、session-store

## Capabilities

### New Capabilities

- `chat-tui`: Ink 交互式对话界面——常驻会话、流式渲染、工具状态可视化、会话命令

### Modified Capabilities

- `flow-logging`: 新增需求——console 日志可通过 `FLOW_LOG=off` 关闭，事件订阅机制不受影响

## Impact

- **代码**：新增 `src/chat.tsx`；修改 `src/logger.ts`（logStep 尊重 FLOW_LOG 开关）；`package.json` 加依赖与 `chat` 脚本；`tsconfig.json` 加 jsx 选项
- **Specs**：新增 `chat-tui`；delta 修改 `flow-logging`
- **依赖**：首次引入 UI 运行时依赖（ink/react），仅 TUI 入口 import，不影响 server/cli 体积与启动
- **Non-goals（明确不做）**：多会话切换（`/session` 命令）；红旗样式与 Markdown 渲染已在本 change 后续迭代中追加实现
