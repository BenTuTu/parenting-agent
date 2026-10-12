# Proposal: add-ask-user-question

## Why

Agent 目前的追问只能是"话赶话"：instructions 第 7 条要求缺月龄时先询问，但问出去之后一轮对话就结束了，家长得自己把答案打成一句完整的话再发一遍。育儿咨询恰恰高度依赖前置信息（月龄、症状细节），这种"问一句停一轮"既拖慢节奏，也让答案质量取决于家长的表述能力。

给 Agent 一个能**在同一轮内**向用户提问并拿到答案的工具，把追问从"多轮对话的副作用"变成"一次回答内部的一步"。

## What Changes

- 新增 `ask_user_question` 工具：模型调用后挂起，由宿主界面向用户呈现问题与选项，用户选定后作为工具结果返回，模型在同一次 `run()` 内继续作答
  - 参数：单个问题 + 可选选项列表（单选，无 multiSelect、无批量问题）
  - 界面 SHALL 在选项末尾自动追加"其他，我自己说"逃生口；选项为空时退化为纯自由输入
  - 返回区分受控选项与自由文本（`freeform` 标记），并支持"用户跳过"
- 新增运行上下文契约 `AppContext`：宿主通过 `run(..., { context: { askUser } })` 注入交互能力
- 工具以 `isEnabled` 按 `askUser` 是否存在决定是否下发给模型——**能力注入本身就是场景开关**，未注入的宿主中模型根本看不到该工具
- **MODIFIED** `parenting-advisor-agent`：instructions 改为按运行上下文动态生成，追问规则分"可交互 / 不可交互"两支；新增安全约束——已识别红旗信号时禁止调用该工具
- **MODIFIED** `chat-tui`：运行状态由二态扩展为 `idle / thinking / asking` 三态；新增选项选择界面（复用既有指令 popup 形态）与自由输入子态、两级 Esc 语义；历史回放补充渲染追问往返
- 不改动：`cli.ts`、`server.ts` 不注入交互能力，行为与契约零变化

## Capabilities

### New Capabilities

- `interactive-clarification`: 交互式追问——工具契约、单问题单选 schema、"其他"逃生口、跳过语义、按宿主交互能力的可见性门控

### Modified Capabilities

- `parenting-advisor-agent`: 追问规则按运行上下文条件化；新增"红旗信号下禁止追问"的安全约束
- `chat-tui`: 新增追问交互状态与界面；历史回放覆盖追问往返

## Impact

- **代码**：新增 `src/tools/ask-user-question.ts`、`src/context.ts`（AppContext 类型）；修改 `src/tools/index.ts`、`src/agent.ts`（instructions 函数化 + 注册工具）、`src/chat.tsx`（三态、选项 UI、context 注入、`itemToMessage` 扩展）
- **Specs**：新增 `interactive-clarification`；delta 修改 `parenting-advisor-agent`、`chat-tui`
- **依赖**：无新增依赖，全部基于 `@openai/agents` 既有的 `context` / `isEnabled` / 动态 instructions 能力
- **风险**：挂起式工具引入了外部可中断的等待——Esc 跳过是主要逃生口，必须保证任何情况下 Promise 都会落地，否则 `run()` 永久挂起
- **Non-goals（明确不做）**：`agent-cli` / `chat-api` 启用追问（SSE 单向、一次性执行，需要 `RunState` 持久化才能支持，本次不做）；multiSelect；单轮多问题；红旗症状勾选清单；`calc_age_stage` 接受自然语言时间表达
