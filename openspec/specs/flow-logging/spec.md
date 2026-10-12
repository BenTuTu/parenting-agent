# Flow Logging Specification

## Purpose

输出 Agent 运行全流程的结构化日志（生命周期事件 + 请求级耗时），便于观察工具调用链路与排查问题。

## Requirements

### Requirement: 日志输出开关

流程日志的 console 输出 SHALL 可通过环境变量 `FLOW_LOG=off` 关闭：关闭时 `logStep` 不产生任何 stdout 输出，但生命周期事件的发射与订阅机制不受影响（其他监听器仍正常接收事件）；未设置或为其他值时行为不变（默认输出）。

#### Scenario: TUI 模式静音

- **WHEN** 以 `FLOW_LOG=off` 启动进程并运行一轮带工具调用的对话
- **THEN** stdout 无 `[agent-flow]` 日志行
- **AND** TUI 自行订阅的生命周期监听器正常收到 `agent_tool_start` 等事件

#### Scenario: 默认行为不变

- **WHEN** 未设置 `FLOW_LOG` 启动 server 或 cli
- **THEN** 流程日志照常输出，与引入开关前一致

### Requirement: 生命周期事件日志

系统 SHALL 通过 `attachFlowLogging(agent)` 订阅 Agent 生命周期事件并输出日志，覆盖：`agent_start`（含本轮输入条数）、`tool_start`（工具名与参数）、`tool_end`（工具名与结果）、`handoff`（目标 Agent）、`agent_end`（最终输出）。

#### Scenario: 一次带工具调用的运行

- **WHEN** Agent 完成一次调用两个工具的运行
- **THEN** 日志按序输出 agent_start → tool_start/tool_end（get_campaign_data）→ tool_start/tool_end（calculate_campaign_metrics）→ agent_end

### Requirement: 日志格式

每条流程日志 SHALL 以 `[<ISO 时间戳>] [agent-flow] <阶段>` 开头，明细部分以 ` | ` 分隔；明细超过 500 字符时截断并标注原始长度。

#### Scenario: 长输出截断

- **WHEN** agent_end 的最终输出超过 500 字符
- **THEN** 日志明细截断为 500 字符并追加 `…(truncated, <N> chars)`

### Requirement: 请求级运行日志

HTTP 服务 SHALL 为每次对话请求记录 `run_start`（sessionId 与用户消息）、`run_end`（耗时毫秒数与历史条数）；运行失败时记录 `run_error`（sessionId 与错误信息）。

#### Scenario: 一次成功的 API 对话

- **WHEN** `POST /api/agent/chat` 成功完成
- **THEN** 日志包含 `run_start: session=<id>` 与 `run_end: session=<id>`（含 durationMs、historyItems）
