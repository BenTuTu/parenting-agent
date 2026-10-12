import type { Agent } from "@openai/agents";

const MAX_DETAIL_LENGTH = 500;

function timestamp(): string {
  return new Date().toISOString();
}

function format(detail: unknown): string {
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  if (text.length > MAX_DETAIL_LENGTH) {
    return `${text.slice(0, MAX_DETAIL_LENGTH)}…(truncated, ${text.length} chars)`;
  }
  return text;
}

export function logStep(stage: string, detail?: unknown): void {
  if (process.env.FLOW_LOG === "off") {
    return;
  }
  const suffix = detail === undefined ? "" : ` | ${format(detail)}`;
  console.log(`[${timestamp()}] [agent-flow] ${stage}${suffix}`);
}

export function attachFlowLogging(agent: Agent<any, any>): void {
  agent.on("agent_start", (_context, startedAgent, turnInput) => {
    logStep(`agent_start: ${startedAgent.name}`, {
      turnInputItems: turnInput?.length ?? 0,
    });
  });

  agent.on("agent_tool_start", (_context, tool, details) => {
    const args = (details.toolCall as { arguments?: string }).arguments;
    logStep(`tool_start: ${tool.name}`, args);
  });

  agent.on("agent_tool_end", (_context, tool, result) => {
    logStep(`tool_end: ${tool.name}`, result);
  });

  agent.on("agent_handoff", (_context, nextAgent) => {
    logStep(`handoff -> ${nextAgent.name}`);
  });

  agent.on("agent_end", (_context, output) => {
    logStep("agent_end", output);
  });
}
