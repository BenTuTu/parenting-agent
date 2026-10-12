import "dotenv/config";
import { useEffect, useRef, useState } from "react";
import { render, Box, Text, Static, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { run, user, type AgentInputItem } from "@openai/agents";

import { parentingAgent } from "./agent.js";
import { reduceAskKey } from "./ask-keys.js";
import { historyToMessages, SKIPPED_TEXT } from "./replay.js";
import {
  buildTraceStart,
  formatTrace,
  isTracedTool,
  readToolCall,
  summarizeResult,
  withResult,
  type ToolTrace,
} from "./tool-trace.js";
import {
  isSkipped,
  type AskUserOption,
  type AskUserRequest,
  type AskUserResult,
} from "./context.js";
import {
  getHistory,
  saveHistory,
  clearSession,
} from "./sessions/session-store.js";

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "error" | "info" | "tool";
  text: string;
}

const OTHER_LABEL = "其他，我自己说";

function parseSessionId(argv: string[]): string {
  const idx = argv.indexOf("--session");
  return idx !== -1 ? (argv[idx + 1] ?? "cli") : "cli";
}

function parseShowTools(argv: string[]): boolean {
  return argv.includes("--show-tools");
}

/** 回放策略：开关决定其余工具是否还原为轨迹消息，追问始终还原为问答气泡 */
function replayOptions(showTools: boolean) {
  return {
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
  };
}

const CONTEXT_WINDOW = Number(process.env.CONTEXT_WINDOW ?? 1_000_000);

function useColumns(): number {
  const { stdout } = useStdout();
  return stdout.columns && stdout.columns >= 40 ? stdout.columns : 80;
}

// 首轮前的粗估：CJK ≈ 1 token/字，其余 ≈ 4 字符/token；跑过一轮后以真实 usage 为准
function estimateTokens(items: AgentInputItem[]): number {
  const text = JSON.stringify(items);
  const cjk = (text.match(/[一-鿿　-ヿ]/g) ?? []).length;
  return cjk + Math.ceil((text.length - cjk) / 4);
}

function ContextGauge({ tokens }: { tokens: number }) {
  const ratio = Math.min(tokens / CONTEXT_WINDOW, 1);
  const width = 16;
  const filled = Math.round(ratio * width);
  const color = ratio < 0.6 ? "green" : ratio < 0.85 ? "yellow" : "red";
  const compact =
    tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
  return (
    <Text>
      <Text dimColor>ctx </Text>
      <Text color={color}>
        {"█".repeat(filled)}
        {"░".repeat(width - filled)}
      </Text>
      <Text dimColor>
        {" "}
        {(ratio * 100).toFixed(1)}% · {compact}
      </Text>
    </Text>
  );
}

const ROLE_STYLE: Record<
  Exclude<ChatMessage["role"], "user">,
  { label: string; color: string }
> = {
  assistant: { label: "助手", color: "green" },
  error: { label: "错误", color: "red" },
  info: { label: "提示", color: "yellow" },
  tool: { label: "工具", color: "gray" },
};

const RED_FLAG_MARKER = "⚠️【红旗警示】";

function isRedFlag(text: string): boolean {
  return text.startsWith("⚠") || text.startsWith(RED_FLAG_MARKER);
}

// 行内解析：**粗体**；流式时未闭合的 ** 自动视为持续到行尾
function InlineMd({ text, dim }: { text: string; dim?: boolean }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) => (
        <Text key={i} bold={i % 2 === 1} dimColor={dim}>
          {part}
        </Text>
      ))}
    </>
  );
}

