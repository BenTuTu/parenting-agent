# Agent CLI Specification

## Purpose

提供命令行入口做一次性问答，同样接入会话记忆，便于本地调试与跨进程连续追问。

## Requirements

### Requirement: 一次性问答

CLI SHALL 接收命令行参数拼接为问题运行 Agent（限制 `maxTurns: 6`）并打印最终输出；未提供问题时使用默认问题"分析2026年618天猫渠道的活动表现"。

#### Scenario: 指定问题

- **WHEN** 运行 `pnpm cli "2026-618 京东渠道表现如何？"`
- **THEN** Agent 运行并在 stdout 打印分析结果

#### Scenario: 运行失败

- **WHEN** Agent 执行抛出异常
- **THEN** 打印 `Agent execution failed:` 与错误信息，进程退出码为 1

### Requirement: 会话记忆

CLI SHALL 支持 `--session <id>` 参数（默认 `cli`）：运行前从会话存储加载历史并打印已加载条数，运行后将新历史增量保存。

#### Scenario: 跨进程追问

- **WHEN** 先运行 `pnpm cli --session demo "抖音渠道有数据吗？"`，再运行 `pnpm cli --session demo "那天猫呢？"`
- **THEN** 第二次运行加载第一轮历史
- **AND** Agent 正确理解"那天猫呢"的指代并查询天猫数据
