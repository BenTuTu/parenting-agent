# Design: transform-to-parenting-agent

## Context

现有项目是基于 `@openai/agents` 的电商活动分析 Agent，架构分层清晰：入口层（server/cli/smoke）→ Agent 层（instructions + tools）→ 数据层（静态 TS 数组）→ 基础设施（JSONL 会话存储、流程日志、模型代理配置）。骨架经过端到端验证（多轮记忆、跨重启恢复、工具链路日志）。本次转型只替换"域相关"三件：instructions、tools、data；"域无关"骨架全部保留。

## Goals / Non-Goals

**Goals:**

- 面向 0-8 岁孩子的年轻父母，提供发育里程碑科普与常见护理问题咨询
- 事实性知识（里程碑、护理要点）必须来自工具返回的精选数据，模型不得编造
- 安全边界作为硬性要求：红旗信号分诊、不做医学诊断、每次回答附免责声明
- 对外契约（HTTP API 路径、CLI 用法、会话存储格式）保持不变

**Non-Goals:**

- 不做 RAG / 外部知识库接入（数据为手写精选 TS 数组，与原 campaigns.ts 同构）
- 不做结构化"孩子档案"存储（仍靠对话历史记忆月龄等信息，档案双轨是后续迭代）
- 不做疫苗时间表与生长曲线百分位计算（数据维护成本高，MVP 之外）
- 不覆盖 8 岁以上、孕期、备孕场景

## Decisions

### D1: 工具三件套，链路与原两步同构

`calc_age_stage`（纯计算：出生日期→月龄→阶段标签）→ `get_milestones`（按月龄命中区间）→ `get_care_guide`（按主题枚举查条目）。理由：与原"查数据→算指标"链路同构，Agent 编排负担低；三个工具都是确定性函数，可单测。备选：单个大而全的 `search_knowledge` 工具——被否，参数模糊导致模型调用不稳定，且失去"月龄先行"的强约束。

### D2: 数据以月龄区间为主键

里程碑数据按月龄区间组织（如 0-3、4-6、7-9、10-12、13-18、19-24、25-36、37-48 月、4-6 岁、6-8 岁），每区间含大运动/精细动作/语言/社交认知四维；护理指南按主题枚举（sleep/feeding/fever-care/toilet-training/kindergarten-anxiety 等），每条目含适用月龄范围、要点、红旗信号。理由：家长问题几乎都锚定月龄，区间主键让 `get_milestones` 的命中逻辑退化为范围查找。

### D3: 安全边界写进 instructions 而非代码层

红旗信号清单（3 月龄内发烧、抽搐、呼吸困难、意识改变、坠落后呕吐等）与"不诊断、建议就医"规则以 SHALL 写入 spec 并落在 instructions 顶部（优先级高于输出模板）。理由：MVP 阶段模型层守规即可，代码级关键词拦截误伤率高；护理指南条目内嵌红旗信号字段，让工具返回也携带安全信息，双保险。备选：独立的 guardrail 中间件——留作后续迭代。

### D4: 旧能力 spec 整体 REMOVED，新能力 ADDED

不复用 `campaign-*` spec 做 MODIFIED——领域完全不同，逐条 MODIFIED 会产生无意义的映射。session-persistence / chat-api / agent-cli / flow-logging 四个 spec 零改动。

### D5: 平滑替换，不改文件布局

`src/tools/`、`src/data/` 目录结构保持，文件更名（campaign-data.ts → knowledge tools 对应文件）；`agent.ts` 导出名 `ecommerceAgent` 改为 `parentingAgent`，server/cli/smoke 同步改 import。理由：diff 最小、spec 与代码结构一一对应。

## Risks / Trade-offs

- [育儿内容有医学风险，模型可能越界给诊断] → instructions 顶部硬规则 + 工具条目内嵌红旗信号 + 免责声明模板化；spec 场景覆盖"疑似诊断请求"与"红旗信号"两类测试
- [手写知识数据量小，覆盖不了长尾问题] → instructions 要求"数据未覆盖时明确说明并给一般性建议+建议咨询儿科医生"，禁止假装有数据
- [月龄区间划分粗，边界月龄（如恰好 12 月）归属易混] → 区间闭开规则在数据层注释固化，工具对边界值有确定性行为并写入单测
- [旧会话文件（电商对话）与新 Agent 混用] → 会话格式兼容（都是 AgentInputItem），旧历史只是话题无关，不影响运行；演示时用新 sessionId 即可

## Migration Plan

1. 新增 data + tools（新旧并存，编译通过）
2. 重写 agent.ts，切换工具与 instructions
3. 更新 server/cli/smoke 的 import 与默认问题
4. 删除旧 tools/data 文件
5. 同步 specs（REMOVED + ADDED）并 `openspec validate`
6. 回滚策略：单 commit revert 即可（无数据迁移、无 schema 变更）

## Open Questions

- 护理指南主题的首批清单定多少条合适？（当前按 6 个主题起步：睡眠、辅食/喂养、发烧护理、如厕训练、入园焦虑、屏幕时间）
- 免责声明是每条回答都带，还是每个会话首条带？（当前决定：每条都带，放"温馨提示"末尾一行）
