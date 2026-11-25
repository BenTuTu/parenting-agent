import { withBase } from '@rspress/core/runtime'
import './HomeSections.css'

const STAGES = [
  { emoji: '👶', age: '0-3 月', text: '吃奶、睡觉、第一次抬头' },
  { emoji: '🙂', age: '4-6 月', text: '翻身、咯咯笑、尝试辅食' },
  { emoji: '🪑', age: '7-9 月', text: '独坐、爬行、认生' },
  { emoji: '🚶', age: '10-12 月', text: '扶站、迈步、叫"妈妈"' },
  { emoji: '🗣️', age: '1-2 岁', text: '词汇爆发、自己吃饭' },
  { emoji: '🎨', age: '2-3 岁', text: '如厕训练、想象游戏' },
  { emoji: '🎒', age: '3-6 岁', text: '入园适应、交朋友' },
  { emoji: '📚', age: '6-8 岁', text: '上学啦、规则与自律' },
]

const PROMISES = [
  { icon: '🔍', title: '有据可查', text: '事实性知识只来自精选数据，模型不编造。' },
  { icon: '🩺', title: '不做诊断', text: '只做科普与护理建议，健康问题请咨询医生。' },
  { icon: '🚨', title: '红旗优先', text: '危险信号出现时，第一句话就是"请尽快就医"。' },
]

export default function HomeSections() {
  return (
    <div className="hs">
      {/* 成长时间线 */}
      <section className="hs-block">
        <h2 className="hs-title">从第一声啼哭，到背上小书包</h2>
        <p className="hs-subtitle">小芽陪伴 0-8 岁的每一个成长阶段</p>
        <div className="hs-timeline">
          {STAGES.map((s) => (
            <div key={s.age} className="hs-stage">
              <div className="hs-bubble">{s.emoji}</div>
              <div className="hs-age">{s.age}</div>
              <div className="hs-text">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 对话示例 */}
      <section className="hs-block">
        <h2 className="hs-title">像和一位懂行的朋友聊天</h2>
        <p className="hs-subtitle">半夜也能随时问，回答温柔、清楚、有出处</p>
        <div className="hs-chat">
          <div className="hs-msg hs-user">宝宝 8 个月，长了两颗牙，多大可以开始刷牙呀？</div>
          <div className="hs-msg hs-bot">
            <strong>🌱 现在就可以开始啦！</strong>
            <br />
            第一颗牙萌出后就建议清洁口腔：用指套牙刷或软毛婴儿牙刷，每天早晚各一次，3 岁前含氟牙膏用量约
            <b>米粒大小</b>……
            <div className="hs-source">📖 来源：本地知识库《乳牙护理：从第一颗牙开始刷》</div>
            <div className="hs-note">以上为科普信息，不能替代医生面诊。</div>
          </div>
          <div className="hs-msg hs-user">那他晚上老是醒，正常吗？</div>
          <div className="hs-msg hs-bot">
            8 个月左右常见分离焦虑与睡眠波动，先别担心 💛 想多了解一点：
            <div className="hs-options">
              <span>入睡困难</span>
              <span>夜醒频繁</span>
              <span>早醒</span>
            </div>
          </div>
        </div>
      </section>

      {/* 安全承诺 */}
      <section className="hs-block">
        <h2 className="hs-title">我们的三个小约定</h2>
        <p className="hs-subtitle">关于宝宝的事，再小也要认真对待</p>
        <div className="hs-promises">
          {PROMISES.map((p) => (
            <div key={p.title} className="hs-promise">
              <div className="hs-promise-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 行动召唤 */}
      <section className="hs-cta">
        <h2>准备好了吗？三分钟把小芽请回家 🏡</h2>
        <p>只需 Node.js、pnpm 和一个 OpenAI 兼容的模型接口。</p>
        <div className="hs-cta-actions">
          <a className="hs-cta-btn" href={withBase('/guide/getting-started')}>
            查看快速开始
          </a>
          <a className="hs-cta-btn hs-cta-alt" href={withBase('/playground')}>
            在线试一试
          </a>
        </div>
      </section>
    </div>
  )
}
