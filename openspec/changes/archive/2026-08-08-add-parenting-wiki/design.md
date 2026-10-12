# Design: add-parenting-wiki

## Context

Agent 现有知识源为两个结构化 TS 数据集（milestones/care-guides），由确定性工具消费，spec 固化了"工具未覆盖必须声明暂无数据"。本 change 在不动结构化链路的前提下，加一层本地 Markdown wiki 作为长尾知识兜底。归档的 transform-to-parenting-agent change 已把"数据未覆盖"场景写入主 spec，本次对该需求做 MODIFIED。

## Goals / Non-Goals

**Goals:**

- 长尾科普知识以 Markdown 文档维护于 `src/data/wiki/`，Agent 可检索并引用
- 检索与读取为确定性纯函数，可脱离 LLM 单测
- 知识获取优先级链路清晰：结构化工具 → wiki → 声明无数据

**Non-Goals:**

- 不做嵌入/向量检索（关键词+标签匹配够 MVP；工具契约不变的前提下未来可替换实现）
- 不迁移现有 milestones/care-guides 到 wiki（结构化数据保持结构化）
- 不做 wiki 的运行时热更新监听（进程启动时加载即可）
- 不接飞书知识库同步

## Decisions

### D1: frontmatter 手写解析，不引入依赖

格式约定收紧为"`---` 包裹的简单 `key: value`，topics 用逗号分隔字符串"，十几行解析代码即可覆盖。理由：避免为 4 篇文档引入 gray-matter/yaml 依赖。备选：引入 gray-matter——被否，格式受我们自己控制，无需完整 YAML。

### D2: 启动时全量加载进内存

模块加载时读取 `src/data/wiki/*.md` 解析为 `WikiPage[]` 缓存。理由：文档量小（<百篇），全量内存最简单；检索是数组过滤。备选：每次查询扫盘——无必要的 IO。

### D3: 检索算法为关键词包含 + 标签命中 + 月龄过滤

`search_wiki(keywords, ageMonths?)`：对每篇文档，在 title/summary/topics/正文 `## ` 标题中做不区分大小写的包含匹配；多关键词按命中数排序；ageMonths 提供时过滤 `[minMonth, maxMonth]` 闭区间（沿用 milestones 的区间语义）。只返回 slug/title/summary，不返回正文——引导模型走 read_wiki_page，控制单次工具返回体积。

### D4: Agent 链路为"结构化优先、wiki 兜底"

instructions 中明确：发育/六大主题护理问题仍走结构化工具；其余育儿问题先 search_wiki；命中后 read_wiki_page 取全文再作答并注明来源标题；两层都未命中才说"暂无精选数据"。理由：结构化数据字段（红旗信号等）是安全兜底，不能被自由文本旁路。

### D5: wiki 文档正文自带"何时就医"章节约定

每篇 wiki 文档正文约定包含 `## 何时就医` 章节（如适用），使红旗信息随全文返回。理由：与结构化条目的 redFlags 字段对齐，保证安全信息不因知识源不同而缺失。

## Risks / Trade-offs

- [关键词检索召回不足，同义词打不中] → frontmatter 的 topics 标签要求作者写全同义词（如"安抚奶嘴, 奶嘴, 吸吮"）；未命中时 Agent 声明无数据而非硬答
- [模型跳过 search 直接自由发挥] → instructions 保持"事实性知识必须来自工具"的 SHALL 措辞，冒烟用例覆盖 wiki 链路
- [文档 frontmatter 写错导致解析失败] → 解析失败的文件跳过并打日志，不让单篇坏文档拖垮启动
- [tsc 不会把 .md 拷贝到 dist] → 运行时按源码目录定位 wiki（tsx 场景）；build 产物场景在 package.json 加拷贝步骤或用 import.meta 相对定位，MVP 先支持 tsx 运行方式

## Migration Plan

1. 新增 wiki 文档 + 解析/工具（增量，无破坏）
2. 更新 agent instructions 与工具注册
3. 冒烟验证后同步 specs
4. 回滚：revert 单 commit

## Open Questions

- 首批 4 篇之后的内容生产节奏与作者（暂定按用户反馈的高频未命中问题补写）
