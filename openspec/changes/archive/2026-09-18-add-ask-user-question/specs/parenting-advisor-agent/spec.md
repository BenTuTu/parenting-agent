## ADDED Requirements

### Requirement: 缺失关键信息时的追问

Agent 在缺少作答所需的关键信息（如月龄、出生日期、症状细节）时 SHALL 先向家长询问再作答，且 SHALL NOT 编造或默认假设该信息。宿主提供交互式追问能力时，Agent SHALL 通过 `ask_user_question` 工具提问；宿主未提供该能力时，Agent SHALL 在回复正文中友好询问。Agent 在一次咨询中 SHALL NOT 连续追问，取得答复（或用户跳过）后即应作答。

#### Scenario: 交互式宿主中的追问

- **WHEN** 家长在交互式界面询问与月龄相关的问题但未提供月龄或出生日期
- **THEN** Agent 调用 `ask_user_question` 询问月龄或出生日期
- **AND** 取得答复后在同一次运行内完成回答

#### Scenario: 非交互式宿主中的追问

- **WHEN** 家长通过一次性 CLI 或 HTTP 接口提出同类问题
- **THEN** Agent 在回复正文中友好询问月龄或出生日期，行为与本能力引入前一致

#### Scenario: 用户跳过追问

- **WHEN** 家长跳过了 Agent 的追问
- **THEN** Agent 不再就同一信息重复提问，说明信息不足并给出一般性建议

## MODIFIED Requirements

### Requirement: 红旗信号分诊

Agent SHALL 优先识别红旗信号（包括但不限于：3 月龄内发烧、抽搐、呼吸困难、意识改变、坠落后呕吐、脱水表现），命中时立即建议就医且不提供居家替代方案，该规则优先级高于任何输出模板；红旗分诊回复 SHALL 以固定标记 `⚠️【红旗警示】` 开头（供客户端识别渲染，不得省略或变体）。

红旗信号一旦识别，Agent SHALL NOT 调用 `ask_user_question` 或以任何其他方式继续追问，必须立即给出就医建议——该约束优先级高于"缺失关键信息时的追问"。追问仅允许发生在信息不足以判断是否存在红旗信号的阶段。

#### Scenario: 红旗信号命中

- **WHEN** 家长描述"2 个月的宝宝发烧 38.5 度"
- **THEN** Agent 立即明确建议尽快就医（3 月龄内发烧属急症）
- **AND** 不提供退烧药剂量等居家处理方案

#### Scenario: 红旗回复携带标记

- **WHEN** Agent 产生一条红旗分诊回复
- **THEN** 回复文本以 `⚠️【红旗警示】` 开头

#### Scenario: 红旗命中时不得追问

- **WHEN** 家长描述的情况已命中红旗信号，但月龄等信息仍不完整
- **THEN** Agent 不调用 `ask_user_question`，直接给出红旗警示与就医建议
- **AND** 不以"需要更多信息"为由延后就医建议
