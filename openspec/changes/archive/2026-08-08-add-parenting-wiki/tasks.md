# Tasks: add-parenting-wiki

## 1. Wiki 内容

- [x] 1.1 创建 `src/data/wiki/` 目录与 4 篇首批文档：`pacifier-use.md`（安抚奶嘴）、`roseola.md`（幼儿急疹）、`language-explosion.md`（语言爆发期）、`sleep-separation.md`（分床分房），每篇含完整 frontmatter（slug/title/summary/topics 含同义词/minMonth/maxMonth）与"何时就医"章节（如适用）

## 2. 解析与工具

- [x] 2.1 创建 `src/tools/wiki.ts`：frontmatter 手写解析 + 启动时全量加载（坏文档跳过并打日志）+ `search_wiki` 工具（关键词包含匹配 title/summary/topics/二级标题，多关键词按命中数排序，可选月龄闭区间过滤，只返回 slug/title/summary）+ `read_wiki_page` 工具（按 slug 返回元信息与全文）
- [x] 2.2 更新 `src/tools/index.ts` 导出两个 wiki 工具

## 3. Agent 接入

- [x] 3.1 更新 `src/agent.ts`：注册 wiki 工具；instructions 增加知识链路（结构化工具优先 → search_wiki 兜底 → read_wiki_page 全文 → 均未命中才声明"暂无精选数据"，wiki 作答需注明来源文档标题）

## 4. 验证与 spec 同步

- [x] 4.1 `tsc --noEmit` 通过；确定性单测式验证：search_wiki 关键词命中/月龄过滤/无命中、read_wiki_page 存在与不存在的 slug
- [x] 4.2 冒烟验证三条链路：wiki 长尾问题（"该不该用安抚奶嘴"→ search+read 后作答并注明来源）、结构化问题仍走原工具（发烧护理不被 wiki 旁路）、两层均未命中（声明暂无精选数据）
- [x] 4.3 同步主 specs（新增 parenting-wiki、更新 parenting-advisor-agent 对应需求），`openspec validate --all` 通过
