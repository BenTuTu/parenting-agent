import { tool } from "@openai/agents";
import { z } from "zod";

import { findGuides } from "../data/care-guides.js";

export const getCareGuideTool = tool({
  name: "get_care_guide",

  description:
    "按主题查询育儿护理指南（含护理要点与红旗信号）。主题：sleep=睡眠，feeding=喂养/辅食，fever-care=发烧护理，toilet-training=如厕训练，kindergarten-anxiety=入园焦虑，screen-time=屏幕时间。提供月龄可过滤出适用条目。",

  parameters: z.object({
    topic: z.enum([
      "sleep",
      "feeding",
      "fever-care",
      "toilet-training",
      "kindergarten-anxiety",
      "screen-time",
    ]),
    ageMonths: z
      .number()
      .int()
      .nullable()
      .describe("孩子月龄（整数月），未知时传 null 返回该主题全部条目"),
  }),

  async execute({ topic, ageMonths }) {
    const guides = findGuides(topic, ageMonths);
    if (guides.length === 0) {
      return {
        success: false,
        error: `主题 ${topic} 在月龄 ${ageMonths} 下暂无适用的精选条目`,
      };
    }

    return { success: true, topic, ageMonths, guides };
  },
});
