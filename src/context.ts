/**
 * 宿主在发起 run 时注入的运行上下文。
 *
 * `askUser` 是交互能力的唯一来源：注入了它的宿主（TUI）才会把
 * ask_user_question 工具下发给模型，未注入的宿主（cli/server）中该工具不可见。
 * 能力与开关是同一个事实，不会漂移。
 */

export interface AskUserOption {
  label: string;
  description?: string;
}

export interface AskUserRequest {
  question: string;
  options: AskUserOption[];
}

export type AskUserResult =
  | { answer: string; freeform: boolean }
  | { skipped: true };

export interface AppContext {
  askUser?: (request: AskUserRequest) => Promise<AskUserResult>;
}

export function isSkipped(
  result: AskUserResult,
): result is { skipped: true } {
  return "skipped" in result;
}
