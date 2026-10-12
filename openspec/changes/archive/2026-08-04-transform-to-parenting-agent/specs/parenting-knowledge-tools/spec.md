# Delta: parenting-knowledge-tools

## ADDED Requirements

### Requirement: 月龄计算工具

系统 SHALL 提供 `calc_age_stage` 工具，输入出生日期（ISO 格式字符串），输出月龄（整数月）与发育阶段标签（如新生儿期/婴儿期/学步期/学龄前/学龄期）；出生日期晚于当前日期或超出 0-8 岁范围时返回明确错误信息而非抛出异常。

#### Scenario: 正常计算

- **WHEN** 输入出生日期为 14 个月前的日期
- **THEN** 返回月龄 14 与对应阶段标签（学步期）

#### Scenario: 超出服务范围

- **WHEN** 输入的出生日期对应年龄超过 8 岁
- **THEN** 返回 `{ success: false, error: <超出 0-8 岁服务范围说明> }`，不抛出异常

### Requirement: 发育里程碑查询工具

系统 SHALL 提供 `get_milestones` 工具，输入月龄（0-96 的整数），按月龄区间命中返回该阶段的发育里程碑，包含大运动、精细动作、语言、社交认知四个维度及该阶段常见红旗信号；月龄超出范围时返回明确错误信息。

#### Scenario: 命中月龄区间

- **WHEN** 以月龄 10 调用
- **THEN** 返回覆盖 10 月龄的区间数据，含四个维度的里程碑列表与红旗信号

#### Scenario: 边界月龄确定性

- **WHEN** 以恰好处于区间边界的月龄调用（如 12）
- **THEN** 按数据层固化的区间闭开规则确定性地命中唯一区间

### Requirement: 护理指南查询工具

系统 SHALL 提供 `get_care_guide` 工具，输入主题（枚举：sleep、feeding、fever-care、toilet-training、kindergarten-anxiety、screen-time）与可选月龄，返回该主题下适用的指南条目（含适用月龄范围、护理要点、红旗信号）；提供月龄时仅返回适用条目，无适用条目时返回明确提示。

#### Scenario: 按主题查询

- **WHEN** 以主题 `fever-care` 与月龄 20 调用
- **THEN** 返回适用于 20 月龄的发烧护理条目，含要点与红旗信号

#### Scenario: 无适用条目

- **WHEN** 查询的主题在给定月龄下无适用条目
- **THEN** 返回 `{ success: false, error: <无适用条目说明> }`，不抛出异常

### Requirement: 精选知识数据集

系统 SHALL 在 `src/data/` 中以类型化 TS 结构维护手写精选知识：发育里程碑按月龄区间组织（区间边界闭开规则以代码注释固化），护理指南按主题组织；所有条目为静态数据，工具查询为确定性纯函数，可脱离 LLM 单元测试。

#### Scenario: 数据被工具确定性消费

- **WHEN** 以相同参数重复调用任一知识工具
- **THEN** 返回完全一致的结果，不依赖模型或网络
