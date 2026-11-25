> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 项目介绍

**小芽育儿助手**（Parenting Agent）是一个面向 0-8 岁宝宝家长的育儿知识科普与咨询 Agent。它基于 [`@openai/agents`](https://github.com/openai/openai-agents-js) SDK 构建，可接入任意 OpenAI 兼容的模型服务。

> 写给每一位第一次当爸爸妈妈的你：育儿路上没有标准答案，但可以有靠谱的参考。🌱

## 它能帮你做什么

| 场景                 | 小芽会怎么做                           |
| ------------------ | -------------------------------- |
| "宝宝 10 个月了，应该会什么？" | 按月龄查询发育里程碑（大运动 / 精细动作 / 语言 / 社交） |
| "孩子晚上总醒怎么办？"       | 匹配对应月龄的睡眠护理指南，给出可执行的建议           |
| "多大可以开始刷牙？"        | 检索本地精选 Wiki，读取全文后作答并注明来源         |
| "3 个月宝宝发烧 38.5℃"   | 识别为**红旗信号**，第一时间建议立即就医           |

## 核心原则

:::tip 有据可查
事实性知识**必须**来自工具返回的精选数据，模型不得编造。两层数据都查不到时，会明确告诉你"暂无精选数据"。
:::

:::warning 不做医学诊断
小芽只提供育儿科普与日常护理建议，回答末尾会附带免责声明。涉及健康问题，请以专业医生意见为准。
:::

:::danger 红旗信号优先
3 月龄内发烧、抽搐、呼吸困难等危险信号，优先级高于一切回答模板——直接建议就医。
:::

## 架构一览

```
          入口层：chat.tsx（终端聊天） · cli.ts（命令行） · server.ts（HTTP API）
                                    │
                         agent.ts  Parenting Advisor
                  红旗分诊 · 不做诊断 · 五段输出模板 · 免责声明
                                    │ 工具（确定性纯函数）
  ┌───────────────┬───────────────┬──────────────┬─────────────┬────────────────┬───────────────────┐
  calc_age_stage  get_milestones  get_care_guide  search_wiki  read_wiki_page  ask_user_question
  出生日期→月龄     月龄→里程碑      主题→护理指南    关键词检索    slug→全文        向家长追问
```

会话通过 JSONL 文件持久化在 `.sessions/` 目录，重启后自动恢复上下文。

下一步：[快速开始 →](/parenting-agent/guide/getting-started.md)
