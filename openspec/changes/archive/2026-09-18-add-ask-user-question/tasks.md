# Tasks: add-ask-user-question

## 1. 契约与工具

- [x] 1.1 新增 `src/context.ts`：定义 `AppContext` 类型与 `AskUserRequest` / `AskUserResult`（`{ answer, freeform }` | `{ skipped: true }`），`askUser` 为可选字段
- [x] 1.2 新增 `src/tools/ask-user-question.ts`：zod 参数为 `question: string` + `options: { label, description? }[]`（可为空数组）；`isEnabled` 按 `runContext.context?.askUser` 是否为函数判定；`execute` 透传给 `askUser` 并原样返回其结果；工具描述中明确"用户始终可自由输入，无需自行添加'其他'选项"与"单次只问一个问题"
- [x] 1.3 `src/tools/index.ts` 导出新工具

## 2. Agent 接线

- [x] 2.1 `src/agent.ts`：`Agent<AppContext>` 泛型化，注册 `askUserQuestionTool`
- [x] 2.2 `src/agent.ts`：`instructions` 改为 `(runContext) => string`，抽出追问规则插槽——有 `askUser` 时指向 `ask_user_question`，无时保留现有"在回复中友好询问"的字面表述
- [x] 2.3 `src/agent.ts`：红旗分诊段落增加硬约束——已识别红旗信号时禁止调用 `ask_user_question`，直接给出警示与就医建议
- [x] 2.4 `src/agent.ts`：追问规则中补充——收到 `freeform` 答案时先确认理解再调用下游工具；收到 `skipped` 时不再追问，说明信息不足并给一般性建议；一次咨询最多追问一次
- [x] 2.5 验证非交互路径零漂移：`pnpm smoke`、`pnpm cli`、server 各跑一次，确认工具未出现在请求中且追问行为与改动前一致

## 3. TUI 追问界面

- [x] 3.1 `src/chat.tsx`：运行状态由 `running` 布尔扩展为 `idle | thinking | asking`，`InputBox` 按状态分派渲染
- [x] 3.2 `src/chat.tsx`：实现 `askUser` 回调——返回 Promise，将 `AskUserRequest` 存入 state 进入 `asking`，把 resolver 存在 ref 中；在 `run(..., { context: { askUser } })` 处注入
- [x] 3.3 `src/chat.tsx`：追问界面复用 `CommandPopup` 形态渲染 `{ label, description? }` 列表，末尾自动追加"其他，我自己说"；`options` 为空时直接进入自由输入子态
- [x] 3.4 `src/chat.tsx`：`useInput` 中 `asking` 分支置于最前并吃掉全部按键——上下键仅切换高亮，不触发指令补全与输入历史
- [x] 3.5 `src/chat.tsx`：两级 Esc——自由输入子态 Esc 退回选项层；选项层 Esc `resolve({ skipped: true })` 且不取消当前 run
- [x] 3.6 `src/chat.tsx`：兜底落地——组件卸载与进程退出路径确保 pending resolver 被调用，不留悬挂 Promise
- [x] 3.7 `src/chat.tsx`：卸载时若 run 仍在途则直接结束进程——只 resolve 的话 run 会跑到底并吊住事件循环，Ctrl+C / `/exit` 后终端要等好几分钟（pty 验收发现）

## 4. 历史回放

- [x] 4.1 新增 `src/replay.ts`：把 `itemToMessage` 从 `chat.tsx` 抽为独立模块（`chat.tsx` 导入即渲染 TUI，留在原处无法离线验收），并扩展它识别 name 为 `ask_user_question` 的 `function_call` / `function_call_result`，还原为助手提问气泡 + 用户答复气泡；其余工具往返仍不展示
- [x] 4.2 确认 `<Static>` 的 key 分配在新增消息类型后仍稳定，回放不错位、不重复渲染

## 5. 验证与 spec 同步

- [x] 5.1 `tsc --noEmit` 通过
- [x] 5.2 TUI 手动验收：带选项的追问（上下键选择 + 回车）、无选项的开放式追问（直接自由输入）、"其他"转自由输入、自由输入 Esc 退回、选项层 Esc 跳过后 Agent 正常作答
- [x] 5.3 TUI 手动验收：追问挂起期间退出 TUI，进程正常结束且终端状态正常
- [x] 5.4 红旗约束验收：以"2个月宝宝发烧38.5度"提问，确认 Agent 不发起追问、直接输出红旗警示
- [x] 5.5 重开同一 session 验收追问往返回放；确认其他工具往返仍不展示
- [x] 5.6 同步主 specs（新增 `interactive-clarification`，delta 应用到 `parenting-advisor-agent`、`chat-tui`），`openspec validate --all` 通过
