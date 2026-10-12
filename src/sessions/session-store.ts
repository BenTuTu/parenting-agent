import fs from "node:fs";
import path from "node:path";
import type { AgentInputItem } from "@openai/agents";

const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR ?? ".sessions");

function sessionFile(sessionId: string): string {
  if (!/^[\w.-]{1,128}$/.test(sessionId)) {
    throw new Error(`Invalid sessionId: ${sessionId}`);
  }
  return path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
}

function readLines(file: string): string[] {
  if (!fs.existsSync(file)) {
    return [];
  }
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "");
}

export function getHistory(sessionId: string): AgentInputItem[] {
  return readLines(sessionFile(sessionId)).map(
    (line) => JSON.parse(line) as AgentInputItem,
  );
}

export function saveHistory(
  sessionId: string,
  history: AgentInputItem[],
): void {
  const file = sessionFile(sessionId);
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  const existingCount = readLines(file).length;
  const newItems = history.slice(existingCount);
  if (newItems.length === 0) {
    return;
  }
  const lines = newItems.map((item) => JSON.stringify(item)).join("\n") + "\n";
  fs.appendFileSync(file, lines, "utf8");
}

export function clearSession(sessionId: string): void {
  fs.rmSync(sessionFile(sessionId), { force: true });
}

export function listSessions(): string[] {
  if (!fs.existsSync(SESSIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => name.slice(0, -".jsonl".length));
}
