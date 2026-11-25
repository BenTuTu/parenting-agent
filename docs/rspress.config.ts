import * as path from 'node:path'
import { defineConfig } from '@rspress/core'

export const GITHUB_URL = 'https://github.com/BenTuTu/parenting-agent'

// GitHub Pages 项目站点部署在 https://<用户名>.github.io/<仓库名>/ 下，base 必须是 '/<仓库名>/'。
// 若改用自定义域名或 <用户名>.github.io 仓库，改回 '/'。
const BASE = '/parenting-agent/'

export default defineConfig({
  root: path.join(__dirname, 'content'),
  base: BASE,
  lang: 'zh',
  title: '小芽育儿助手',
  description: '陪伴 0-8 岁宝宝成长的 AI 育儿科普伙伴 · Parenting Agent',
  icon: '/logo.svg',
  logo: '/logo.svg',
  logoText: '小芽育儿助手',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '使用文档', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: 'Playground', link: '/playground' },
      { text: '常见问题', link: '/guide/faq' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '🌱 认识小芽',
          items: [
            { text: '项目介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '环境配置', link: '/guide/configuration' },
          ],
        },
        {
          text: '💬 开始对话',
          items: [
            { text: '交互式聊天', link: '/guide/chat' },
            { text: '命令行', link: '/guide/cli' },
            { text: 'HTTP API', link: '/guide/http-api' },
          ],
        },
        {
          text: '📚 知识与安全',
          items: [
            { text: '工具与知识来源', link: '/guide/tools' },
            { text: '扩充 Wiki 知识', link: '/guide/wiki' },
            { text: '安全边界', link: '/guide/safety' },
          ],
        },
        {
          text: '🧸 其他',
          items: [{ text: '常见问题', link: '/guide/faq' }],
        },
      ],
    },

    socialLinks: [{ icon: 'github', mode: 'link', content: GITHUB_URL }],
    lastUpdated: true,
    footer: {
      message:
        '内容仅供育儿科普参考，不能替代专业医生的诊断与建议 💛<br/>用心陪伴每一次成长 · Parenting Agent',
    },
  },

  builderConfig: {
    source: {
      define: {
        // Playground 默认 API 地址（构建时注入），例如 API_BASE=https://api.example.com pnpm build
        __PLAYGROUND_API_BASE__: JSON.stringify(process.env.API_BASE ?? ''),
      },
    },
    server: {
      // 文档站固定用 5173：Rspress 默认的 3000 会和 agent 服务冲突，
      // 冲突时浏览器连到文档站自身，/api 代理又转发回自己，请求永远 pending。
      // strictPort：端口被占用时直接报错，而不是悄悄换端口。
      port: 5173,
      strictPort: true,
      // 本地调试：Playground 请求同源 /api，转发到根目录 `pnpm dev` 启动的 agent 服务。
      // 用 127.0.0.1 而不是 localhost，避免 IPv6 解析到别的进程。
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  },
})
