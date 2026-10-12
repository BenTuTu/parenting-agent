# Delta: parenting-advisor-agent

## MODIFIED Requirements

### Requirement: 基于工具的事实性知识获取

Agent 回答涉及发育里程碑或护理要点时 SHALL 调用工具获取数据：已知出生日期或月龄先调用 `calc_age_stage` 锚定月龄，发育问题调用 `get_milestones`，六大护理主题问题调用 `get_care_guide`；结构化工具未覆盖的育儿问题 SHALL 先调用 `search_wiki` 检索本地 wiki，命中后调用 `read_wiki_page` 读取全文并基于其内容作答（注明来源文档标题）；不得编造月龄标准、发育指标或护理建议。

#### Scenario: 发育咨询

- **WHEN** 家长询问"10 个月的宝宝应该会什么"
- **THEN** Agent 调用 `get_milestones` 获取对应月龄区间数据后作答

#### Scenario: 长尾问题走 wiki 兜底

- **WHEN** 家长询问结构化工具未覆盖、但 wiki 有对应文档的问题（如"宝宝该不该用安抚奶嘴"）
- **THEN** Agent 调用 `search_wiki` 检索命中
- **AND** 调用 `read_wiki_page` 读取全文后基于文档内容作答，并注明来源文档标题

#### Scenario: 数据未覆盖

- **WHEN** 家长的问题超出结构化数据且 `search_wiki` 无命中
- **THEN** Agent 明确说明该问题暂无精选数据，仅给出一般性建议并推荐咨询儿科医生，不假装有数据
