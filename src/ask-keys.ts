/**
 * 追问界面的按键语义，抽成纯函数以便离线验证。
 *
 * 两级 Esc 是"挂起的 run 一定能落地"的主要保障，逻辑埋在 useInput 里无法单独测，
 * 因此这里只做"按键 → 动作"的映射，副作用留给调用方。
 *
 * 约定：选项列表末尾恒为界面追加的"其他，我自己说"，故 index === optionCount - 1
 * 即选中了自由输入出口。
 */

export interface AskKey {
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  escape?: boolean;
}

export interface AskKeyState {
  /** 是否处于自由输入子态 */
  freeform: boolean;
  /** 选项层当前高亮下标 */
  index: number;
  /** 选项总数，含末尾的"其他，我自己说" */
  optionCount: number;
  /** 模型是否给出了真实选项（决定自由输入层的 Esc 是"返回"还是"跳过"） */
  hasOptions: boolean;
}

export type AskAction =
  | { type: "move"; delta: 1 | -1 }
  | { type: "freeform" }
  | { type: "choose"; index: number }
  | { type: "back" }
  | { type: "skip" }
  | { type: "none" };

export function reduceAskKey(key: AskKey, state: AskKeyState): AskAction {
  if (state.freeform) {
    // 自由输入层：字符交给 TextInput，这里只处理退出语义
    if (key.escape) {
      return state.hasOptions ? { type: "back" } : { type: "skip" };
    }
    return { type: "none" };
  }

  if (key.upArrow) return { type: "move", delta: -1 };
  if (key.downArrow) return { type: "move", delta: 1 };
  if (key.return) {
    if (state.optionCount === 0) return { type: "none" };
    return state.index === state.optionCount - 1
      ? { type: "freeform" }
      : { type: "choose", index: state.index };
  }
  if (key.escape) return { type: "skip" };
  return { type: "none" };
}
