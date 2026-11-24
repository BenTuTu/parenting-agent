<script setup lang="ts">
import { withBase } from 'vitepress'

const stages = [
  { emoji: '👶', age: '0-3 月', text: '吃奶、睡觉、第一次抬头' },
  { emoji: '🙂', age: '4-6 月', text: '翻身、咯咯笑、尝试辅食' },
  { emoji: '🪑', age: '7-9 月', text: '独坐、爬行、认生' },
  { emoji: '🚶', age: '10-12 月', text: '扶站、迈步、叫"妈妈"' },
  { emoji: '🗣️', age: '1-2 岁', text: '词汇爆发、自己吃饭' },
  { emoji: '🎨', age: '2-3 岁', text: '如厕训练、想象游戏' },
  { emoji: '🎒', age: '3-6 岁', text: '入园适应、交朋友' },
  { emoji: '📚', age: '6-8 岁', text: '上学啦、规则与自律' },
]

const promises = [
  { icon: '🔍', title: '有据可查', text: '事实性知识只来自精选数据，模型不编造。' },
  { icon: '🩺', title: '不做诊断', text: '只做科普与护理建议，健康问题请咨询医生。' },
  { icon: '🚨', title: '红旗优先', text: '危险信号出现时，第一句话就是"请尽快就医"。' },
]
</script>

<template>
  <div class="home-sections">
    <!-- 成长时间线 -->
    <section class="block">
      <h2 class="title">从第一声啼哭，到背上小书包</h2>
      <p class="subtitle">小芽陪伴 0-8 岁的每一个成长阶段</p>
      <div class="timeline">
        <div v-for="s in stages" :key="s.age" class="stage">
          <div class="bubble">{{ s.emoji }}</div>
          <div class="age">{{ s.age }}</div>
          <div class="text">{{ s.text }}</div>
        </div>
      </div>
    </section>

    <!-- 对话示例 -->
    <section class="block">
      <h2 class="title">像和一位懂行的朋友聊天</h2>
      <p class="subtitle">半夜也能随时问，回答温柔、清楚、有出处</p>
      <div class="chat">
        <div class="msg user">宝宝 8 个月，长了两颗牙，多大可以开始刷牙呀？</div>
        <div class="msg bot">
          <strong>🌱 现在就可以开始啦！</strong><br />
          第一颗牙萌出后就建议清洁口腔：用指套牙刷或软毛婴儿牙刷，每天早晚各一次，
          牙膏用量约<b>米粒大小</b>的含氟牙膏……
          <div class="source">📖 来源：本地知识库《宝宝刷牙指南》</div>
          <div class="note">以上为科普信息，不能替代医生面诊。</div>
        </div>
        <div class="msg user">那他晚上老是醒，正常吗？</div>
        <div class="msg bot">
          8 个月左右常见分离焦虑与睡眠波动，先别担心 💛 想多了解一点：
          <div class="options">
            <span>入睡困难</span><span>夜醒频繁</span><span>早醒</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 安全承诺 -->
    <section class="block">
      <h2 class="title">我们的三个小约定</h2>
      <p class="subtitle">关于宝宝的事，再小也要认真对待</p>
      <div class="promises">
        <div v-for="p in promises" :key="p.title" class="promise">
          <div class="icon">{{ p.icon }}</div>
          <h3>{{ p.title }}</h3>
          <p>{{ p.text }}</p>
        </div>
      </div>
    </section>

    <!-- 行动召唤 -->
    <section class="cta">
      <h2>准备好了吗？三分钟把小芽请回家 🏡</h2>
      <p>只需 Node.js、pnpm 和一个 OpenAI 兼容的模型接口。</p>
      <a class="cta-btn" :href="withBase('/guide/getting-started')">查看快速开始</a>
    </section>
  </div>
</template>

<style scoped>
.home-sections {
  max-width: 1152px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}
@media (min-width: 640px) {
  .home-sections { padding: 24px 48px 80px; }
}
@media (min-width: 960px) {
  .home-sections { padding: 24px 64px 96px; }
}
.block { margin-top: 72px; }
.title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.subtitle {
  text-align: center;
  margin-top: 8px;
  color: var(--vp-c-text-2);
}

/* 时间线 */
.timeline {
  margin-top: 36px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  position: relative;
}
.stage {
  text-align: center;
  padding: 18px 8px;
  border-radius: 20px;
  background: var(--vp-c-bg-elv);
  border: 1px dashed rgba(244, 165, 130, 0.5);
}
.bubble {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 28px;
  background: linear-gradient(135deg, #fde7dc, #dff0d8);
}
.age { margin-top: 10px; font-weight: 700; color: var(--vp-c-brand-1); }
.text { margin-top: 4px; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; }

/* 对话 */
.chat {
  margin: 36px auto 0;
  max-width: 680px;
  padding: 28px;
  border-radius: 28px;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 20px 50px -24px rgba(232, 135, 95, 0.35);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.msg {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 20px;
  line-height: 1.7;
  font-size: 15px;
}
.msg.user {
  align-self: flex-end;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.msg.bot {
  align-self: flex-start;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 6px;
}
.source { margin-top: 8px; font-size: 13px; color: var(--vp-c-text-2); }
.note { font-size: 12px; color: var(--vp-c-text-3); }
.options { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.options span {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid var(--vp-c-brand-3);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
}

/* 承诺 */
.promises {
  margin-top: 36px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
.promise {
  padding: 28px 24px;
  border-radius: 24px;
  text-align: center;
  background: linear-gradient(160deg, var(--vp-c-bg-elv), var(--vp-c-bg-soft));
}
.promise .icon { font-size: 36px; }
.promise h3 { margin-top: 10px; font-size: 18px; font-weight: 700; }
.promise p { margin-top: 6px; font-size: 14px; color: var(--vp-c-text-2); line-height: 1.6; }

/* CTA */
.cta {
  margin-top: 80px;
  padding: 48px 24px;
  text-align: center;
  border-radius: 32px;
  background: linear-gradient(120deg, #fde7dc, #fbd9d3 45%, #dff0d8);
  color: #5b4036;
}
.cta h2 { font-size: 24px; font-weight: 700; }
.cta p { margin-top: 8px; opacity: 0.85; }
.cta-btn {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 28px;
  border-radius: 999px;
  background: #e07a52;
  color: #fff !important;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cta-btn:hover { transform: translateY(-2px); }
</style>
