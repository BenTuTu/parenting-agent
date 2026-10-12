# Proposal: add-parenting-wiki

## Why

当前育儿知识全部硬编码在 TS 数组中（里程碑、6 主题护理指南），结构化但容量有限，长尾问题（幼儿急疹、安抚奶嘴、分床分房等）只能落入"暂无精选数据"。引入本地 Markdown LLM wiki 作为补充知识源：内容维护从改代码变成写文档、便于版本管理与协作，同时延续"事实性知识必须来自工具"的核心原则。

## What Changes

- 新增 `src/data/wiki/` Karpathy 式 Markdown 知识库：每篇一个主题，frontmatter 含 `slug`/`title`/`summary`/`topics`（标签数组）/`minMonth`/`maxMonth`（适用月龄闭区间）；首批手写 4 篇示例（安抚奶嘴使用、幼儿急疹、语言爆发期、分床分房）
- 新增两个确定性工具：`search_wiki`（关键词 + 可选月龄，对 frontmatter 与正文标题做纯关键词/标签匹配，返回 slug+标题+摘要列表）、`read_wiki_page`(按 slug 读取全文）
- 修改 Agent instructions：结构化工具（get_milestones/get_care_guide）未覆盖的问题，先 `search_wiki` 检索，命中则 `read_wiki_page` 读全文后作答；wiki 也未覆盖才声明"暂无精选数据"
- 保持不变：三个现有工具、server/cli/session/logger、对外契约
- 无新增 npm 依赖（frontmatter 用轻量手写解析，不引入 gray-matter）

## Capabilities

### New Capabilities

- `parenting-wiki`: 本地 Markdown wiki 知识库的文档格式约定与两个检索/读取工具

### Modified Capabilities

- `parenting-advisor-agent`: "基于工具的事实性知识获取"需求扩展——加入 wiki 检索兜底链路（结构化工具 → wiki → 声明无数据）

## Impact

- **代码**：新增 `src/data/wiki/*.md`（4 篇）、`src/tools/wiki.ts`（含 frontmatter 解析与两个工具）；更新 `src/tools/index.ts`、`src/agent.ts`（tools 列表与 instructions）
- **Specs**：新增 `parenting-wiki`；delta 修改 `parenting-advisor-agent` 的一条需求
- **测试**：冒烟新增 wiki 链路验证（长尾问题 → search_wiki → read_wiki_page）
- **风险**：关键词检索召回有限（无语义匹配）——MVP 可接受，未来可换嵌入检索而不动工具契约
