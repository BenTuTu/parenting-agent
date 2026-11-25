> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 环境配置

所有配置通过项目根目录的 `.env` 文件读取（`.env` 已被 git 忽略，请勿提交密钥）。

| 变量                | 必填 | 说明                  | 示例                                  |
| ----------------- | -- | ------------------- | ----------------------------------- |
| `OPENAI_API_KEY`  | ✅  | 模型服务的 API Key       | `sk-...`                            |
| `OPENAI_BASE_URL` | ✅  | OpenAI 兼容接口地址       | `https://your-proxy.example.com/v1` |
| `MODEL_NAME`      | ✅  | 使用的模型名称             | `gpt-5.6-sol`                       |
| `PORT`            |    | HTTP 服务端口，默认 `3000` | `3000`                              |

## 关于兼容代理

项目内部做了两件事，以便顺畅接入兼容代理：

- `setOpenAIAPI("chat_completions")`：使用 Chat Completions 协议，兼容性最好
- `setTracingDisabled(true)`：关闭向 OpenAI 官方上传 trace（使用代理 Key 时会 401）

## 流程日志

运行时会输出 Agent / 工具的生命周期日志，便于排查。交互式聊天 `pnpm chat` 默认以 `FLOW_LOG=off` 关闭日志，保持界面清爽。
