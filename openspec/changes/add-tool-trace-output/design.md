# Design: add-tool-trace-output

## Context

工具调用的原始信息目前有两条通道，都到不了开发者手上：

- **事件流**（活的）：`agent_tool_start` / `agent_tool_end` 带 `details.toolCall`（`callId` / `name` / `arguments`）与 `result: string`。`attachFlowLogging` 消费它打 console 日志，`chat.tsx` 也消费它更新状态行——但状态行用完即弃，且 TUI 以 `FLOW_LOG=off` 启动，console 那条被整体静音（add-chat-tui 的 D2：console.log 会撕碎 Ink 界面）。
- **会话历史**（死的）：`saveHistory` 保存完整 `result.history`，`function_call` / `function_call_result` 一直都在写盘，从未被过滤。被过滤的只是渲染——`replay.ts` 里一行 `name !== ASK_TOOL → return null`。

三个宿主的起点并不一致：cli 未设 `FLOW_LOG`，工具过程已经打在 stdout 上（只是和流式输出交错，格式难看）；server 同样未设，但日志进的是服务端控制台，HTTP 响应里只有 `delta` / `done`；TUI 完全静音。

## Goals / Non-Goals

**Goals:**

- 开发者能在真实交互中看到"调了什么工具、传了什么参数、拿回什么"，不必去翻 `.sessions/*.jsonl`
- 默认不打扰：这是给开发者的，不是给家长的，未开启时输出与现在完全一致
- TUI 的轨迹活过重载：重开同一 session 能看到过去各轮的调用链路
- server 按请求开关，不影响其他客户端、不需重启
- 既有流程日志（`logger.ts`）与 cli 行为零变化

**Non-Goals:**

- `agent-cli` 输出改造（它已有可用的工具过程，只是格式难看；改它等于把 cli 纳入范围）
- 非流式响应携带 `steps`
- 面向家长的"依据/来源"展示——那是另一种产品化表达（人话、无参数、默认开），与本设计的原始轨迹目标冲突，不应混在一个开关里
- `logger.ts` 与既有日志格式的任何变更

## Decisions

### D1: 新建独立的第二条消费通道，不改 `logger.ts`

新轨迹从 `agent_tool_start/end` 另起一条订阅，与 `attachFlowLogging` 并行而非替换。代价是同一份事件被消费两次，但事件发射器本就支持多监听器，且 `chat.tsx` 已经在这么用（状态行的监听器与 logger 的监听器共存），不是新增的架构负担。

备选：扩展 `logger.ts`，让 `logStep` 支持"输出到 UI"的 sink。否——cli 和 server 的服务端日志都靠它，改它就等于把 cli 纳入范围，而 cli 已明确不纳入。

### D2: server 用运行级钩子，不用 Agent 单例钩子

`parentingAgent` 是模块单例。若用 `agent.on('agent_tool_start', ...)` 订阅，**并发请求的工具事件会串流到别的客户端**——A 客户端的 `search_wiki` 会出现在 B 客户端的 SSE 流里。SDK 的 `RunHookEvents` 提供同名的运行级事件（签名多一个 `agent` 参数），作用域限于单次运行，正是需要的隔离粒度。

这条在 TUI 上不成立（单进程单会话，同一时刻只有一次 run），所以 TUI 沿用现有的 Agent 钩子即可；但 server 必须用运行级。

### D3: `--show-tools` 只控渲染，`verbose` 无法只控渲染

两个宿主的开关语义**不对称**，这点不能想当然：

```
  TUI   工具往返一直在写进 .sessions     →  开关只影响渲染
        周一没开 → 周三 --show-tools 重开 → 看得到周一的轨迹

  server 客户端只收得到当时推送的内容      →  开关影响该次请求能拿到什么
        没传 verbose 的那次请求，事后无从补看
```

TUI 因此获得一个实用性质：**事后补开也能回溯过去**。server 没有这个性质，`verbose` 是逐请求且不可追溯的。不要在 spec 里把两者写成同一句话。

### D4: 轨迹记录的口径——参数完整、结果摘要

参数是"模型想干什么"，是调试的关键信号，完整保留。结果则不然：`read_wiki_page` 返回整篇 wiki 正文（数千字），完整打出来会把回答挤出屏幕。

