import assert from "node:assert/strict";
import { reduceAskKey, type AskKeyState } from "../src/ask-keys.js";

// 选项层状态：模型给了 3 个选项，界面追加"其他，我自己说" → 共 4 项
const options = (index: number): AskKeyState => ({
  freeform: false,
  index,
  optionCount: 4,
  hasOptions: true,
});

// 自由输入层
const freeform = (hasOptions: boolean): AskKeyState => ({
  freeform: true,
  index: 0,
  optionCount: hasOptions ? 4 : 1,
  hasOptions,
});

const cases: [string, ReturnType<typeof reduceAskKey>, ReturnType<typeof reduceAskKey>][] =
  [];

function check(
  label: string,
  actual: ReturnType<typeof reduceAskKey>,
  expected: ReturnType<typeof reduceAskKey>,
) {
  cases.push([label, actual, expected]);
  assert.deepEqual(actual, expected, label);
}

// --- 选项层 ---
check("↑ 移动", reduceAskKey({ upArrow: true }, options(1)), {
  type: "move",
  delta: -1,
});
check("↓ 移动", reduceAskKey({ downArrow: true }, options(1)), {
  type: "move",
  delta: 1,
});
check("Enter 选中普通选项", reduceAskKey({ return: true }, options(0)), {
  type: "choose",
  index: 0,
});
check("Enter 选中末项（其他）转自由输入", reduceAskKey({ return: true }, options(3)), {
  type: "freeform",
});
check("Esc 在选项层 = 跳过", reduceAskKey({ escape: true }, options(2)), {
  type: "skip",
});
check("其他按键不触发动作", reduceAskKey({}, options(2)), { type: "none" });

// --- 自由输入层 ---
check("Esc 有选项时退回选项层", reduceAskKey({ escape: true }, freeform(true)), {
  type: "back",
});
check("Esc 无选项时直接跳过", reduceAskKey({ escape: true }, freeform(false)), {
  type: "skip",
});
check("↑↓ 在自由输入层被吃掉", reduceAskKey({ upArrow: true }, freeform(true)), {
  type: "none",
});
check("Enter 在自由输入层交给 TextInput", reduceAskKey({ return: true }, freeform(true)), {
  type: "none",
});

// --- 边界 ---
check(
  "空选项列表时 Enter 无动作",
  reduceAskKey({ return: true }, { freeform: false, index: 0, optionCount: 0, hasOptions: false }),
  { type: "none" },
);

for (const [label] of cases) console.log("  ✓", label);
console.log(`\n追问按键语义：${cases.length} 项全部通过`);
