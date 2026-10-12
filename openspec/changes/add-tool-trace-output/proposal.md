# Proposal: add-tool-trace-output

## Why

Agent 调了哪些工具、传了什么参数、拿回什么结果，目前只存在于两个开发者够不着的地方：TUI 里被 `FLOW_LOG=off` 整体静音（当初为了不打花 Ink 界面），server 里只进服务端控制台、HTTP 响应里没有。排查"它为什么答成这样"时，只能去翻 `.sessions/*.jsonl` 原始 JSON。

把工具调用轨迹作为一等内容送进消息流与 SSE，让开发者在真实交互中直接看到调用链路。面向开发者而非家长，因此默认关闭。

## What Changes

- TUI 新增 `--show-tools` 参数（默认关）：开启后每次工具调用 SHALL 作为独立消息进入对话流，含工具名、完整参数与结果摘要
  - 工具消息 SHALL 进入静态消息区并参与历史回放——重开同一 session 时，过去各轮的调用轨迹一并重现
  - 开关只控制**渲染**，不控制存储：工具往返本就完整保存在会话历史里，因此未开启时产生的记录，事后加 `--show-tools` 重开仍可查看
  - `ask_user_question` 已有专属的提问/答复渲染，SHALL NOT 再输出工具消息，避免同一次追问重复四行
- chat-api 新增请求字段 `verbose`（默认 false，仅流式生效）：为 true 时 SSE 流中 SHALL 额外推送工具事件，与既有 `delta` / `done` 平级；start 与 end 分开推送，使客户端能呈现"正在调用"
  - 与 `stream` 同构，按请求生效：调试客户端想看就看，不影响其他客户端，也无需重启服务
  - 事件 SHALL 按运行级钩子订阅而非 Agent 单例钩子——Agent 是模块单例，用单例钩子会让并发请求的工具事件串流到别的客户端
- **不改** `logger.ts` 与 `attachFlowLogging`：新轨迹是独立于既有 console 日志的第二条消费通道（事件发射器本就支持多监听器，TUI 已在这么用）
- **不纳入** `agent-cli`：它当前未设 `FLOW_LOG`，工具过程已通过既有流程日志打在 stdout 上，行为保持原样

## Capabilities

### New Capabilities

- `tool-trace`: 工具调用轨迹的对外呈现——采集口径（名称/参数/结果摘要）、截断策略、默认关闭与逐宿主的开启方式、`ask_user_question` 的排除规则

### Modified Capabilities

- `chat-tui`: 新增 `--show-tools` 参数与工具消息渲染；「历史加载与持久化」放开为按策略展示工具往返（原文写死"其余工具的调用往返不展示"）；「流式渲染与工具状态可视化」补充开启后状态行与持久工具消息的关系
- `chat-api`: 对话接口新增可选 `verbose` 字段；流式响应新增工具事件类型

## Impact

- **代码**：新增 `src/tool-trace.ts`（事件 → 轨迹记录的采集与格式化，供 TUI 与 server 共用）；修改 `src/chat.tsx`（参数解析、工具消息渲染、订阅改造）、`src/replay.ts`（放开过滤为策略）、`src/server.ts`（`verbose` 字段、运行级钩子、SSE 工具事件）
- **Specs**：新增 `tool-trace`；delta 修改 `chat-tui`、`chat-api`
- **依赖**：无新增，全部基于 `@openai/agents` 既有的生命周期钩子
- **契约影响**：SSE 新增事件类型属向后兼容（既有客户端只认 `delta`/`done`，会忽略未知字段）；`verbose` 为可选字段，不传时行为与现在完全一致
- **风险**：`read_wiki_page` 返回整篇 wiki 正文（数千字），结果必须摘要而非全量，否则会把回答挤出屏幕
- **Non-goals（明确不做）**：`agent-cli` 的输出改造；非流式响应携带 `steps`；面向家长的"依据/来源"展示（属另一种产品化表达，与开发者视角的原始轨迹目标不同）；`logger.ts` 与既有流程日志格式的任何变更
