> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 扩充 Wiki 知识

想让小芽懂得更多？在 `src/data/wiki/` 下新建一个 Markdown 文件即可，**重启进程后生效**。

## 文件模板

```markdown
---
slug: your-topic
title: 文档标题
summary: 一句话摘要。
topics: 关键词1, 同义词2, 同义词3
minMonth: 0
maxMonth: 96
---

## 正文章节...

## 何时就医
（涉及健康安全的主题必须包含此章节）
```

## Frontmatter 字段

| 字段                      | 说明                            |
| ----------------------- | ----------------------------- |
| `slug`                  | 唯一标识，`read_wiki_page` 按它读取全文  |
| `title`                 | 标题，会出现在回答的来源标注中               |
| `summary`               | 一句话摘要，`search_wiki` 返回给模型用于挑选 |
| `topics`                | 逗号分隔的关键词 / 同义词，决定能否被检索命中      |
| `minMonth` / `maxMonth` | 适用月龄闭区间                       |

## 写作建议

- 📌 **同义词要给足**：家长会说"蛀牙"也会说"龋齿"，都写进 `topics`
- 🩺 **健康类主题必须有「何时就医」章节**
- 📚 内容请参考权威指南（如卫健委、AAP、WHO），并保持通俗易懂
- ✅ 写完运行 `npx tsx test/wiki-test.ts` 检查解析是否正常

当前已收录 0-12 月逐月指南、语言爆发期、安抚奶嘴、幼儿急疹、分离焦虑睡眠、刷牙、4-12 月玩具等主题。
