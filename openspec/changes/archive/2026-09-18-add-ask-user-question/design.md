# Design: add-ask-user-question

## Context

现有 5 个工具（`calc_age_stage` / `get_milestones` / `get_care_guide` / `search_wiki` / `read_wiki_page`）都是纯函数：`execute()` 拿到参数即可在本地算出答案，整个 `run()` 是一条直线。`ask_user_question` 打破这一点——它的答案不在进程里，在人脑里，因此必须让 agent loop 挂起并把控制权交给界面。

三个宿主的"人是否可达、是否能阻塞等待"完全不同：`chat.tsx` 是 Ink TUI（有 TTY、可渲染、可接键盘），`cli.ts` 是一次性流式输出，`server.ts` 是 SSE 单向、一个 HTTP 请求内无法回头要输入。本设计只解决 TUI，另外两个宿主明确不启用。

`@openai/agents` 0.14 提供了三项本设计依赖的能力：`run(..., { context })` → `RunContext.context`（`execute` 第二参可取）、工具的 `isEnabled: (args: { runContext, agent }) => boolean`、以及 `Agent.instructions` 支持 `(runContext, agent) => string` 的函数形态。

## Goals / Non-Goals

**Goals:**

- 模型能在同一次 `run()` 内向用户提问并拿到答案，无需用户重新组织一句完整的话
- 追问以结构化选项呈现，同时保留自由输入能力（月龄、出生日期这类无法枚举的信息）
- 工具可见性与宿主交互能力严格一致——不可交互的宿主中模型看不到该工具，prompt 也不提它
- 任何用户操作（选择、自由输入、跳过、退出）都能让挂起的 `run()` 落地，不留悬挂 Promise
- `cli.ts` / `server.ts` / smoke 行为与契约零变化

**Non-Goals:**

- `agent-cli` / `chat-api` 支持追问（需要 `RunState` 序列化与跨请求续跑，另开 change）
- multiSelect、单轮多问题
- 红旗症状勾选清单（需要 multiSelect，依赖上一条）
- `calc_age_stage` 接受自然语言时间表达（"去年五月"）
- 工具对自由文本做任何校验或解析（原样交给模型）

## Decisions

### D1: 阻塞式 `execute()`，宿主通过运行上下文注入 `askUser` 回调

`execute(args, runContext)` 内 `await runContext.context.askUser(args)`，由 TUI 在用户选定后 resolve。整个问答落在同一次 `run()` 里，模型视角是连贯的"调用工具 → 拿到结果 → 继续作答"。

备选一：SDK 原生的 `needsApproval` + `result.interruptions` + `RunState.toString()/fromString()` 中断续跑。它是唯一能支撑 `server.ts` 的路子，但 `approve/reject` 只能表达布尔，唯一的载荷通道是 `reject(item, { message })`——把用户答案塞进"拒绝理由"是语义扭曲。在本 change 只服务 TUI 的前提下，不值得。否。

备选二：工具不阻塞，立即返回，仅作为给 UI 的结构化信号，用户点选后作为下一轮 user 消息发起新的 `run()`。实现最省（`chat.tsx` 已有 `agent_tool_start` 监听器可直接复用），三个宿主通吃，且历史回放天然干净。但它多一次模型往返，且"模型嘴上问的"与"界面上的选项"可能不一致——靠 prompt 约束而非机制保证。否。

### D2: `isEnabled` 复用 `askUser` 的存在性作为场景门控

```
isEnabled: ({ runContext }) => typeof runContext.context?.askUser === 'function'
```

**能力注入本身就是开关**，两者是同一个事实，不会漂移。副作用有两个：

- `execute()` 里 `askUser` 必然存在——工具不可见时模型压根无法发起这个调用，不是"调了会报错"
- `parentingAgent` 可以继续是模块单例，不必为此引入 `createParentingAgent()` 工厂

备选：为交互场景单独构造一个带该工具的 Agent 实例。要么复制 instructions，要么引入工厂 + 参数，而 `chat.tsx` 已经在对单例 `.on()` 挂监听器，再叠一层实例管理得不偿失。否。

### D3: `instructions` 函数化，追问规则按同一判断分支

如果只加工具不改 prompt，`cli.ts` / `server.ts` 会出现"system prompt 指挥模型用一个它看不到的工具"。所以追问规则必须跟着 `askUser` 一起开关：

```
有 askUser  →  「先调用 ask_user_question 询问月龄或出生日期」
无 askUser  →  「先在回复中友好询问孩子月龄或出生日期」（与现状字面等价）
```

同一个 context 字段同时驱动工具可见性与 prompt 分支，只有一个真相来源。实现上倾向抽一条规则做插槽而非整段模板函数化，保持 diff 小、prompt 可读性不受影响。

### D4: 单问题、单选

schema 用 `question: string` 而非 `questions: []`，不支持 multiSelect。理由：

- multiSelect 与"其他"逃生口的组合会引出一堆语义问题（选了两项还能打字吗？打的字是并列还是补充？）
- 本 Agent 的高频追问（问月龄、问主诉）本身就是单选
- 它让 `maxTurns: 6` 的预算算得清：一次追问 1 轮 + 用户答完继续作答 1 轮 = 2 轮，剩 4 轮足够 `search_wiki` + `read_wiki_page` 的往返。若允许批量或连环追问，这个数就得重新审

以后要做红旗症状勾选清单再扩 schema，成本低于现在就背上批量 UI 的复杂度。

### D5: "其他，我自己说"由界面自动追加，且 `options` 为空即退化为纯自由输入

