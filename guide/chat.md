> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 交互式聊天

`pnpm chat` 会打开一个基于 [Ink](https://github.com/vadimdemedes/ink) 的终端聊天界面，适合日常使用。

```bash
pnpm chat
pnpm chat --session baby-mia     # 指定会话 ID，记住宝宝的情况
pnpm chat --show-tools           # 显示工具调用过程
```

## 斜杠命令

| 命令       | 说明     |
| -------- | ------ |
| `/clear` | 清空当前会话 |
| `/exit`  | 退出聊天   |

输入 `/` 会弹出命令提示，用 <kbd>↑</kbd> <kbd>↓</kbd> 选择，<kbd>Tab</kbd> 补全，<kbd>Esc</kbd> 关闭。

## 小芽的追问

当缺少关键信息（比如月龄、症状细节）时，小芽会先向你提一个问题，并给出可选项：

```
宝宝现在多大啦？
  ❯ 0-3个月
    4-6个月
    7-12个月
    1岁以上
```

用方向键选择后回车即可；答案无法枚举时（比如出生日期），会直接让你自由输入。
