# Delta: campaign-data-tools

## REMOVED Requirements

### Requirement: 活动数据查询工具

**Reason**: 项目转型为育儿咨询 Agent，电商活动数据查询能力整体移除
**Migration**: 由 `get_milestones` / `get_care_guide` 替代（见 parenting-knowledge-tools）；`src/tools/campaign-data.ts` 删除

### Requirement: 指标计算工具

**Reason**: 电商派生指标计算随领域移除
**Migration**: 确定性计算的角色由 `calc_age_stage` 承担；`src/tools/calculate-metrics.ts` 删除

### Requirement: 静态活动数据集

**Reason**: 活动数据集随领域移除
**Migration**: 由发育里程碑与护理指南数据集替代（见 parenting-knowledge-tools）；`src/data/campaigns.ts` 删除
