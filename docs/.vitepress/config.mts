import { defineConfig } from 'vitepress'

export const GITHUB_URL = 'https://github.com/BenTuTu/parenting-agent'

// GitHub Pages 项目站点部署在 https://<用户名>.github.io/<仓库名>/ 下，
// 所以 base 必须是 '/<仓库名>/'。若改用自定义域名或 <用户名>.github.io 仓库，改回 '/'。
const BASE = '/parenting-agent/'

export default defineConfig({
  base: BASE,
  lang: 'zh-CN',
  title: '小芽育儿助手',
  description: '陪伴 0-8 岁宝宝成长的 AI 育儿科普伙伴 · Parenting Agent',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#f4a582' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '小芽育儿助手',

    nav: [
      { text: '首页', link: '/' },
      { text: '使用文档', link: '/guide/introduction', activeMatch: '/guide/' },
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

    socialLinks: [{ icon: 'github', link: GITHUB_URL }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',

    footer: {
      message: '内容仅供育儿科普参考，不能替代专业医生的诊断与建议 💛',
      copyright: '用心陪伴每一次成长 · Parenting Agent',
    },
  },
})
