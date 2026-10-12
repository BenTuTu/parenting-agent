import { tool } from "@openai/agents";
import { z } from "zod";

import { findStageByMonth } from "../data/milestones.js";

export const getMilestonesTool = tool({
  name: "get_milestones",

  description:
    "按月龄查询该发育阶段的里程碑（大运动、精细动作、语言、社交认知）及该阶段的红旗信号。回答发育类问题前必须调用。",

  parameters: z.object({
    ageMonths: z
      .number()
      .int()
      .describe("孩子月龄（整数月，0-96）"),
  }),

  async execute({ ageMonths }) {
    if (ageMonths < 0 || ageMonths > 96) {
      return {
        success: false,
        error: `月龄 ${ageMonths} 超出 0-96 个月（0-8 岁）范围`,
      };
    }

    const stage = findStageByMonth(ageMonths);
    if (!stage) {
      return { success: false, error: `未找到月龄 ${ageMonths} 对应的阶段数据` };
    }

    return { success: true, ageMonths, stage };
  },
});