function MdLine({ line }: { line: string }) {
  const heading = line.match(/^(#{1,3})\s+(.*)$/);
  if (heading) {
    const title = heading[2];
    const color = title.includes("何时就医") ? "red" : "cyan";
    return (
      <Text color={color} bold>
        ◆ {title}
      </Text>
    );
  }
  const bullet = line.match(/^(\s*)-\s+(.*)$/);
  if (bullet) {
    return (
      <Text>
        {bullet[1]}
        <Text color="gray">• </Text>
        <InlineMd text={bullet[2]} />
      </Text>
    );
  }
  const ordered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (ordered) {
    return (
      <Text>
        {ordered[1]}
        <Text color="gray">{ordered[2]}. </Text>
        <InlineMd text={ordered[3]} />
      </Text>
    );
  }
  return line.trim() === "" ? (
    <Text> </Text>
  ) : (
    <Text>
      <InlineMd text={line} />
    </Text>
  );
}

// 行级 Markdown 渲染：流式安全——已完成的行解析结果稳定，仅末行随 chunk 重解析
function MarkdownView({ text }: { text: string }) {
  return (
    <Box flexDirection="column">
      {text.split("\n").map((line, i) => (
        <MdLine key={i} line={line} />
      ))}
    </Box>
  );
}

function MessageView({ role, text }: { role: ChatMessage["role"]; text: string }) {
  const columns = useColumns();
  if (role === "assistant" && isRedFlag(text)) {
    return (
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="double"
        borderColor="red"
        paddingX={1}
      >
        <Text color="red" bold>
          ⚠ 红旗警示 · 建议尽快就医
        </Text>
        <MarkdownView text={text.replace(RED_FLAG_MARKER, "").trim()} />
      </Box>
    );
  }
  if (role === "user") {
    return (
      <Box width={columns} marginBottom={1} justifyContent="flex-end">
        <Box
          maxWidth={Math.floor(columns * 0.8)}
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
        >
          <Text>{text}</Text>
        </Box>
      </Box>
    );
  }
  // 工具轨迹是给开发者看的原始信息：不套 Markdown 渲染，整体压暗，不抢正文注意力
  if (role === "tool") {
    return (
      <Box width={columns} flexDirection="column" marginBottom={1}>
        {text.split("\n").map((line, i) => (
          <Text key={i} dimColor>
            {line}
          </Text>
        ))}
      </Box>
    );
  }
  return (
    <Box width={columns} flexDirection="column" marginBottom={1}>
      <Text color={ROLE_STYLE[role].color} bold>
        {ROLE_STYLE[role].label}
      </Text>
      {role === "assistant" ? (
        <Box width={Math.floor(columns * 0.8)}>
          <MarkdownView text={text} />
        </Box>
      ) : (
        <Text>{text}</Text>
      )}
    </Box>
  );
}

interface SlashCommand {
  name: string;
  hint: string;
}

const COMMANDS: SlashCommand[] = [
  { name: "/exit", hint: "退出聊天" },
  { name: "/clear", hint: "清空当前会话" },
];

function CommandPopup({
  items,
  index,
}: {
  items: SlashCommand[];
  index: number;
}) {
  const pad = Math.max(...items.map((c) => c.name.length)) + 2;
  return (
    <Box flexDirection="column">
      {items.map((cmd, i) => (
        <Text key={cmd.name}>
          <Text inverse={i === index} color={i === index ? "cyan" : undefined}>
            {cmd.name.padEnd(pad)}
          </Text>
          <Text dimColor>{cmd.hint}</Text>
        </Text>
      ))}
    </Box>
  );
}

// 追问界面：选项层与自由输入层共用一个容器，options 为空时直接落在自由输入层
function AskQuestionView({
  question,
  options,
  index,
  freeform,
  input,
  onChange,
  onSubmit,
  contextTokens,
}: {
  question: string;
  options: AskUserOption[];
  index: number;
  freeform: boolean;
  input: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  contextTokens: number;
}) {
  const columns = useColumns();
  const width = Math.max(40, columns - 1);
  const pad = Math.max(0, ...options.map((o) => o.label.length)) + 2;
  // 选项层可退回时（有真实选项），Esc 是"返回"；纯自由输入时 Esc 直接跳过
  const canGoBack = options.length > 1;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        width={width}
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        flexDirection="column"
      >
        <Text color="yellow" bold>
          ? {question}
        </Text>

        {freeform ? (
          <Box marginTop={1}>
            <Text color="cyan" bold>
              ❯{" "}
            </Text>
            <TextInput
              value={input}
              onChange={onChange}
              onSubmit={onSubmit}
              placeholder="直接输入你的答案…"
            />
          </Box>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {options.map((opt, i) => (
              <Text key={i}>
                <Text
                  inverse={i === index}
                  color={i === index ? "cyan" : undefined}
                >
                  {opt.label.padEnd(pad)}
                </Text>
                {opt.description ? <Text dimColor>{opt.description}</Text> : null}
              </Text>
            ))}
          </Box>
        )}
      </Box>

      <Box width={width} paddingX={1} justifyContent="space-between">
        <Text dimColor>
          {freeform
            ? canGoBack
              ? "Enter 提交 · Esc 返回选项"
              : "Enter 提交 · Esc 跳过"
            : "↑↓ 选择 · Enter 确认 · Esc 跳过"}
        </Text>
        <ContextGauge tokens={contextTokens} />
      </Box>
    </Box>
  );
}

function InputBox({
  input,
  onChange,
  onSubmit,
  running,
  status,
  contextTokens,
  commands,
  commandIndex,
}: {
  input: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  running: boolean;
  status: string | null;
  contextTokens: number;
  commands: SlashCommand[];
  commandIndex: number;
}) {
  const columns = useColumns();
  const width = Math.max(40, columns - 1);
  const showCommands = !running && commands.length > 0;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        width={width}
        borderStyle="round"
        borderColor={running ? "gray" : "cyan"}
        paddingX={1}
        flexDirection="column"
      >
        {showCommands && <CommandPopup items={commands} index={commandIndex} />}

        {running ? (
          <Text color="yellow">
            <Spinner type="dots" /> {status ?? "思考中…"}
          </Text>
        ) : (
          <Box>
            <Text color="cyan" bold>
              ❯{" "}
            </Text>
            <TextInput
              value={input}
              onChange={onChange}
              onSubmit={onSubmit}
              placeholder="说说宝宝的情况…"
            />
          </Box>
        )}
      </Box>

      <Box width={width} paddingX={1} justifyContent="space-between">
        <Text dimColor>
          {showCommands
            ? "↑↓ 选择 · Enter 执行 · Tab 补全 · Esc 关闭"
            : "输入 / 查看指令 · ↑↓ 历史"}
        </Text>
        <ContextGauge tokens={contextTokens} />
      </Box>
    </Box>
  );
}

