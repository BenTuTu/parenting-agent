import { tool } from "@openai/agents";
import { z } from "zod";

import { findStageByMonth } from "../data/milestones.js";

const MAX_AGE_MONTHS = 96;

export function monthsBetween(birthDate: Date, now: Date): number {
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());
  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return months;
}

export const calcAgeStageTool = tool({
  name: "calc_age_stage",

  description:
    "根据孩子的出生日期计算当前月龄和所处发育阶段。回答任何与月龄相关的问题前应先调用此工具锚定月龄。",

  parameters: z.object({
    birthDate: z
      .string()
      .describe("出生日期，ISO 格式，例如 2024-05-20"),
  }),

  async execute({ birthDate }) {
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime())) {
      return { success: false, error: `无法解析出生日期：${birthDate}` };
    }

    const ageMonths = monthsBetween(parsed, new Date());
    if (ageMonths < 0) {
      return { success: false, error: "出生日期晚于当前日期" };
    }
    if (ageMonths > MAX_AGE_MONTHS) {
      return {
        success: false,
        error: `孩子月龄为 ${ageMonths} 个月，已超出本服务覆盖的 0-8 岁范围`,
      };
    }

    const stage = findStageByMonth(ageMonths);
    return {
      success: true,
      ageMonths,
      ageYears: Math.floor(ageMonths / 12),
      stageLabel: stage?.stageLabel ?? "未知阶段",
    };
  },
});
