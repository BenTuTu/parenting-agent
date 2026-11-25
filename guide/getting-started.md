> For AI agents: the complete documentation index is available at /parenting-agent/llms.txt, the full documentation bundle is available at /parenting-agent/llms-full.txt.

# 快速开始

只要三步，就能和小芽聊上天 🍼

## 1. 准备环境

- [Node.js](https://nodejs.org/) 20 及以上
- [pnpm](https://pnpm.io/)
- 一个 OpenAI 兼容的模型接口（官方 API 或兼容代理均可）

## 2. 安装依赖

```bash
git clone https://github.com/BenTuTu/parenting-agent.git
cd parenting-agent
pnpm install
```

## 3. 配置模型

复制示例配置并填写(以 DeepSeek 为例)：

```bash
cp .env.example .env
```

```ini
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
PORT=3000
```

详细说明见 [环境配置](/parenting-agent/guide/configuration.md)。

## 4. 开始聊天

```bash
# 交互式终端聊天（推荐）
pnpm chat

# 单次提问（流式输出）
pnpm cli "宝宝8个月，长了两颗牙，多大可以开始刷牙？"

# 启动 HTTP 服务
pnpm dev
```

:::tip 小提示
第一次聊天时，可以先告诉小芽宝宝的出生日期，例如"我家女儿出生日期是 2025-01-10"，后续的回答都会自动对准宝宝的月龄。
:::

## 自检

```bash
pnpm smoke "10个月宝宝应该会什么？"   # 冒烟测试（真实调用模型）
npx tsx test/wiki-test.ts             # wiki 工具单测（不依赖模型）
```

## 在网页上聊天（Playground）

官网自带一个 [Playground](/parenting-agent/playground.md) 页面，直接调用服务端的 `POST /api/agent/chat`（SSE 流式）。本地调试：

```bash
# 终端 1：项目根目录启动 agent 服务（默认 3000 端口）
pnpm dev

# 终端 2：启动文档站
cd docs && pnpm install && pnpm dev
```

打开 [http://localhost:5173/parenting-agent/playground](http://localhost:5173/parenting-agent/playground) 即可提问（文档站固定使用 5173 端口，避免与 agent 服务的 3000 冲突）。开发服务器会把 `/api` 代理到 `http://localhost:3000`，不需要处理跨域；服务端口不同时，可以用 `API_PROXY_TARGET=http://localhost:4000 pnpm dev` 修改代理目标。

:::tip 部署后的线上 Playground
GitHub Pages 只托管静态页面，线上使用需要一个公网可访问的 agent 服务：

1. 服务端设置跨域白名单：`CORS_ORIGINS=https://bentutu.github.io pnpm dev`
2. 在 Playground 的「⚙️ 设置」里填写服务地址；也可以在构建时用 `API_BASE=https://your-api.example.com pnpm build` 写入默认值
   :::
