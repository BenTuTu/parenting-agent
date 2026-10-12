# Design: add-chat-tui

## Context

现有入口：cli.ts（一次性、流式、--session）、server.ts（JSON/SSE）、smoke。会话与知识加载都在进程启动时完成，一次性 CLI 每问一次付一次启动成本。Ink 是终端里的 React：组件化、状态驱动重绘，但接管终端后与裸 console.log 输出互相干扰——现有 attachFlowLogging 的 console 日志是主要冲突点。

## Goals / Non-Goals

**Goals:**

- 常驻进程的连续对话：历史/wiki 一次加载，多轮追问零启动开销
- 流式回答逐字渲染；工具调用过程从日志升级为 UI 状态（spinner + 工具名）
- 会话能力完整：启动加载历史并展示、每轮增量保存、/clear 清除
- 现有入口（cli/server/smoke）行为与契约零变化

**Non-Goals:**

- 红旗回复的特殊视觉样式（需先设计识别标记，已记 todo 暂缓）
- Markdown 终端渲染（五段模板以纯文本展示）
- 多会话运行时切换、会话列表浏览
- 非 TTY 环境支持（管道/CI 走 cli.ts）

## Decisions

### D1: 已完成消息进 `<Static>`，只有活动区参与重绘

Ink 每次状态变化重绘整棵树，长对话全量重绘会闪烁且丢终端滚动缓冲。`<Static>` 项只输出一次、之后不再管理，天然获得原生滚动体验。活动区仅三样：流式中的回答、状态行、输入框。备选：全量受控渲染+自实现滚动——复杂且体验差，否。

### D2: 生命周期事件直接驱动 UI，console 日志用环境变量关闭

agent 的事件发射器支持多监听器：TUI 挂自己的监听器把 `agent_tool_start/end` 映射为状态行文案。已有的 console.log 监听器通过 `FLOW_LOG=off` 静音（logStep 内部判断，attach 逻辑不动），`pnpm chat` 脚本内置该环境变量。备选：依赖 Ink 的 patchConsole 把日志挪到组件上方——日志与消息流混排，视觉噪音大，否。

### D3: 流式增量用 state 累积，完成后一次性转入 Static

`for await chunk of result.toTextStream()` → `setPartial(p => p + chunk)`；`await result.completed` 后把完整文本 push 进 Static 列表、清空 partial、saveHistory。注意：不能直接复用 cli.ts 的 pipe(process.stdout)——stdout 由 Ink 接管。

### D4: 历史回放只渲染 message 类型

启动时 getHistory 返回的 items 含 function_call/function_call_result，TUI 回放只过滤 `role: user/assistant` 的 message 显示（工具往返对用户无意义），但**完整历史仍原样传给 run**——展示层过滤，数据层不动。

### D5: chat.tsx 独立入口，不动 cli.ts

TUI 依赖 TTY raw mode（useInput），管道/CI 场景必须保留 cli.ts。两个入口共享 agent/session-store，无抽象层——两处调用 run 的样板代码很短，提前抽象不值得。

## Risks / Trade-offs

- [Ink 接管终端后未捕获异常可能留下坏终端状态] → 顶层 try/catch + exit 钩子恢复；错误渲染为红色消息而非抛出
- [CJK 宽字符在部分终端下 Ink 布局计算偏差] → MVP 接受，布局用整行文本流不做精确对齐
- [react/ink 引入约 3MB 依赖] → 仅 chat.tsx import，其他入口不受影响
- [长回答在 Static 转入时可能出现一次跳变] → 接受，属 Ink 已知行为，影响小

## Migration Plan

1. logger.ts 加 FLOW_LOG 开关（对现有入口无行为变化，默认仍输出）
2. 加依赖与 tsconfig jsx → 新增 chat.tsx → package.json 加 `chat` 脚本
3. 验证后同步 specs；回滚 revert 单 commit

## Open Questions

- 输入历史（上下键翻旧输入）要不要 MVP 就做？ink-text-input 不内置，需自维护数组（倾向：做，成本低体验收益大）
