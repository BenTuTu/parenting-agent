# Tasks: transform-to-parenting-agent

## 1. 知识数据层

- [x] 1.1 创建 `src/data/milestones.ts`：按月龄区间（0-3/4-6/7-9/10-12/13-18/19-24/25-36/37-48/49-72/73-96 月）维护发育里程碑，每区间含大运动/精细动作/语言/社交认知四维与红旗信号，注释固化区间闭开规则
- [x] 1.2 创建 `src/data/care-guides.ts`：6 个主题（sleep/feeding/fever-care/toilet-training/kindergarten-anxiety/screen-time）的护理指南条目，每条含适用月龄范围、要点、红旗信号

## 2. 工具层

- [x] 2.1 创建 `src/tools/age-stage.ts`：`calc_age_stage` 工具（出生日期→月龄+阶段标签，非法/超范围输入返回 success:false）
- [x] 2.2 创建 `src/tools/milestones.ts`：`get_milestones` 工具（月龄→区间命中，含边界确定性）
- [x] 2.3 创建 `src/tools/care-guide.ts`：`get_care_guide` 工具（主题枚举+可选月龄→适用条目过滤）
- [x] 2.4 更新 `src/tools/index.ts` 导出三个新工具，删除旧导出

## 3. Agent 层

- [x] 3.1 重写 `src/agent.ts`：`parentingAgent`（名称、育儿顾问 instructions——含红旗分诊硬规则、不诊断规则、五段输出模板、免责声明；保留 MODEL_NAME/chat_completions/tracing 配置与 attachFlowLogging）

## 4. 入口与清理

- [x] 4.1 更新 `src/server.ts`、`src/cli.ts` 的 import 与 CLI 默认问题；更新 `test/smoke.ts` 默认问题、`test/api.http` 示例
- [x] 4.2 删除 `src/tools/campaign-data.ts`、`src/tools/calculate-metrics.ts`、`src/data/campaigns.ts`

## 5. 验证与 spec 同步

- [x] 5.1 `tsc --noEmit` 通过；冒烟验证三条链路：常规发育咨询（走 get_milestones）、红旗信号（2 月龄发烧→建议就医）、诊断请求（不给结论）
- [x] 5.2 验证多轮会话记忆（第一轮给出生日期，第二轮追问时无需重复提供）
- [x] 5.3 同步主 specs（删除 campaign-* 两个目录，新增 parenting-* 两个 spec），`openspec validate` 全部通过
