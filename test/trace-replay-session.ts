import { getHistory } from "../src/sessions/session-store.js";
import { historyToMessages } from "../src/replay.js";
import {
  buildTraceStart,
  formatTrace,
  summarizeResult,
} from "../src/tool-trace.js";

// 用真实会话文件验收：同一份历史在开关两侧的回放差异。
// 关键性质——工具往返一直在写盘，所以事后补开 --show-tools 能看到过去的轨迹。

const sessionId = process.argv[2] ?? "tt1";

const options = (showTools: boolean) => ({
  showTools,
  formatTool: (name: string, args: string | undefined, result?: string) =>
    formatTrace(
      result === undefined
        ? buildTraceStart("", name, args)
        : {
            ...buildTraceStart("", name, args),
            resultSummary: summarizeResult(name, result),
          },
    ),
});

const history = getHistory(sessionId);
const off = historyToMessages(history, options(false));
const on = historyToMessages(history, options(true));

const offTools = off.filter((m) => m.role === "tool");
const onTools = on.filter((m) => m.role === "tool");

console.log(`session=${sessionId}：历史 ${history.length} 条`);
console.log(`  不开 --show-tools → ${off.length} 条消息，工具行 ${offTools.length}`);
console.log(`  开   --show-tools → ${on.length} 条消息，工具行 ${onTools.length}`);
for (const m of onTools) console.log(`     ${m.text.split("\n")[0]!.slice(0, 78)}`);

// 关闭时不得出现工具行；开启时应能看到历史里的调用
const okOff = offTools.length === 0;
const okOn = onTools.length > 0;
// 非工具消息在两侧应完全一致（开关只增不改）
const okSame =
  JSON.stringify(off.map((m) => [m.role, m.text])) ===
  JSON.stringify(on.filter((m) => m.role !== "tool").map((m) => [m.role, m.text]));
// 追问不得被重复成工具行
const okNoAskDup = !onTools.some((m) => m.text.includes("ask_user_question"));

console.log(`\n  关闭时无工具行: ${okOff}`);
console.log(`  事后补开可回溯: ${okOn}`);
console.log(`  非工具消息不受影响: ${okSame}`);
console.log(`  追问未被重复为工具行: ${okNoAskDup}`);
console.log(`\n结果：${okOff && okOn && okSame && okNoAskDup ? "通过" : "失败"}`);
if (!(okOff && okOn && okSame && okNoAskDup)) process.exitCode = 1;
