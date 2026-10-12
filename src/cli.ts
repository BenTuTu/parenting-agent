import "dotenv/config";

import { run, user } from "@openai/agents";

import { parentingAgent } from "./agent.js";
import { getHistory, saveHistory } from "./sessions/session-store.js";

function parseArgs(argv: string[]): { sessionId: string; question: string } {
  const args = [...argv];
  let sessionId = "cli";

  const flagIndex = args.indexOf("--session");
  if (flagIndex !== -1) {
    sessionId = args[flagIndex + 1] ?? sessionId;
    args.splice(flagIndex, 2);
  }

  return {
    sessionId,
    question: args.join(" ") || "我家宝宝10个月了，应该会哪些技能？",
  };
}

async function main(): Promise<void> {
  const { sessionId, question } = parseArgs(process.argv.slice(2));

  const history = getHistory(sessionId);
  console.log(
    `session=${sessionId}，已加载历史 ${history.length} 条\n`,
  );

  const result = await run(
    parentingAgent,
    [...history, user(question)],
    {
      maxTurns: 6,
      stream: true,
    },
  );

  console.log("\nAgent Output:\n");
  result
    .toTextStream({ compatibleWithNodeStreams: true })
    .pipe(process.stdout);
  await result.completed;
  process.stdout.write("\n");

  saveHistory(sessionId, result.history);
}

main().catch((error: unknown) => {
  console.error("Agent execution failed:", error);
  process.exitCode = 1;
});
