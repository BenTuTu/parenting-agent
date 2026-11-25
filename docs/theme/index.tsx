// 自定义主题：https://rspress.rs/guide/basic/custom-theme
import { HomeLayout as BasicHomeLayout } from '@rspress/core/theme-original'
import HomeSections from './components/HomeSections'
import './index.css'

/** 在默认首页（Hero + Features）之后追加成长时间线、对话示例等区块 */
export function HomeLayout() {
  return <BasicHomeLayout afterFeatures={<HomeSections />} />
}

export * from '@rspress/core/theme-original'
