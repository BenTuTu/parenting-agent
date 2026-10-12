import { RunContext } from "@openai/agents";
import { parentingAgent } from "../src/agent.js";
import type { AppContext } from "../src/context.js";

// 离线校验追问工具的场景门控：注入了 askUser 的宿主才看得到 ask_user_question，
// 未注入的宿主（cli/server）工具列表与 prompt 表述都保持原样。不需要调用模型。

const ASK_TOOL = "ask_user_question";
const PROSE_RULE =
  "7. 用户未提供月龄且问题与月龄相关时，先友好询问孩子月龄或出生日期。";

async function inspect(label: string, context: AppContext) {
  const ctx = new RunContext<AppContext>(context);
  const tools = (await parentingAgent.getAllTools(ctx)).map((t) => t.name);
  const prompt = (await parentingAgent.getSystemPrompt(ctx)) ?? "";
  console.log(`\n[${label}]`);
  console.log("  工具列表:", tools.join(", "));
  console.log("  工具可见:", tools.includes(ASK_TOOL));
  console.log("  prompt 指向工具:", prompt.includes(ASK_TOOL));
  console.log("  prompt 保留原表述:", prompt.includes(PROSE_RULE));
  return { tools, prompt };
}

const plain = await inspect("non-interactive (cli / server)", {});
const interactive = await inspect("interactive (chat TUI)", {
  askUser: async () => ({ answer: "6个月", freeform: false }),
});

const ok =
  !plain.tools.includes(ASK_TOOL) &&
  !plain.prompt.includes(ASK_TOOL) &&
  plain.prompt.includes(PROSE_RULE) &&
  interactive.tools.includes(ASK_TOOL) &&
  interactive.prompt.includes(ASK_TOOL) &&
  !interactive.prompt.includes(PROSE_RULE);

console.log(`\n门控校验：${ok ? "通过" : "失败"}`);
if (!ok) process.exitCode = 1;
