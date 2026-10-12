import { ASK_TOOL } from "./replay.js";

/**
 * 工具调用轨迹：把 agent_tool_start / agent_tool_end 事件整理成面向开发者的短记录。
 *
 * 这是独立于 attachFlowLogging 的第二条消费通道——logger 面向日志文件（完整、500 字符
 * 截断），这里面向终端消息流（更短、参数完整、结果只给摘要）。两者消费同一份事件，
 * 互不替换：cli 与 server 的服务端日志仍然只靠 logger。
 */

/** 参数完整保留（表达模型意图，是排查的关键信号）；结果摘要的上限 */
const RESULT_SUMMARY_MAX = 120;
const ARGS_MAX = 300;

export interface ToolTrace {
  callId: string;
  name: string;
  /** 完整调用参数（原始 JSON 串，超长才截断） */
  args: string;
  /** 结果摘要；start 阶段为 undefined */
  resultSummary?: string;
}

/** 已有专属呈现的工具不进轨迹，避免同一次交互被重复呈现 */
export function isTracedTool(name: string): boolean {
  return name !== ASK_TOOL;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…(${text.length} 字)`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * 结果摘要：默认通用截断；对返回长文的 wiki 工具定制，否则 read_wiki_page 的整篇正文
 * （数千字）会把回答挤出屏幕。
 */
export function summarizeResult(name: string, raw: string): string {
  const text = raw ?? "";
  const parsed = parseJson(text);

  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;

    if (o.success === false) {
      return `失败：${truncate(String(o.error ?? "未知错误"), RESULT_SUMMARY_MAX)}`;
    }

    if (name === "read_wiki_page") {
      const content = typeof o.content === "string" ? o.content : "";
      const title = typeof o.title === "string" ? o.title : o.slug;
      return `${content.length} 字 ·《${String(title ?? "?")}》`;
    }

    if (name === "search_wiki") {
      const results = Array.isArray(o.results) ? o.results : [];
      const titles = results
        .slice(0, 3)
        .map((r) =>
          typeof r === "object" && r !== null && "title" in r
            ? String((r as { title: unknown }).title)
            : "?",
        )
        .join("、");
      return `命中 ${results.length} 篇${titles ? ` · ${titles}` : ""}`;
    }
  }

  return truncate(text, RESULT_SUMMARY_MAX);
}

export function buildTraceStart(
  callId: string,
  name: string,
  args: string | undefined,
): ToolTrace {
  return { callId, name, args: truncate(args ?? "", ARGS_MAX) };
}

export function withResult(trace: ToolTrace, raw: string): ToolTrace {
  return { ...trace, resultSummary: summarizeResult(trace.name, raw) };
}

/** 终端单行呈现：🔧 名称 参数 / 缩进一行的结果 */
export function formatTrace(trace: ToolTrace): string {
  const head = `🔧 ${trace.name} ${trace.args}`.trimEnd();
  return trace.resultSummary === undefined
    ? head
    : `${head}\n   → ${trace.resultSummary}`;
}

/** 从事件回调里取出 callId 与 arguments，两个宿主共用同一套解析 */
export function readToolCall(details: unknown): {
  callId: string;
  args: string | undefined;
} {
  const call = (details as { toolCall?: Record<string, unknown> })?.toolCall;
  return {
    callId: String(call?.callId ?? call?.id ?? ""),
    args:
      typeof call?.arguments === "string" ? (call.arguments as string) : undefined,
  };
}
