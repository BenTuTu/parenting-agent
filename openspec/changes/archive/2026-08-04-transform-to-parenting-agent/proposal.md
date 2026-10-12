# Proposal: transform-to-parenting-agent

## Why

当前项目是一个电商活动分析 Agent 的骨架验证（demo 数据、单一活动），业务价值已验证完毕。现希望将其转型为面向年轻宝爸宝妈的 0-8 岁育儿知识科普与咨询 Agent——这是一个真实、高频、强多轮的咨询场景，能充分复用已验证的骨架（会话持久化、流程日志、多入口），同时对"事实性内容必须来自工具、不许模型编造"的核心原则提出更高要求（涉及儿童健康安全）。

## What Changes

- **BREAKING** 替换 Agent 人设与指令：从"电商活动分析师"改为"0-8 岁育儿科普顾问"，包含安全边界（红旗信号立即建议就医、不做医学诊断、免责声明）与家长友好的输出模板（直接回答/月龄对照/具体建议/何时就医/温馨提示）
- **BREAKING** 替换工具集：移除 `get_campaign_data`、`calculate_campaign_metrics`；新增 `calc_age_stage`（出生日期→月龄→发育阶段）、`get_milestones`（按月龄查发育里程碑）、`get_care_guide`（按主题查育儿护理指南）
- **BREAKING** 替换数据集：移除 `campaigns.ts`；新增手写精选的发育里程碑数据（WHO/卫健委口径）与常见护理主题知识条目（睡眠/辅食/发烧护理/如厕训练/入园焦虑等）
- 保持不变：server（HTTP API）、cli、session-store（JSONL 持久化）、logger（流程日志）、模型代理配置（stepfun proxy + chat_completions + tracing 关闭）

## Capabilities

### New Capabilities

- `parenting-advisor-agent`: 育儿咨询 Agent 行为——工具优先获取事实性知识、安全边界（红旗信号分诊、不做诊断）、家长友好输出模板与语气
- `parenting-knowledge-tools`: 三个函数工具（calc_age_stage / get_milestones / get_care_guide）与手写精选知识数据集

### Modified Capabilities

（无——session-persistence、chat-api、agent-cli、flow-logging 四个能力的需求不变）

### Removed Capabilities

- `campaign-analysis-agent`: 电商活动分析 Agent 行为，整体移除
- `campaign-data-tools`: 电商活动数据工具与数据集，整体移除

## Impact

- **代码**：重写 `src/agent.ts`（instructions/name）、`src/tools/*`（3 个新工具）、`src/data/*`（新知识数据）；`src/server.ts`、`src/cli.ts`、`src/sessions/`、`src/logger.ts` 不动（API 路径 `/api/agent/chat` 保持）
- **Specs**：删除 `openspec/specs/campaign-analysis-agent`、`openspec/specs/campaign-data-tools`；新增两个育儿能力 spec
- **测试**：`test/smoke.ts` 默认问题改为育儿场景；`test/api.http` 示例更新
- **依赖/接口**：无新增依赖；HTTP API 与 CLI 的对外契约不变
- **风险**：育儿内容涉及健康安全，红旗信号清单与免责声明为硬性要求，需在 spec 中以 SHALL 固化
