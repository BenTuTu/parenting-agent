## MODIFIED Requirements

### Requirement: 对话接口

系统 SHALL 提供 `POST /api/agent/chat`，请求体为 JSON `{ sessionId: string, message: string }`，加载该会话历史后运行 Agent，保存新历史并返回 `{ sessionId, reply }`（reply 为 Agent 最终输出）。

请求体 MAY 携带可选布尔字段 `verbose`（默认 false），用于在流式响应中附带工具调用轨迹。该字段仅在流式模式下生效；非流式请求携带 `verbose` 时 SHALL 被静默忽略而非报错（非流式响应不携带工具轨迹）。

#### Scenario: 正常对话

- **WHEN** POST `{ "sessionId": "s1", "message": "2026-618 京东渠道销售额多少？" }`
- **THEN** 返回 200 与 `{ sessionId: "s1", reply: <分析结果> }`
- **AND** 该轮历史被持久化到会话存储

#### Scenario: 参数缺失

- **WHEN** sessionId 或 message 缺失或不是字符串
- **THEN** 返回 400 与 `{ error: "sessionId and message are required strings" }`

#### Scenario: Agent 运行失败

- **WHEN** Agent 运行抛出异常（如上游模型不可用）
- **THEN** 返回 500 与 `{ error: "Agent run failed" }`，并记录错误日志

#### Scenario: 非流式请求携带 verbose

- **WHEN** POST 请求体含 `verbose: true` 但未设 `stream: true`
- **THEN** 请求正常处理并返回常规非流式响应，不因该字段报错
- **AND** 响应体不包含工具轨迹

## ADDED Requirements

### Requirement: 流式响应的工具轨迹事件

流式响应在请求携带 `verbose: true` 时 SHALL 额外推送工具调用事件，与既有的增量文本事件、结束事件平级；未携带或为 false 时 SHALL NOT 推送任何工具事件，流内容与本能力引入前一致。

工具的开始与结束 SHALL 作为两个独立事件推送，使客户端能够呈现"正在调用"的中间态；两者 SHALL 通过调用标识关联，以便在并行调用时正确配对。

工具事件 SHALL 按单次运行的作用域订阅，SHALL NOT 使用 Agent 单例级别的订阅——Agent 为模块单例，单例级订阅会使并发请求的工具事件互相串流到其他客户端的响应中。

#### Scenario: 开启后推送工具事件

- **WHEN** 以 `stream: true` 且 `verbose: true` 发起请求，且本轮触发了工具调用
- **THEN** 流中出现该工具的开始事件（含工具名与参数）与结束事件（含结果摘要）
- **AND** 增量文本事件与结束事件照常推送

#### Scenario: 默认不推送

- **WHEN** 以 `stream: true` 发起请求且未携带 `verbose`
- **THEN** 流中只有增量文本事件与结束事件，与本能力引入前一致

#### Scenario: 并发请求互不串流

- **WHEN** 两个客户端并发请求，其中仅一个携带 `verbose: true`
- **THEN** 仅该客户端的流中出现工具事件
- **AND** 另一客户端的流中不出现任何工具事件，也不出现对方请求所触发的调用

#### Scenario: 既有客户端兼容

- **WHEN** 只识别增量文本与结束事件的既有客户端发起不带 `verbose` 的流式请求
- **THEN** 其行为与本能力引入前完全一致
