# Delta: flow-logging

## ADDED Requirements

### Requirement: 日志输出开关

流程日志的 console 输出 SHALL 可通过环境变量 `FLOW_LOG=off` 关闭：关闭时 `logStep` 不产生任何 stdout 输出，但生命周期事件的发射与订阅机制不受影响（其他监听器仍正常接收事件）；未设置或为其他值时行为不变（默认输出）。

#### Scenario: TUI 模式静音

- **WHEN** 以 `FLOW_LOG=off` 启动进程并运行一轮带工具调用的对话
- **THEN** stdout 无 `[agent-flow]` 日志行
- **AND** TUI 自行订阅的生命周期监听器正常收到 `agent_tool_start` 等事件

#### Scenario: 默认行为不变

- **WHEN** 未设置 `FLOW_LOG` 启动 server 或 cli
- **THEN** 流程日志照常输出，与引入开关前一致
