# Tasks: add-chat-tui

## 1. 基础设施

- [x] 1.1 `src/logger.ts`：`logStep` 增加 `FLOW_LOG=off` 静音判断（默认行为不变）
- [x] 1.2 安装依赖 `ink react ink-text-input ink-spinner`（及 `@types/react`）；`tsconfig.json` 增加 `"jsx": "react-jsx"`；`package.json` 增加 `"chat": "FLOW_LOG=off tsx src/chat.tsx"` 脚本

## 2. TUI 实现

- [x] 2.1 创建 `src/chat.tsx`：解析 `--session`（默认 cli）；非 TTY 时提示改用 `pnpm cli` 并以非零码退出
- [x] 2.2 App 组件：`<Static>` 已完成消息列表（启动时从 getHistory 过滤 user/assistant message 回放）、流式消息区（state 累积 chunk）、StatusLine（订阅 agent_tool_start/agent_tool_end 显示 spinner+工具名）、TextInput（运行中禁用）
- [x] 2.3 提问流程：run(..., {stream:true}) → for await toTextStream 增量渲染 → await completed → 消息转入 Static + saveHistory；错误渲染为红色消息不崩进程
- [x] 2.4 命令处理：`/exit`（恢复终端退出）、`/clear`（clearSession + 清空消息列表）；输入历史上下键翻阅

## 3. 验证与 spec 同步

- [x] 3.1 `tsc --noEmit` 通过；`FLOW_LOG=off` 下 server/cli 冒烟确认默认日志行为不变（未设置时照常输出）
- [x] 3.2 TUI 手动验收：连续两轮提问（第二轮利用第一轮月龄上下文）、工具状态行显示、/clear 后历史清空、重开 TUI 恢复历史、非 TTY 启动报错退出
- [x] 3.3 同步主 specs（新增 chat-tui、flow-logging 加日志开关需求），`openspec validate --all` 通过

## 4. 红旗警告特殊样式（追加 scope）

- [x] 4.1 agent instructions：红旗分诊回复必须以 `⚠️【红旗警示】` 固定标记开头
- [x] 4.2 chat.tsx：MessageView 识别标记渲染红色边框警示容器（含流式增量与历史回放），正文剥离标记
- [x] 4.3 验证：smoke 确认标记输出；TUI 伪终端验收红框渲染；同步 specs

## 5. Markdown 渲染（追加 scope）

- [x] 5.1 chat.tsx：行级 Markdown 渲染（标题/列表/粗体，"何时就医"红色标题），流式安全（完成行稳定、未闭合粗体补闭合），应用于流式区/Static/红旗容器
- [x] 5.2 验证：TUI 伪终端确认流式逐帧解析、无原始标记外泄、行内粗体不折行；同步 specs
