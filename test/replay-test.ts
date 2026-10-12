import assert from "node:assert/strict";
import type { AgentInputItem } from "@openai/agents";
import { historyToMessages, itemToMessage } from "../src/replay.js";

// 回放校验：追问工具的一问一答要还原成两个气泡，其他工具的往返仍然不展示，
// 且 id 在过滤后保持唯一递增（<Static> 用 id 做 key）。

const history = [
  { role: "user", content: "我家宝宝发育正常吗" },
  {
    type: "function_call",
    name: "ask_user_question",
    callId: "c1",
    arguments: JSON.stringify({ question: "宝宝现在多大啦？", options: [] }),
  },
  {
    type: "function_call_result",
    name: "ask_user_question",
    callId: "c1",
    output: { type: "text", text: JSON.stringify({ success: true, answer: "2024年11月20日", freeform: true }) },
  },
  // 其他工具的往返：不应出现在界面上
  {
    type: "function_call",
    name: "calc_age_stage",
    callId: "c2",
    arguments: JSON.stringify({ birthDate: "2024-11-20" }),
  },
  {
    type: "function_call_result",
    name: "calc_age_stage",
    callId: "c2",
    output: { type: "text", text: JSON.stringify({ success: true, ageMonths: 10 }) },
  },
  { role: "assistant", content: "## 直接回答\n宝宝 10 个月…" },
  // 被跳过的追问
  {
    type: "function_call",
    name: "ask_user_question",
    callId: "c3",
    arguments: JSON.stringify({ question: "主要是哪方面担心？", options: [{ label: "大运动" }] }),
  },
  {
    type: "function_call_result",
    name: "ask_user_question",
    callId: "c3",
    output: { type: "text", text: JSON.stringify({ success: true, skipped: true }) },
  },
] as unknown as AgentInputItem[];

let nextId = 0;
const messages = history
  .map(itemToMessage)
  .filter((m): m is NonNullable<typeof m> => m !== null)
  .map((m) => ({ ...m, id: nextId++ }));

console.log("回放结果：");
for (const m of messages) console.log(`  [${m.id}] ${m.role}: ${m.text}`);

const expected = [
  ["user", "我家宝宝发育正常吗"],
  ["assistant", "宝宝现在多大啦？"],
  ["user", "2024年11月20日"],
  ["assistant", "## 直接回答\n宝宝 10 个月…"],
  ["assistant", "主要是哪方面担心？"],
  ["user", "（已跳过）"],
];

assert.equal(messages.length, expected.length, "消息条数应与预期一致");
messages.forEach((m, i) => {
  assert.equal(m.role, expected[i]![0], `第 ${i} 条角色`);
  assert.equal(m.text, expected[i]![1], `第 ${i} 条文本`);
});

// 其他工具的痕迹不得外泄
const joined = messages.map((m) => m.text).join("\n");
assert.ok(!joined.includes("calc_age_stage"), "其他工具名不应出现");
assert.ok(!joined.includes("birthDate"), "其他工具参数不应出现");
assert.ok(!joined.includes("ageMonths"), "其他工具结果不应出现");

// id 唯一且递增（<Static> key 稳定性）
const ids = messages.map((m) => m.id);
assert.deepEqual(ids, [...ids].sort((a, b) => a - b), "id 应递增");
assert.equal(new Set(ids).size, ids.length, "id 应唯一");

console.log(`\n回放校验：${messages.length} 条消息、id 唯一递增、其他工具未外泄 —— 通过`);

// ---- 开启工具轨迹后的回放 ----

const traced = historyToMessages(history, {
  showTools: true,
  formatTool: (name, args, result) =>
    `🔧 ${name} ${args ?? ""}`.trimEnd() + (result ? `\n   → ${result.slice(0, 40)}` : ""),
});

console.log("\n开启轨迹后的回放：");
for (const m of traced) console.log(`  ${m.role.padEnd(9)} ${m.text.split("\n")[0]}`);

const toolMsgs = traced.filter((m) => m.role === "tool");
assert.equal(toolMsgs.length, 1, "应只为 calc_age_stage 产生一条轨迹（一次调用一行，不是两行）");
assert.ok(toolMsgs[0]!.text.includes("calc_age_stage"), "轨迹含工具名");
assert.ok(toolMsgs[0]!.text.includes("2024-11-20"), "轨迹含完整参数");
assert.ok(toolMsgs[0]!.text.includes("→"), "轨迹含结果");

// 追问不因开关而重复：仍是问答气泡，且不出现 ask_user_question 轨迹
const askTraces = traced.filter((m) => m.role === "tool" && m.text.includes("ask_user_question"));
assert.equal(askTraces.length, 0, "追问不应产生轨迹消息");
const questions = traced.filter((m) => m.text === "宝宝现在多大啦？");
assert.equal(questions.length, 1, "追问问题只出现一次");
const answers = traced.filter((m) => m.text === "2024年11月20日");
assert.equal(answers.length, 1, "追问答案只出现一次");

// 默认（不开）与引入轨迹前逐条一致
const plain = historyToMessages(history);
assert.deepEqual(
  plain.map((m) => [m.role, m.text]),
  expected,
  "默认策略下回放结果应与引入轨迹前完全一致",
);

console.log(`\n轨迹回放校验：工具消息 ${toolMsgs.length} 条、追问未重复、默认策略无漂移 —— 通过`);
