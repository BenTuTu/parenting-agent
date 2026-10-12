# Parenting Agent（0-8 岁育儿科普咨询 Agent）

面向年轻宝爸宝妈的育儿知识科普与咨询 Agent。基于 `@openai/agents` SDK 构建，通过 OpenAI 兼容代理驱动，核心原则：**事实性知识必须来自工具返回的精选数据，模型不得编造**；内置安全边界（红旗信号分诊、不做医学诊断、免责声明）。

> 项目由电商活动分析 Agent 转型而来，演进历史见 `openspec/changes/archive/`。

## 架构

```
                      入口层
  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
  │   cli.ts     │  │    server.ts     │  │ test/smoke.ts│
  │ 流式输出      │  │ Express API      │  │ 单问冒烟      │
  │ --session id │  │ JSON / SSE 流式  │  │              │
  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘
         │      ┌────────────┤                   │
         ▼      ▼            ▼                   ▼
  ┌─────────────────┐   ┌─────────────────────────────┐
  │ sessions/       │   │         agent.ts            │
  │ session-store   │   │  Parenting Advisor          │
  │ JSONL 持久化     │   │  ·红旗分诊（最高优先级）      │
  │ 增量追加/恢复    │   │  ·不做医学诊断               │
  └─────────────────┘   │  ·五段输出模板+免责声明       │
                        └──────────────┬──────────────┘
                                       │ tools（5 个，全部确定性纯函数）
          ┌──────────────┬─────────────┼──────────────┬──────────────┐
          ▼              ▼             ▼              ▼              ▼
   calc_age_stage  get_milestones  get_care_guide  search_wiki  read_wiki_page
   出生日期→月龄    月龄→里程碑     主题→护理指南    关键词检索    slug→全文
          │              │             │              └──────┬───────┘
          │              ▼             ▼                     ▼
          │      data/milestones  data/care-guides    data/wiki/*.md
          │      10 月龄区间×4维   6 主题+红旗信号     LLM wiki（frontmatter）
          │
   ┌──────┴────────────────────────────────────────┐
   │ logger.ts  流程日志：agent/tool 生命周期事件、   │
   │            请求耗时、wiki 加载                  │
   └───────────────────────────────────────────────┘
```

### 知识获取链路（Agent 决策顺序）

1. **红旗信号**（3 月龄内发烧、抽搐、呼吸困难等）→ 立即建议就医，跳过一切模板
2. 已知出生日期/月龄 → `calc_age_stage` 锚定月龄
3. 发育类问题 → `get_milestones`；六大护理主题 → `get_care_guide`
4. 结构化工具未覆盖 → `search_wiki` 检索本地 wiki → 命中则 `read_wiki_page` 读全文作答（注明来源）
5. 两层都未命中 → 明确声明"暂无精选数据"，不假装有数据

## 目录结构

```
parenting-agent/
├── src/
│   ├── agent.ts              # Agent 定义：instructions（安全边界+输出模板）+ 工具注册
│   ├── server.ts             # Express：POST /api/agent/chat（JSON/SSE）、DELETE 清会话
│   ├── cli.ts                # 命令行入口：pnpm cli --session <id> "问题"（流式）
│   ├── logger.ts             # 流程日志：生命周期事件订阅 + logStep
│   ├── tools/                # 5 个工具（zod 参数校验，确定性可单测）
│   │   ├── age-stage.ts      #   calc_age_stage
│   │   ├── milestones.ts     #   get_milestones
│   │   ├── care-guide.ts     #   get_care_guide
│   │   ├── wiki.ts           #   search_wiki + read_wiki_page + frontmatter 解析/加载
│   │   └── index.ts
│   ├── data/
│   │   ├── milestones.ts     # 发育里程碑：10 个月龄闭区间 × 大运动/精细/语言/社交 + 红旗
│   │   ├── care-guides.ts    # 护理指南：sleep/feeding/fever-care/toilet-training/
│   │   │                     #          kindergarten-anxiety/screen-time
│   │   └── wiki/             # LLM wiki：Markdown + frontmatter（slug/title/summary/
│   │                         #          topics 同义词标签/minMonth/maxMonth）
│   └── sessions/
│       └── session-store.ts  # JSONL 会话存储：.sessions/<id>.jsonl，增量追加、跨重启恢复
├── test/
│   ├── smoke.ts              # 冒烟：pnpm smoke "问题"（真实 LLM 调用）
│   ├── wiki-test.ts          # wiki 工具确定性断言（不依赖 LLM）
│   └── api.http              # curl 用例集（含 SSE 流式测试）
├── openspec/
│   ├── specs/                # 6 个能力的主 spec（需求+场景，SHALL 语句）
│   └── changes/archive/      # 已归档的变更（proposal/design/specs/tasks 全套）
├── .sessions/                # 会话 JSONL（gitignored）
└── .env                      # OPENAI_API_KEY / OPENAI_BASE_URL / MODEL_NAME / PORT
```

