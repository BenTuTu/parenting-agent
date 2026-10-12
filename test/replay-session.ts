import { getHistory } from "../src/sessions/session-store.js";
import { itemToMessage } from "../src/replay.js";

// 用真实会话文件验收回放：追问往返还原成一问一答，其他工具往返不展示。
const sessionId = process.argv[2] ?? "pty13";
const history = getHistory(sessionId);

let nextId = 0;
const messages = history
  .map(itemToMessage)
  .filter((m): m is NonNullable<typeof m> => m !== null)
  .map((m) => ({ ...m, id: nextId++ }));

console.log(`session=${sessionId}：历史 ${history.length} 条 → 界面 ${messages.length} 条\n`);
for (const m of messages) {
  const head = m.text.split("\n")[0]!.slice(0, 60);
  console.log(`  [${m.id}] ${m.role.padEnd(9)} ${head}${m.text.length > head.length ? "…" : ""}`);
}

const joined = messages.map((m) => m.text).join("\n");
const leaked = ["calc_age_stage", "get_milestones", "search_wiki", "read_wiki_page", "birthDate", "ageMonths"].filter(
  (n) => joined.includes(n),
);
console.log("\n其他工具痕迹外泄:", leaked.length ? leaked : "无");

const ids = messages.map((m) => m.id);
const idsOk = new Set(ids).size === ids.length;
console.log("id 唯一递增:", idsOk);
if (leaked.length || !idsOk) process.exitCode = 1;
