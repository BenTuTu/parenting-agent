# Parenting Wiki Specification

## Purpose

以本地 Markdown 文档（Karpathy 式 LLM wiki）承载科普长文与长尾育儿知识，配套确定性检索与读取工具，作为结构化知识工具之外的补充事实来源。

## Requirements

### Requirement: Wiki 文档格式约定

系统 SHALL 在 `src/data/wiki/` 下以 Markdown 文件维护 wiki 知识库，每篇一个主题，文件头部为 `---` 包裹的 frontmatter，必填字段：`slug`（唯一标识）、`title`、`summary`（一句话摘要）、`topics`（逗号分隔的标签，含同义词）、`minMonth`/`maxMonth`（适用月龄闭区间）；涉及健康安全的主题正文 SHALL 包含"何时就医"章节。

#### Scenario: 合法文档被加载

- **WHEN** `src/data/wiki/` 下存在 frontmatter 完整的 Markdown 文档
- **THEN** 启动时被解析加载，可被检索工具命中

#### Scenario: 坏文档不拖垮启动

- **WHEN** 某篇文档 frontmatter 缺失必填字段或格式错误
- **THEN** 该文档被跳过并输出日志，其余文档正常加载

### Requirement: Wiki 检索工具

系统 SHALL 提供 `search_wiki` 工具，输入关键词（一个或多个）与可选月龄，对文档的 title/summary/topics/正文二级标题做不区分大小写的包含匹配，多关键词按命中数降序排序，月龄提供时按 `[minMonth, maxMonth]` 闭区间过滤；返回命中文档的 slug、title、summary 列表（不含正文），无命中时返回明确提示。

#### Scenario: 关键词命中

- **WHEN** 以关键词"奶嘴"调用（存在安抚奶嘴主题文档）
- **THEN** 返回该文档的 slug、title、summary

#### Scenario: 月龄过滤

- **WHEN** 以关键词与月龄 60 调用，某命中文档适用区间为 [0, 36]
- **THEN** 该文档被过滤，不出现在结果中

#### Scenario: 无命中

- **WHEN** 关键词与任何文档都不匹配
- **THEN** 返回 `{ success: false, error: <无匹配说明> }`，不抛出异常

### Requirement: Wiki 读取工具

系统 SHALL 提供 `read_wiki_page` 工具，输入 slug，返回该文档的 frontmatter 元信息与 Markdown 全文；slug 不存在时返回明确错误信息。

#### Scenario: 按 slug 读取全文

- **WHEN** 以检索结果中的 slug 调用
- **THEN** 返回该文档完整正文与元信息

#### Scenario: slug 不存在

- **WHEN** 以不存在的 slug 调用
- **THEN** 返回 `{ success: false, error: <未找到说明> }`，不抛出异常

### Requirement: 检索与读取的确定性

`search_wiki` 与 `read_wiki_page` SHALL 为确定性纯函数（相同输入返回相同结果，不依赖模型或网络），可脱离 LLM 单元测试。

#### Scenario: 重复调用一致

- **WHEN** 以相同参数重复调用任一 wiki 工具
- **THEN** 返回完全一致的结果
