> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 安全边界

关于宝宝的健康，我们宁可多提醒一句。小芽内置了**双保险**安全机制。

## 1. 红旗信号分诊（最高优先级）

红旗规则写在 Agent 指令的最顶部，优先级高于输出模板。以下情况会被直接建议就医：

- 3 月龄内发烧
- 抽搐、惊厥
- 呼吸困难、口唇发青
- 嗜睡难以唤醒、哭声微弱
- ……以及各数据条目中列出的其他红旗信号

## 2. 数据层内嵌红旗

每一条里程碑与护理指南都携带 `redFlags` 字段，随工具结果一同返回，确保模型在回答具体问题时也不会漏掉危险信号。

## 3. 不做医学诊断

- 只提供科普知识与日常护理建议
- 不判断"是什么病"，不推荐处方药物剂量
- 每次回答末尾附带免责声明

:::danger 紧急情况
如遇紧急情况，请立即拨打 **120** 或前往最近的医院急诊，不要等待任何线上回答。
:::
