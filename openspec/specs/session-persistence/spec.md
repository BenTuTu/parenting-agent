# Session Persistence Specification

## Purpose

以 JSONL 文件将会话历史持久化到本地磁盘，使多轮对话上下文可跨进程、跨重启恢复（与 OpenClaw 等 Agent 的本地会话存储方式一致）。

## Requirements

### Requirement: JSONL 文件存储

系统 SHALL 将每个会话存储为一个 JSONL 文件（`<sessionId>.jsonl`），每行为一个 JSON 序列化的 `AgentInputItem`。存储目录默认为项目根下的 `.sessions/`，可通过环境变量 `SESSIONS_DIR` 覆盖，且该目录不纳入版本控制。

#### Scenario: 首次保存会话

- **WHEN** 对新 sessionId 调用 `saveHistory`
- **THEN** 自动创建存储目录并写入 `<sessionId>.jsonl`，每条历史一行

### Requirement: 增量追加写入

`saveHistory` SHALL 仅追加相对于文件现有行数的新增历史条目（append-only），重复调用同一份历史不产生重复行（幂等）。

#### Scenario: 多轮对话追加

- **WHEN** 一个已有 6 行历史的会话完成新一轮对话（新增 2 条）
- **THEN** 文件追加 2 行，总行数为 8

### Requirement: 历史恢复

`getHistory` SHALL 从对应 JSONL 文件读取并反序列化完整历史；文件不存在时返回空数组。

#### Scenario: 跨重启恢复上下文

- **WHEN** 服务重启后同一 sessionId 发起追问（如"那它比基准增长了多少"）
- **THEN** 历史从文件完整恢复，Agent 能正确理解指代

### Requirement: 会话标识校验

sessionId SHALL 匹配 `^[\w.-]{1,128}$`，否则拒绝操作（抛出错误），防止路径穿越。

#### Scenario: 非法 sessionId

- **WHEN** sessionId 包含 `/` 或 `..` 等路径字符
- **THEN** 存储层抛出 `Invalid sessionId` 错误，不产生文件操作

### Requirement: 会话管理操作

系统 SHALL 支持 `clearSession`（删除会话文件，不存在时静默成功）与 `listSessions`（列出所有已存在的会话 ID）。

#### Scenario: 清除会话

- **WHEN** 调用 `clearSession(sessionId)`
- **THEN** 对应 JSONL 文件被删除，后续 `getHistory` 返回空数组