逃生口由 UI 保证而非模型自觉：模型漏加就会把用户锁死在枚举里，属于静默失效。工具描述中明确告知模型"选项之外用户始终可以自由输入，你不需要自己添加'其他'选项"。

由此 `options` 为空时"其他"是唯一选项，界面直接落到自由输入——**一套代码路径覆盖"纯选择 / 选择+兜底 / 纯自由输入"三种形态**，不需要为自由文本另做一套 UI。

界面形态上，选项 `{ label, description? }` 与既有 `SlashCommand { name, hint }` 同构，`CommandPopup` 的渲染与对齐逻辑可直接复用。

### D6: 返回值区分受控选项、自由文本与跳过

```
{ success: true, answer: "4-6个月",     freeform: false }
{ success: true, answer: "去年五月生的", freeform: true  }
{ success: true, skipped: true }
```

扁平的 `{ answer }` 会让模型分不清这是受控选项还是用户随手打的字，而两者可信度差很远：前者可直接喂下游工具，后者是自然语言、可能解析错。`freeform: true` 时 prompt 要求模型先确认理解再往下走，避免把"去年五月"直接猜成某个 ISO 日期塞进 `calc_age_stage`。

### D7: 两级 Esc——保证 Promise 必然落地

`asking` 态含两个子态，Esc 在其中语义不同：

```
选项层  ──选中「其他」──▶ 自由输入层
       ◀────── Esc ──────┘        （退回选项层）

选项层  ── Esc ──▶  resolve({ skipped: true })   （跳过提问，不是取消 run）
```

关键在于**选项层的 Esc 不取消整个 `run()`，而是 resolve 成"用户选择不回答"**。这是"Promise 永不落地 → 进程锁死"这条最危险失败路径的主要堵口；模型收到 `skipped` 后按 prompt 要求不再追问，基于已有信息给一般性建议。

组件卸载 / 进程退出时同样需要兜底落地，但**只 resolve 是不够的**：resolve 之后 `run()` 会继续跑到底并吊住事件循环，用户按 Ctrl+C 或 `/exit` 后终端要等上好几分钟才回来。因此卸载时若仍有 run 在途，必须在 resolve 之后直接结束进程（留一拍给 ink 恢复终端状态）。这一点在实现阶段由 pty 验收发现，已补入实现。

### D8: 历史回放扩展到追问往返（修正 add-chat-tui 的 D4）

已归档的 add-chat-tui 决定"回放只渲染 `role: user/assistant` 的 message，工具往返对用户无意义"。该前提在此失效：追问的问题在 `function_call` 参数里、用户的答案在 `function_call_result` 里，两者都没有 role。沿用旧规则会导致重开会话后整段问答从界面上蒸发（模型看得见，人看不见）。

因此 `itemToMessage` 需要识别 name 为 `ask_user_question` 的 `function_call` / `function_call_result` 并还原成一问一答两个气泡。其余工具的往返仍然不展示——**只对这一个工具开口子**，展示层扩展，数据层不动。

## Risks / Trade-offs

- [挂起的 Promise 未落地 → `run()` 永久挂起、进程无法退出] → D7 两级 Esc 提供主逃生口；组件卸载与进程退出路径额外兜底落地，且卸载时若 run 仍在途需直接结束进程（只 resolve 会让进程多挂好几分钟）
- [用户离开终端不管，问答界面无限期挂着] → 逃生口已覆盖"用户想反悔"的主路径；是否再加工具级 `timeoutMs`（SDK 支持 `timeoutBehavior: 'error_as_result'`）留作 Open Question
- [模型在已识别红旗信号后仍调用该工具追问，延误就医] → **安全项**，写进 spec 而非留给实现：红旗分诊路径下禁止调用该工具，prompt 中作为硬规则
- [自由文本时间表达被模型猜成错误的 ISO 日期] → `freeform` 标记 + prompt 要求先确认；`calc_age_stage` 自身不改（既存问题，本 change 只是更容易触发它）
- [`instructions` 函数化影响所有宿主] → 不可交互分支必须与当前字面等价，用 smoke 与 server/cli 冒烟确认无行为漂移
- [`asking` 态的键盘事件与既有指令 popup、输入历史的 ↑↓ 分支冲突] → `useInput` 中 `asking` 分支置于最前并吃掉全部按键，避免 ↑↓ 漏到历史回溯
- [挂起期间 `toTextStream()` 无 chunk，`partial` 为空] → 行为上正确，但界面完全靠 `asking` 态撑住，不能出现"spinner 空转但无提示"的中间帧

## Migration Plan

1. 新增 `AppContext` 类型与 `ask_user_question` 工具（此时无人注入 `askUser`，`isEnabled` 恒 false，对所有现有宿主零影响）
2. `agent.ts` 注册工具 + `instructions` 函数化，先只验证"不可交互分支"与现状等价（smoke / cli / server 冒烟）
3. `chat.tsx` 注入 `askUser` 并实现 `asking` 三态与选项界面
4. 扩展 `itemToMessage` 覆盖追问往返回放
5. 同步 specs，`openspec validate --all`

回滚：以上为单向增量，revert 后 `isEnabled` 失效路径自然关闭，无数据迁移；已写入 `.sessions` 的追问往返对旧版回放而言只是被过滤掉的工具项，不会导致崩溃。

## Open Questions

- 是否给工具设 `timeoutMs`？有了 Esc 逃生口后必要性下降，倾向暂不设，观察实际使用
- `instructions` 函数化的粒度：整段模板函数化 vs 抽单条规则做插槽（倾向后者，纯代码组织问题，不影响契约）
- 回放时追问往返的气泡角色：倾向"问 = assistant 气泡 / 答 = user 气泡"，需确认 `<Static>` 的 key 稳定性不受影响
