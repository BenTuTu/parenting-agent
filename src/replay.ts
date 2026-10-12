import type { AgentInputItem } from "@openai/agents";

/**
 * 历史回放：把会话历史里的条目还原成界面消息。
 *
 * 追问工具的问题藏在 function_call 参数里、答复藏在 function_call_result 里，二者都
 * 没有 role。不还原的话，重开会话时整段问答会从界面上蒸发（模型看得见，人看不见）。
 *
 * 展示范围由策略决定而非写死：这条规则先后被改过三次（一律不展示 → 给追问开口 →
 * 再给工具轨迹开口），继续打补丁只会越缠越紧。追问始终还原为问答气泡；其余工具
 * 是否还原为轨迹消息，交给调用方按开关决定。
 */

export const ASK_TOOL = "ask_user_question";
export const SKIPPED_TEXT = "（已跳过）";

export type ReplayRole = "user" | "assistant" | "error" | "info" | "tool";

export interface ReplayMessage {
  role: ReplayRole;
  text: string;
}

export interface ReplayOptions {
  /** 是否把追问以外的工具往返还原为轨迹消息；默认 false，与引入轨迹前的行为一致 */
  showTools?: boolean;
  /** 轨迹消息的渲染函数，由调用方注入，避免 replay 依赖具体呈现形态 */
  formatTool?: (name: string, args: string | undefined, result?: string) => string;
}


function parseAskQuestion(raw: unknown): string {
  if (typeof raw !== "string") return "";
  try {
    const parsed = JSON.parse(raw) as { question?: unknown };
    return typeof parsed.question === "string" ? parsed.question : "";
  } catch {
    return "";
  }
}

function parseAskAnswer(output: unknown): string {
  const text =
    typeof output === "string"
      ? output
      : typeof output === "object" && output !== null && "text" in output
        ? String((output as { text: unknown }).text)
        : "";
  if (!text) return "";
  try {
    const parsed = JSON.parse(text) as { skipped?: unknown; answer?: unknown };
    if (parsed.skipped === true) return SKIPPED_TEXT;
    return typeof parsed.answer === "string" ? parsed.answer : "";
  } catch {
    return text;
  }
}

export function itemToMessage(
  item: AgentInputItem,
  options: ReplayOptions = {},
  argsByCallId?: ReadonlyMap<string, string>,
): ReplayMessage | null {
  const type = (item as { type?: unknown }).type;
  if (type === "function_call" || type === "function_call_result") {
    const name = String((item as { name?: unknown }).name ?? "");

    // 追问始终还原为问答气泡，与开关无关
    if (name === ASK_TOOL) {
      if (type === "function_call") {
        const question = parseAskQuestion(
          (item as { arguments?: unknown }).arguments,
        );
        return question ? { role: "assistant", text: question } : null;
      }
      const answer = parseAskAnswer((item as { output?: unknown }).output);
      return answer ? { role: "user", text: answer } : null;
    }

    if (!options.showTools || !options.formatTool) return null;

    // 一次调用在历史里是 call + result 两条，但只渲染一条轨迹消息。渲染挂在 result
    // 上，因为那时参数与结果都已齐备；call 本身跳过，避免同一次调用出现两行。
    if (type === "function_call") return null;
    const callId = String((item as { callId?: unknown }).callId ?? "");
    const args = callId ? argsByCallId?.get(callId) : undefined;
    const output = outputText((item as { output?: unknown }).output);
    return { role: "tool", text: options.formatTool(name, args, output) };
  }
  if (!("role" in item) || (item.role !== "user" && item.role !== "assistant")) {
    return null;
  }
  const content = (item as { content: unknown }).content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              typeof part === "object" && part !== null && "text" in part
                ? String((part as { text: unknown }).text)
                : "",
            )
            .join("")
        : "";
  return text ? { role: item.role, text } : null;
}

/**
 * 把历史整体还原为消息列表。
 *
 * 不能简单 map：工具轨迹要在 result 条目上渲染，而参数在更早的 call 条目里，需要按
 * callId 跨条目配对（并行调用时 call/result 未必相邻）。
 */
export function historyToMessages(
  history: AgentInputItem[],
  options: ReplayOptions = {},
): ReplayMessage[] {
  const argsByCallId = new Map<string, string>();
  for (const item of history) {
    if ((item as { type?: unknown }).type === "function_call") {
      const callId = String((item as { callId?: unknown }).callId ?? "");
      const args = (item as { arguments?: unknown }).arguments;
      if (callId && typeof args === "string") argsByCallId.set(callId, args);
    }
  }
  return history
    .map((item) => itemToMessage(item, options, argsByCallId))
    .filter((m): m is ReplayMessage => m !== null);
}

function outputText(output: unknown): string {
  if (typeof output === "string") return output;
  if (typeof output === "object" && output !== null && "text" in output) {
    return String((output as { text: unknown }).text);
  }
  return "";
}
