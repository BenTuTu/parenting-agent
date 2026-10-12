# Tasks: add-tool-trace-output

## 1. 轨迹采集与格式化

- [x] 1.1 新增 `src/tool-trace.ts`：定义 `ToolTrace` 记录类型（`callId` / `name` / `arguments` / `resultSummary`），提供由 `agent_tool_start` / `agent_tool_end` 事件参数构造记录的函数；此阶段无人调用，对现有宿主零影响
- [x] 1.2 `src/tool-trace.ts`：结果摘要策略——默认通用截断（口径独立于 `logger.ts` 的 500 字符，终端消息流取更短），对 `read_wiki_page` / `search_wiki` 定制摘要（字数 + 标题 / 命中数）
- [x] 1.3 `src/tool-trace.ts`：导出 `ASK_TOOL` 排除判定，供 TUI 与 server 共用，保证两侧排除口径一致

## 2. 回放策略化

- [x] 2.1 `src/replay.ts`：把写死的 `name !== ASK_TOOL → return null` 改为按展示策略分派（始终展示追问 / 按开关展示其余工具 / 其余不展示），签名增加策略参数并给出与当前行为一致的默认值
- [x] 2.2 回归验证：`test/replay-test.ts` 在默认策略下结果逐条不变；新增开启策略下的用例（其他工具还原为工具消息、追问仍为问答气泡且不重复）

## 3. TUI 接入

- [x] 3.1 `src/chat.tsx`：解析 `--show-tools` 参数（与既有 `--session` 同处），向下传递开关
- [x] 3.2 `src/chat.tsx`：工具消息的消息类型与视觉形态——扩 `ChatMessage["role"]` 并补 `ROLE_STYLE`（它是 `Record<Exclude<role,"user">,…>`，加 role 必须同步补项），或复用既有 role 加前缀，二选一
- [x] 3.3 `src/chat.tsx`：订阅 `agent_tool_start` / `agent_tool_end`，开启时把轨迹 push 进消息流；`ask_user_question` 排除；状态行保持既有行为不被取代
- [x] 3.4 `src/chat.tsx`：启动回放按开关选择策略，使事后补开能看到过去各轮的轨迹
- [x] 3.5 并行调用处理：按 `callId` 配对 start/end，确认多工具并发时不错配（现有状态行"只显示最后一个工具"的缺陷在持久化后会变得可见）

## 4. server 接入

- [x] 4.1 `src/server.ts`：请求体解析可选 `verbose` 布尔字段；非流式携带时静默忽略，不报错
- [x] 4.2 `src/server.ts`：流式分支用**运行级**钩子订阅工具事件（不可用 `parentingAgent.on`——单例订阅会让并发请求串流），在 `finally` 中解绑避免监听器堆积
- [x] 4.3 `src/server.ts`：SSE 推送工具开始/结束两类事件，与 `delta` / `done` 平级，通过 `callId` 关联
- [x] 4.4 验证不传 `verbose` 时 SSE 流内容与改动前逐字节一致

## 5. 验证与 spec 同步

- [x] 5.1 `tsc --noEmit` 通过
- [x] 5.2 TUI 验收：带 `--show-tools` 跑一轮触发多工具的提问，确认工具消息含完整参数、结果为摘要、大结果不刷屏
- [x] 5.3 TUI 验收：不带参数跑一轮，确认输出与改动前一致（对照既有回归）
- [x] 5.4 TUI 验收：先不带参数产生若干轮，再以 `--show-tools` 重开同一 session，确认过去各轮轨迹被回放
- [x] 5.5 TUI 验收：开启后发生一次追问，确认问题与答案各只出现一次、不重复为工具消息
- [x] 5.6 server 验收：`verbose: true` 流式请求收到工具事件；不传时流内容不变
- [x] 5.7 server 验收：两个并发流式请求（一个开一个不开），确认工具事件不串流到另一方
- [x] 5.8 确认 cli 与既有流程日志零变化：`pnpm cli` 输出与 `[agent-flow]` 日志格式同改动前
- [x] 5.9 同步主 specs（新增 `tool-trace`，delta 应用到 `chat-tui`、`chat-api`），`openspec validate --all` 通过