```
  🔧 calc_age_stage  {"birthDate":"2024-11-20"}
     → ageMonths 21 · 学步期（19-24个月）
  🔧 read_wiki_page  {"slug":"pacifier-use"}
     → 4200 字 ·《安抚奶嘴该不该用》
```

结果摘要的具体形态留给实现（通用截断 vs 逐工具 formatter）：通用方案零维护但对 `read_wiki_page` 效果差，逐工具 formatter 好看但每加一个工具多一个维护点（现有 5 个）。倾向默认通用截断、只给 wiki 两个工具定制，但这属实现细节，不写进 spec。

`logger.ts` 现有的 500 字符截断不复用——那是给日志文件的口径，终端消息流要短得多。

### D5: `ask_user_question` 排除在轨迹之外

它已有专属的提问界面与答复气泡渲染。若不排除，开启 `--show-tools` 后一次追问会显示四行：

```
  🔧 ask_user_question {"question":"宝宝多大了？","options":[]}   ← 轨迹
  ? 宝宝多大了？                                                  ← 追问 UI
  ❯ 2024年11月20日                                                ← 答复气泡
  🔧 ask_user_question → {"answer":"2024年11月20日",...}          ← 轨迹
```

问题与答案各重复一遍。排除后追问仍由既有 UI 完整呈现，信息不丢。

这条对 server 同样适用：SSE 的追问在非交互宿主中根本不会发生（`isEnabled` 门控），所以 server 侧是天然排除。

### D6: `replay.ts` 的过滤从二元规则改为策略

现在是写死的 `name !== ASK_TOOL → return null`。这条规则**连续两次被修改**：add-chat-tui 时是"工具往返一律不展示"，add-ask-user-question 给追问开了口子，本次又要为轨迹再开。二元硬规则已经不适配。

改为按"展示策略"决定：始终展示追问（还原为问答气泡）、按开关展示其余工具（还原为轨迹消息）、其余不展示。同一个函数承载三种结果，而不是继续打补丁。

### D7: `{stream:false, verbose:true}` 静默忽略而非报错

`verbose` 只在流式下有意义（非流式响应不携带 `steps`，属 Non-goal）。这个组合是无害的误用，400 掉不友好。字段按"建议性"处理：不流式就忽略。

## Risks / Trade-offs

- [server 用单例钩子会导致并发请求工具事件串流] → D2 运行级钩子；实现时需确认钩子在 run 结束后解绑，避免监听器堆积
- [`read_wiki_page` 等大结果刷屏] → D4 结果摘要；参数完整以保住调试价值
- [工具消息进 Static 后与流式回答的顺序错位] → 工具调用发生在回答之前，天然有序；但并行调用时需靠 `callId` 配对，现有状态行"只显示最后一个工具"的缺陷在持久化后会变得可见
- [`replay.ts` 策略化后，旧会话回放行为改变] → 仅在开启开关时改变；未开启时与当前行为逐条一致，需回归验证
- [同一事件被两条通道消费，未来易不一致] → 接受：轨迹是面向终端的短摘要，日志是面向文件的完整记录，本就不该强求同构
- [SSE 新事件类型冲击既有客户端] → 向后兼容：既有客户端只认 `delta`/`done`，未知字段会被忽略；且默认不推送

## Migration Plan

1. 新增 `src/tool-trace.ts`（采集与格式化，TUI/server 共用），此时无人调用，零影响
2. `replay.ts` 过滤策略化，默认策略与当前行为完全一致（回归验证：不开开关时回放逐条不变）
3. TUI 接入 `--show-tools`（参数解析 + 订阅 + 渲染 + 回放策略）
4. server 接入 `verbose`（运行级钩子 + SSE 事件）
5. 同步 specs，`openspec validate --all`

回滚：三处接入点彼此独立，可单独 revert；`.sessions` 数据格式不变，无迁移。

## Open Questions

- 结果摘要走通用截断还是逐工具 formatter（倾向：默认通用，只给 wiki 两个工具定制）
- 工具消息在 TUI 里的视觉形态：独立 role（需扩 `ROLE_STYLE`，它当前是 `Record<Exclude<role,"user">,…>`）还是复用 `info` role 加前缀
- 运行级钩子的解绑时机：`finally` 里解绑，还是依赖 runner 实例本身的生命周期
