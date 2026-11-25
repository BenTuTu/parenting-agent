> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 常见问题

## 小芽的回答可以替代医生吗？

不可以。小芽是育儿**科普**助手，帮你理解"这正常吗、可以怎么做、什么时候该去医院"。具体诊断与治疗请咨询儿科医生。

## 为什么有时候它说"暂无精选数据"？

这是刻意的设计。当结构化数据和本地 Wiki 都没有覆盖你的问题时，小芽宁可坦白，也不让模型凭空编造。你可以参考 [扩充 Wiki 知识](/parenting-agent/guide/wiki.md) 补充内容。

## 支持多大的宝宝？

0-8 岁（0-96 个月）。

## 可以换成其他模型吗？

可以，只要服务兼容 OpenAI Chat Completions 协议。修改 `.env` 中的 `OPENAI_BASE_URL` 与 `MODEL_NAME` 即可。

## 聊天记录存在哪里？会上传吗？

会话保存在本地 `.sessions/<id>.jsonl`。除了发送给你配置的模型服务外，不会上传到其他地方；trace 上报也已默认关闭。

## 如何清空宝宝的信息？

- 终端聊天：输入 `/clear`
- HTTP：`DELETE /api/agent/chat/:sessionId`
- 或直接删除 `.sessions/` 下对应的文件