function App({
  sessionId,
  showTools,
}: {
  sessionId: string;
  showTools: boolean;
}) {
  const { exit } = useApp();
  const nextId = useRef(0);
  const history = useRef<AgentInputItem[]>(getHistory(sessionId));
  const inputLog = useRef<string[]>([]);
  const inputPos = useRef(0);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    historyToMessages(history.current, replayOptions(showTools)).map((m) => ({
      ...m,
      id: nextId.current++,
    })),
  );
  const [partial, setPartial] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [phase, setPhase] = useState<"idle" | "thinking" | "asking">("idle");
  const [pending, setPending] = useState<AskUserRequest | null>(null);
  const [askIndex, setAskIndex] = useState(0);
  const [askFreeform, setAskFreeform] = useState(false);
  const [askInput, setAskInput] = useState("");
  const resolverRef = useRef<((result: AskUserResult) => void) | null>(null);
  const inFlightRef = useRef(false);
  const [contextTokens, setContextTokens] = useState(() =>
    estimateTokens(history.current),
  );

  const running = phase !== "idle";

  const handleInputChange = (v: string) => {
    setInput(v);
    setPopupDismissed(false);
  };

  // 以 / 开头且未按 Esc 关闭时，按前缀匹配指令
  const commands =
    input.startsWith("/") && !input.includes(" ") && !popupDismissed
      ? COMMANDS.filter((c) => c.name.startsWith(input))
      : [];
  // 索引在过滤后可能越界，这里统一收敛；切换输入时回到首项
  const commandIndex = Math.min(
    Math.max(selectedIndex, 0),
    commands.length - 1,
  );
  const activeCommand = commands[commandIndex];

  const push = (role: ChatMessage["role"], text: string) =>
    setMessages((prev) => [...prev, { id: nextId.current++, role, text }]);

  // 界面上永远追加自由输入出口；模型不需要自己加"其他"选项
  const askOptions: AskUserOption[] = pending
    ? [...pending.options, { label: OTHER_LABEL, description: "自己输入" }]
    : [];

  // 追问落地的唯一出口：选择、自由输入、跳过都经由这里，保证挂起的 run 一定继续
  function settle(result: AskUserResult) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (pending) {
      push("assistant", pending.question);
      push("user", isSkipped(result) ? SKIPPED_TEXT : result.answer);
    }
    setPending(null);
    setAskIndex(0);
    setAskFreeform(false);
    setAskInput("");
    setPhase("thinking");
    setStatus("生成回答中…");
    resolve?.(result);
  }

  const askUser = (request: AskUserRequest) =>
    new Promise<AskUserResult>((resolve) => {
      resolverRef.current = resolve;
      setPending(request);
      setAskIndex(0);
      setAskInput("");
      // 模型没给选项（如问出生日期）时直接进自由输入，不让用户先选一次"其他"
      setAskFreeform(request.options.length === 0);
      setPhase("asking");
    });

  const submitFreeform = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    settle({ answer: text, freeform: true });
  };

  // 卸载/退出时兜底落地，避免挂起的 Promise 让进程退不掉。
  // 仅 resolve 还不够：run 会继续跑到底并吊住事件循环，用户按下 Ctrl+C 后终端要等
  // 上好几分钟才回来，所以在途的 run 必须直接放弃。
  useEffect(
    () => () => {
      resolverRef.current?.({ skipped: true });
      resolverRef.current = null;
      if (inFlightRef.current) {
        // 留一拍给 ink 恢复终端状态，再结束进程
        setTimeout(() => process.exit(0), 50);
      }
    },
    [],
  );

  useEffect(() => {
    // callId → 进行中的轨迹：并行调用时 start/end 未必成对相邻，必须按 callId 配对，
    // 否则会把 A 工具的结果接到 B 工具的参数后面
    const pending = new Map<string, ToolTrace>();

    const onToolStart = (
      _ctx: unknown,
      tool: { name: string },
      details: unknown,
    ) => {
      setStatus(`正在调用 ${tool.name}…`);
      if (!showTools || !isTracedTool(tool.name)) return;
      const { callId, args } = readToolCall(details);
      pending.set(callId, buildTraceStart(callId, tool.name, args));
    };

    const onToolEnd = (
      _ctx: unknown,
      tool: { name: string },
      result: string,
      details: unknown,
    ) => {
      setStatus("生成回答中…");
      if (!showTools || !isTracedTool(tool.name)) return;
      const { callId } = readToolCall(details);
      const started =
        pending.get(callId) ?? buildTraceStart(callId, tool.name, undefined);
      pending.delete(callId);
      push("tool", formatTrace(withResult(started, result ?? "")));
    };

    parentingAgent.on("agent_tool_start", onToolStart);
    parentingAgent.on("agent_tool_end", onToolEnd);
    return () => {
      parentingAgent.off("agent_tool_start", onToolStart);
      parentingAgent.off("agent_tool_end", onToolEnd);
    };
  }, [showTools]);

  useInput((_value, key) => {
    // 追问分支置于最前并吃掉全部按键，避免 ↑↓ 漏到指令补全或输入历史
    if (phase === "asking" && pending) {
      const action = reduceAskKey(key, {
        freeform: askFreeform,
        index: askIndex,
        optionCount: askOptions.length,
        hasOptions: pending.options.length > 0,
      });
      switch (action.type) {
        case "move":
          setAskIndex((i) => {
            const next = i + action.delta;
            if (next < 0) return askOptions.length - 1;
            if (next > askOptions.length - 1) return 0;
            return next;
          });
          break;
        case "freeform":
          setAskFreeform(true);
          setAskInput("");
          break;
        case "choose": {
          const chosen = askOptions[action.index];
          if (chosen) settle({ answer: chosen.label, freeform: false });
          break;
        }
        case "back":
          setAskFreeform(false);
          setAskInput("");
          break;
        case "skip":
          settle({ skipped: true });
          break;
        default:
          break;
      }
      return;
    }
    if (running) return;
    if (commands.length > 0) {
      if (key.upArrow) {
        setSelectedIndex((i) => (i <= 0 ? commands.length - 1 : i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => (i >= commands.length - 1 ? 0 : i + 1));
        return;
      }
      if (key.tab && activeCommand) {
        setInput(activeCommand.name);
        return;
      }
      if (key.escape) {
        setPopupDismissed(true);
        return;
      }
    }
    if (inputLog.current.length === 0) return;
    if (key.upArrow) {
      inputPos.current = Math.max(0, inputPos.current - 1);
      setInput(inputLog.current[inputPos.current] ?? "");
    } else if (key.downArrow) {
      inputPos.current = Math.min(inputLog.current.length, inputPos.current + 1);
      setInput(inputLog.current[inputPos.current] ?? "");
    }
  });

  async function ask(question: string) {
    push("user", question);
    setPhase("thinking");
    setStatus("思考中…");
    inFlightRef.current = true;
    let answer = "";
    try {
      const result = await run(
        parentingAgent,
        [...history.current, user(question)],
        { maxTurns: 6, stream: true, context: { askUser } },
      );
      for await (const chunk of result.toTextStream()) {
        answer += chunk;
        setPartial(answer);
      }
      await result.completed;
      history.current = result.history;
      saveHistory(sessionId, result.history);
      const usage = result.rawResponses.at(-1)?.usage;
      setContextTokens(
        usage && usage.totalTokens > 0
          ? usage.totalTokens
          : estimateTokens(result.history),
      );
      push("assistant", answer || String(result.finalOutput ?? ""));
    } catch (err) {
      push("error", String(err));
    } finally {
      inFlightRef.current = false;
      setPartial("");
      setStatus(null);
      setPhase("idle");
    }
  }

  function onSubmit(raw: string) {
    const line = raw.trim();
    setInput("");
    setPopupDismissed(false);
    if (!line || running) return;

    // 前缀未写完时，Enter 直接执行当前高亮项；写全了则按字面执行
    const command = line.startsWith("/")
      ? COMMANDS.find((c) => c.name === line) ?? activeCommand
      : null;

    if (command?.name === "/exit") {
      exit();
      return;
    }
    if (command?.name === "/clear") {
      clearSession(sessionId);
      history.current = [];
      setMessages([]);
      setContextTokens(0);
      push("info", "会话已清空");
      return;
    }
    if (command) return;

    inputLog.current.push(line);
    inputPos.current = inputLog.current.length;
    void ask(line);
  }

  return (
    <Box flexDirection="column">
      <Static items={messages}>
        {(m) => <MessageView key={m.id} role={m.role} text={m.text} />}
      </Static>

      {partial !== "" && <MessageView role="assistant" text={partial} />}

      {phase === "asking" && pending ? (
        <AskQuestionView
          question={pending.question}
          options={askOptions}
          index={askIndex}
          freeform={askFreeform}
          input={askInput}
          onChange={setAskInput}
          onSubmit={submitFreeform}
          contextTokens={contextTokens}
        />
      ) : (
        <InputBox
          input={input}
          onChange={handleInputChange}
          onSubmit={onSubmit}
          running={running}
          status={status}
          contextTokens={contextTokens}
          commands={commands}
          commandIndex={commandIndex}
        />
      )}
    </Box>
  );
}

if (!process.stdin.isTTY) {
  console.error("chat TUI 需要 TTY 环境，管道/脚本场景请改用 pnpm cli");
  process.exit(1);
}

const argv = process.argv.slice(2);
const sessionId = parseSessionId(argv);
const showTools = parseShowTools(argv);
console.log(
  `育儿助手 · session: ${sessionId}${showTools ? " · 工具轨迹已开启" : ""}\n`,
);
render(<App sessionId={sessionId} showTools={showTools} />);
