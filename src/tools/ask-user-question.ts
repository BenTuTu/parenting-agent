import { tool } from "@openai/agents";
import { z } from "zod";

import type { AppContext } from "../context.js";
import { isSkipped } from "../context.js";

const parameters = z.object({
  question: z
    .string()
    .describe("向家长提出的问题正文，一句话，语气友好，例如 '宝宝现在多大啦？'"),
  options: z
    .array(
      z.object({
        label: z.string().describe("选项文案，简短，例如 '4-6个月'"),
        description: z
          .string()
          .nullable()
          .describe("选项的补充说明，没有则传 null"),
      }),
    )
    .describe(
      "供家长选择的选项列表。凡是你在问题里会列举的取值（如入睡困难/夜醒多/早醒）都应放在这里让家长直接选；只有答案本身无法枚举时（如出生日期）才传空数组，界面会改为让家长自由输入。",
    ),
});

export const askUserQuestionTool = tool<typeof parameters, AppContext>({
  name: "ask_user_question",

  description:
    "在回答前向家长提出一个澄清问题并直接拿到答复（用于补齐月龄、出生日期、症状细节等缺失的关键信息）。\n" +
    "- 只问一个问题：question 里不要用“另外”“以及”把两个问题拼在一起；缺多项信息时先问最关键的那一项。\n" +
    "- 答案可枚举时必须给 options：只要你打算在问题里列出“是A、B还是C”，就把 A/B/C 放进 options，让家长直接选，而不是写在问题文本里让家长打字。\n" +
    "- 答案无法枚举时（如出生日期）才传空数组。\n" +
    "- 界面会自动为家长提供自由输入的出口，你不需要在 options 里添加“其他”之类的兜底选项。\n" +
    "- 拿到答复后就应作答，不要连续追问。\n" +
    "注意：一旦已经识别出红旗信号，禁止调用本工具，必须立即给出就医建议。",

  parameters,

  async execute({ question, options }, runContext) {
    const askUser = runContext?.context?.askUser;
    // isEnabled 已保证只有注入了交互能力的宿主才看得到本工具，这里只做类型收敛
    if (!askUser) {
      return { success: false, error: "当前运行环境不支持向用户提问" };
    }

    const result = await askUser({
      question,
      options: options.map(({ label, description }) => ({
        label,
        description: description ?? undefined,
      })),
    });

    if (isSkipped(result)) {
      return { success: true, skipped: true };
    }
    return { success: true, answer: result.answer, freeform: result.freeform };
  },

  // 宿主注入了 askUser 才把工具下发给模型；否则模型根本看不到它
  isEnabled: ({ runContext }) =>
    typeof runContext.context?.askUser === "function",
});
