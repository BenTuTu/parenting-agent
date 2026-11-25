# 工具与知识来源

小芽的所有事实性知识都来自**确定性工具**——相同输入永远得到相同输出，不联网、可单测。

## 工具清单

| 工具 | 作用 | 数据来源 |
| --- | --- | --- |
| `calc_age_stage` | 出生日期 → 月龄 / 阶段 | 计算 |
| `get_milestones` | 月龄 → 发育里程碑 | `src/data/milestones.ts` |
| `get_care_guide` | 主题 + 月龄 → 护理指南 | `src/data/care-guides.ts` |
| `search_wiki` | 关键词 → 相关文章目录 | `src/data/wiki/*.md` |
| `read_wiki_page` | slug → 文章全文 | `src/data/wiki/*.md` |
| `ask_user_question` | 向家长追问缺失信息 | 交互 |

## 发育里程碑

覆盖 0-96 个月，划分为 10 个**不重叠、连续**的闭区间：

`0-3` · `4-6` · `7-9` · `10-12` · `13-18` · `19-24` · `25-36` · `37-48` · `49-72` · `73-96` 月

每个区间包含 **大运动、精细动作、语言、社交情绪** 四个维度，以及该阶段的红旗信号。

## 护理指南主题

| 主题 key | 内容 |
| --- | --- |
| `sleep` | 睡眠 🌙 |
| `feeding` | 喂养 🍼 |
| `fever-care` | 发烧护理 🌡️ |
| `toilet-training` | 如厕训练 🚽 |
| `kindergarten-anxiety` | 入园焦虑 🎒 |
| `screen-time` | 屏幕时间 📱 |

## Agent 决策顺序

1. **红旗信号** → 立即建议就医，跳过一切模板
2. 已知出生日期 / 月龄 → `calc_age_stage` 锚定月龄
3. 发育类问题 → `get_milestones`；六大主题 → `get_care_guide`
4. 结构化数据未覆盖 → `search_wiki` → 命中后 `read_wiki_page` 读全文作答（注明来源）
5. 都没命中 → 明确声明"暂无精选数据"

:::tip 两段式检索
`search_wiki` 只返回 slug、标题、摘要；模型选定后才用 `read_wiki_page` 读取全文，从而控制每次注入上下文的体积。
:::
