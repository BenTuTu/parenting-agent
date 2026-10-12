import "dotenv/config";
import express from "express";
import { user, run, Runner } from "@openai/agents";
import { parentingAgent } from "./agent.js";
import { logStep } from "./logger.js";
import {
  buildTraceStart,
  isTracedTool,
  readToolCall,
  summarizeResult,
  type ToolTrace,
} from "./tool-trace.js";
import {
  getHistory,
  saveHistory,
  clearSession,
} from "./sessions/session-store.js";

const app = express();
app.use(express.json());

app.post("/api/agent/chat", async (req, res) => {
  const { sessionId, message, stream, verbose } = req.body ?? {};
  if (typeof sessionId !== "string" || typeof message !== "string") {
    res
      .status(400)
      .json({ error: "sessionId and message are required strings" });
    return;
  }
  try {
    logStep(`run_start: session=${sessionId}`, message);
    const startedAt = Date.now();
    const input = [...getHistory(sessionId), user(message)];

    if (stream === true) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const send = (payload: unknown) =>
        res.write(`data: ${JSON.stringify(payload)}\n\n`);

      // 工具事件必须按单次运行订阅：parentingAgent 是模块单例，用 agent.on 会让并发
      // 请求的工具事件串流到别的客户端的响应里。Runner 实例的作用域就是这一次运行。
      const traceEnabled = verbose === true;
      const runner = new Runner();
      const pending = new Map<string, ToolTrace>();

      const onToolStart = (
        _ctx: unknown,
        _agent: unknown,
        tool: { name: string },
        details: unknown,
      ) => {
        if (!isTracedTool(tool.name)) return;
        const { callId, args } = readToolCall(details);
        const trace = buildTraceStart(callId, tool.name, args);
        pending.set(callId, trace);
        send({
          tool: {
            phase: "start",
            callId,
            name: tool.name,
            arguments: trace.args,
          },
        });
      };

      const onToolEnd = (
        _ctx: unknown,
        _agent: unknown,
        tool: { name: string },
        result: string,
        details: unknown,
      ) => {
        if (!isTracedTool(tool.name)) return;
        const { callId } = readToolCall(details);
        pending.delete(callId);
        send({
          tool: {
            phase: "end",
            callId,
            name: tool.name,
            result: summarizeResult(tool.name, result ?? ""),
          },
        });
      };

      if (traceEnabled) {
        runner.on("agent_tool_start", onToolStart);
        runner.on("agent_tool_end", onToolEnd);
      }

      try {
        const result = await runner.run(parentingAgent, input, {
          stream: true,
        });
        for await (const chunk of result.toTextStream()) {
          send({ delta: chunk });
        }
        await result.completed;
        saveHistory(sessionId, result.history);
        logStep(`run_end: session=${sessionId}`, {
          durationMs: Date.now() - startedAt,
          historyItems: result.history.length,
          streamed: true,
        });
        send({ done: true, sessionId });
      } finally {
        if (traceEnabled) {
          runner.off("agent_tool_start", onToolStart);
          runner.off("agent_tool_end", onToolEnd);
        }
      }
      res.end();
      return;
    }

    const result = await run(parentingAgent, input);
    saveHistory(sessionId, result.history);
    logStep(`run_end: session=${sessionId}`, {
      durationMs: Date.now() - startedAt,
      historyItems: result.history.length,
    });
    res.json({ sessionId, reply: result.finalOutput });
  } catch (err) {
    logStep(`run_error: session=${sessionId}`, String(err));
    console.error(err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Agent run failed" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Agent run failed" });
    }
  }
});

app.delete("/api/agent/chat/:sessionId", (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`parenting-agent server listening on http://localhost:${port}`);
});
