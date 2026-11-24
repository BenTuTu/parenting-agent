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

详细说明见 [环境配置](./configuration)。

## 4. 开始聊天

```bash
# 交互式终端聊天（推荐）
pnpm chat

# 单次提问（流式输出）
pnpm cli "宝宝8个月，长了两颗牙，多大可以开始刷牙？"

# 启动 HTTP 服务
pnpm dev
```

::: tip 小提示
第一次聊天时，可以先告诉小芽宝宝的出生日期，例如"我家女儿出生日期是 2025-01-10"，后续的回答都会自动对准宝宝的月龄。
:::

## 自检

```bash
pnpm smoke "10个月宝宝应该会什么？"   # 冒烟测试（真实调用模型）
npx tsx test/wiki-test.ts             # wiki 工具单测（不依赖模型）
```