## 快速开始

```bash
pnpm install

# .env 配置（OpenAI 兼容代理）
# OPENAI_API_KEY=...
# OPENAI_BASE_URL=https://your-proxy.example.com/v1
# MODEL_NAME=gpt-5.6-sol
# PORT=3000

pnpm cli "宝宝8个月，长了两颗牙，多大可以开始刷牙？"   # 命令行（流式）
pnpm cli --session demo "我家女儿出生日期是2025-01-10"  # 带会话记忆
pnpm dev                                              # 启动 HTTP 服务
pnpm smoke "10个月宝宝应该会什么？"                     # 冒烟测试
npx tsx test/wiki-test.ts                             # wiki 工具单测（无 LLM）
```

## HTTP API

```bash
# 非流式：返回 { sessionId, reply }
curl -X POST localhost:3000/api/agent/chat -H "Content-Type: application/json" \
  -d '{"sessionId":"u1","message":"宝宝发烧38.2度怎么办？"}'

# 流式（SSE）：请求体加 "stream": true，-N 关闭 curl 缓冲
# 增量 data: {"delta":"..."}  结束 data: {"done":true,"sessionId":"u1"}
curl -N -X POST localhost:3000/api/agent/chat -H "Content-Type: application/json" \
  -d '{"sessionId":"u1","message":"该不该用安抚奶嘴？","stream":true}'

# 清除会话
curl -X DELETE localhost:3000/api/agent/chat/u1
```

更多用例见 `test/api.http`。

## 关键设计

- **工具确定性**：5 个工具都是纯函数（相同输入→相同输出，不依赖网络），可脱离 LLM 单测；模型需要旧数据时重新调用即可，成本为零
- **wiki 两段式检索**：`search_wiki` 只返回 slug+标题+摘要（目录），模型选定后 `read_wiki_page` 才取全文——控制单次上下文注入体积
- **会话持久化**：每会话一个 JSONL 文件，每行一个 `AgentInputItem`，`saveHistory` 按行数增量追加（幂等）；重启后 `getHistory` 全量恢复
- **安全双保险**：红旗规则写在 instructions 顶部（优先级高于输出模板）+ 数据层每个条目内嵌 `redFlags` 字段随工具返回
- **模型接入**：`setOpenAIAPI("chat_completions")` 走兼容代理，`setTracingDisabled(true)` 关闭向 OpenAI 官方上传 trace（代理 key 会 401）

## 开发流程（OpenSpec）

项目采用 spec-driven 流程：`/opsx:explore` 调研 → `/opsx:propose` 生成 proposal/design/specs/tasks → `/opsx:apply` 按任务实现 → `/opsx:archive` 同步主 spec 并归档。当前 6 个能力 spec 见 `openspec/specs/`，历史决策（为什么这样设计）见各归档 change 的 `design.md`。

## 新增 wiki 知识

在 `src/data/wiki/` 下新建 Markdown 文件即可（重启进程生效）：

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

frontmatter 的 `topics` 请写全同义词（检索是关键词匹配，不做语义召回）；缺失必填字段的文档会被跳过并打日志，不影响启动。
