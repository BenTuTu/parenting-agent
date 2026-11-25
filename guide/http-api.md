> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# HTTP API

启动服务：

```bash
pnpm dev   # 默认监听 http://localhost:3000
```

## 发送消息

`POST /api/agent/chat`

| 字段          | 类型      | 必填 | 说明                 |
| ----------- | ------- | -- | ------------------ |
| `sessionId` | string  | ✅  | 会话 ID，同一 ID 共享上下文  |
| `message`   | string  | ✅  | 家长的问题              |
| `stream`    | boolean |    | `true` 时以 SSE 流式返回 |
| `verbose`   | boolean |    | 流式模式下额外推送工具调用事件    |

### 非流式

```bash
curl -X POST localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"u1","message":"宝宝发烧38.2度怎么办？"}'
```

```json
{ "sessionId": "u1", "reply": "……" }
```

### 流式（SSE）

```bash
curl -N -X POST localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"u1","message":"该不该用安抚奶嘴？","stream":true}'
```

事件格式：

```text
data: {"delta":"安抚奶嘴"}                       // 增量文本
data: {"tool":{"phase":"start","name":"search_wiki",...}}  // verbose=true 时
data: {"done":true,"sessionId":"u1"}             // 结束
```

## 清除会话

`DELETE /api/agent/chat/:sessionId`

```bash
curl -X DELETE localhost:3000/api/agent/chat/u1
# { "ok": true }
```

## 错误

| 状态码   | 说明                                 |
| ----- | ---------------------------------- |
| `400` | `sessionId` 或 `message` 缺失 / 不是字符串 |
| `500` | Agent 运行失败                         |

更多用例见仓库中的 `test/api.http`。
