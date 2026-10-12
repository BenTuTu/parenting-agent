import assert from "node:assert/strict";
import {
  buildTraceStart,
  formatTrace,
  isTracedTool,
  readToolCall,
  summarizeResult,
  withResult,
  type ToolTrace,
} from "../src/tool-trace.js";

// ---- 排除规则 ----
assert.equal(isTracedTool("ask_user_question"), false, "追问工具不进轨迹");
assert.equal(isTracedTool("calc_age_stage"), true, "其余工具进轨迹");

// ---- 结果摘要 ----
const wiki = JSON.stringify({
  success: true,
  slug: "pacifier-use",
  title: "安抚奶嘴该不该用",
  content: "正".repeat(4200),
});
const wikiSummary = summarizeResult("read_wiki_page", wiki);
assert.ok(wikiSummary.includes("4200 字"), "长文只报字数");
assert.ok(wikiSummary.includes("安抚奶嘴该不该用"), "长文报标题");
assert.ok(wikiSummary.length < 60, `长文摘要应很短，实际 ${wikiSummary.length}`);
assert.ok(!wikiSummary.includes("正正正"), "摘要不得包含正文");

const search = JSON.stringify({
  success: true,
  results: [
    { slug: "a", title: "安抚奶嘴该不该用" },
    { slug: "b", title: "戒奶嘴的时机" },
  ],
});
const searchSummary = summarizeResult("search_wiki", search);
assert.ok(searchSummary.includes("命中 2 篇"), "检索报命中数");

const failed = JSON.stringify({ success: false, error: "未找到 slug" });
assert.ok(summarizeResult("read_wiki_page", failed).startsWith("失败："), "失败结果显式标注");

const generic = summarizeResult("calc_age_stage", JSON.stringify({ success: true, ageMonths: 21 }));
assert.ok(generic.includes("21"), "通用结果保留内容");

const huge = summarizeResult("unknown_tool", "x".repeat(5000));
assert.ok(huge.length < 200, `通用截断应生效，实际 ${huge.length}`);

// ---- 事件参数解析 ----
const parsed = readToolCall({
  toolCall: { callId: "call_1", arguments: '{"ageMonths":21}' },
});
assert.equal(parsed.callId, "call_1");
assert.equal(parsed.args, '{"ageMonths":21}');
assert.deepEqual(readToolCall(undefined), { callId: "", args: undefined }, "缺 details 不抛错");

// ---- 并行调用按 callId 配对（复刻 chat.tsx 的 pending 逻辑）----
const pending = new Map<string, ToolTrace>();
pending.set("c1", buildTraceStart("c1", "search_wiki", '{"keywords":["奶嘴"]}'));
pending.set("c2", buildTraceStart("c2", "get_milestones", '{"ageMonths":21}'));

// 结果乱序返回：c2 先回
const t2 = withResult(pending.get("c2")!, JSON.stringify({ success: true, stage: "学步期" }));
const t1 = withResult(pending.get("c1")!, search);

assert.ok(t2.args.includes("ageMonths"), "c2 的结果必须接 c2 的参数");
assert.ok(!t2.args.includes("奶嘴"), "c2 不得串到 c1 的参数");
assert.ok(t1.args.includes("奶嘴"), "c1 的结果必须接 c1 的参数");
assert.ok(t1.resultSummary!.includes("命中 2 篇"), "c1 用 search_wiki 的摘要口径");

// ---- 呈现形态 ----
const line = formatTrace(t1);
assert.ok(line.startsWith("🔧 search_wiki"), "首行是工具名");
assert.ok(line.includes("奶嘴"), "首行含完整参数");
assert.ok(line.split("\n").length === 2, "结果另起一行");
assert.equal(formatTrace(buildTraceStart("c3", "x", undefined)).split("\n").length, 1, "无结果时只有一行");

console.log("工具轨迹校验：排除规则、结果摘要、事件解析、并行配对、呈现形态 —— 全部通过");
