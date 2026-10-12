// 月龄区间规则：闭区间 [minMonth, maxMonth]，各区间不重叠且连续覆盖 0-96 月，
// 整数月龄 m 命中唯一满足 minMonth <= m <= maxMonth 的区间（如 12 命中 [10,12]，13 命中 [13,18]）。
export interface MilestoneStage {
  minMonth: number;
  maxMonth: number;
  stageLabel: string;
  grossMotor: string[];
  fineMotor: string[];
  language: string[];
  socialCognitive: string[];
  redFlags: string[];
}

export const milestoneStages: MilestoneStage[] = [
  {
    minMonth: 0,
    maxMonth: 3,
    stageLabel: "新生儿期（0-3个月）",
    grossMotor: ["俯卧时能短暂抬头", "3个月左右俯卧能抬头45-90度", "四肢有力活动"],
    fineMotor: ["双手多呈握拳状并逐渐放松", "会抓握放入手心的物品（抓握反射）"],
    language: ["对突然的声音有惊跳反应", "会发出咕咕声", "哭声有不同含义"],
    socialCognitive: ["注视人脸", "2个月左右出现社交性微笑", "眼睛能追随移动的物体"],
    redFlags: [
      "3个月仍完全不能抬头",
      "对大声无任何反应",
      "不注视人脸、无眼神接触",
      "四肢异常僵硬或异常松软",
    ],
  },
  {
    minMonth: 4,
    maxMonth: 6,
    stageLabel: "婴儿早期（4-6个月）",
    grossMotor: ["会翻身（先仰卧到俯卧）", "扶坐时头部稳定", "6个月左右可短暂独坐"],
    fineMotor: ["主动伸手够物", "双手能在胸前互握", "会把物品从一只手换到另一只手"],
    language: ["咿呀发音（ba、ma等音节雏形）", "对自己的名字有反应", "会用声音表达高兴或不满"],
    socialCognitive: ["会大声笑", "对镜子里的自己感兴趣", "能分辨熟人和陌生人"],
    redFlags: [
      "6个月仍不会翻身",
      "扶坐时头部持续后仰",
      "不伸手够物",
      "对逗引没有笑的回应",
    ],
  },
  {
    minMonth: 7,
    maxMonth: 9,
    stageLabel: "婴儿中期（7-9个月）",
    grossMotor: ["独坐稳", "开始爬行（匍匐或手膝爬）", "扶物可站立"],
    fineMotor: ["用拇指和其他手指抓小物品", "会双手各拿一个物品对敲"],
    language: ["发出连续音节（baba、mama，尚无所指）", "听懂简单指令如'不行'", "模仿声音"],
    socialCognitive: ["出现认生（陌生人焦虑）", "会玩躲猫猫", "寻找掉落的物品（客体永存萌芽）"],
    redFlags: [
      "9个月仍不能独坐",
      "不会发任何音节",
      "对名字毫无反应",
      "双侧肢体活动明显不对称",
    ],
  },
  {
    minMonth: 10,
    maxMonth: 12,
    stageLabel: "婴儿晚期（10-12个月）",
    grossMotor: ["扶物行走（巡航）", "独站片刻", "部分宝宝迈出第一步"],
    fineMotor: ["精准的拇食指对捏（捏起小颗粒）", "会把物品放进容器再拿出来", "拍手、挥手再见"],
    language: ["有所指地叫'爸爸/妈妈'", "听懂并执行简单指令（配合手势）", "会用手指物表达需求"],
    socialCognitive: ["模仿大人动作", "对'不'有反应", "把玩具递给大人分享"],
    redFlags: [
      "12个月不会扶站",
      "不会用手指物",
      "叫名字没有回应",
      "没有任何有意义的发音或手势（如挥手）",
    ],
  },
  {
    minMonth: 13,
    maxMonth: 18,
    stageLabel: "学步期早期（13-18个月）",
    grossMotor: ["独立行走", "会蹲下捡东西再站起", "扶栏杆上台阶"],
    fineMotor: ["搭2-4块积木", "会用勺子（虽然洒）", "翻厚页书"],
    language: ["会说3-20个单词", "听懂常见物品名称", "用摇头/点头表达"],
    socialCognitive: ["出现假装游戏雏形（拿杯子假装喝水）", "分离焦虑明显", "指认身体部位1-2个"],
    redFlags: [
      "18个月仍不会独立行走",
      "不会说任何单词",
      "不会用手指指物给大人看（分享性指物缺失）",
      "对互动游戏没有兴趣",
    ],
  },
  {
    minMonth: 19,
    maxMonth: 24,
    stageLabel: "学步期（19-24个月）",
    grossMotor: ["跑得较稳", "会踢球", "扶栏独自上下楼梯"],
    fineMotor: ["搭6块以上积木", "模仿画竖线", "会拧开瓶盖"],
    language: ["词汇量50个以上", "说两词短句（'妈妈抱'）", "能执行两步指令"],
    socialCognitive: ["平行游戏（和小朋友各玩各的）", "开始说'我的'（自我意识）", "简单假装游戏"],
    redFlags: [
      "24个月词汇量少于15个",
      "不会说两词短句",
      "不模仿大人的动作或言语",
      "曾经会说的话明显退步（语言倒退需尽快就医评估）",
    ],
  },
  {
    minMonth: 25,
    maxMonth: 36,
    stageLabel: "幼儿期（2-3岁）",
    grossMotor: ["双脚跳", "交替脚上楼梯", "骑三轮车（3岁左右）"],
    fineMotor: ["模仿画圆", "串珠子", "自己洗手并擦干"],
    language: ["说3-4词句子", "陌生人能听懂大约一半到四分之三", "会问'为什么'"],
    socialCognitive: ["开始轮流和分享（不稳定）", "知道自己的性别和年龄", "情绪大但开始能被语言安抚"],
    redFlags: [
      "3岁语言仍以单词为主、无短句",
      "陌生人几乎完全听不懂其说话",
      "不与其他孩子互动、回避眼神",
      "频繁刻板重复行为且干扰生活",
    ],
  },
  {
    minMonth: 37,
    maxMonth: 48,
    stageLabel: "学龄前早期（3-4岁）",
    grossMotor: ["单脚站2秒以上", "接住弹起的球", "熟练攀爬"],
    fineMotor: ["画人（头+腿的蝌蚪人）", "用剪刀沿线剪", "自己穿脱简单衣物"],
    language: ["说完整句子并讲简单的事", "理解'相同/不同'", "背诵简单儿歌"],
    socialCognitive: ["合作游戏", "有想象中的角色扮演", "开始理解规则"],
    redFlags: [
      "4岁仍不能说完整句子",
      "不参与假装游戏",
      "无法离开主要照料者（极端分离困难）",
      "对同伴完全没有兴趣",
    ],
  },
  {
    minMonth: 49,
    maxMonth: 72,
    stageLabel: "学龄前期（4-6岁）",
    grossMotor: ["单脚跳、跳绳雏形", "熟练跑跳攀爬", "拍球数次"],
    fineMotor: ["写自己的名字（部分笔画）", "画6个部位以上的人", "使用筷子"],
    language: ["讲有情节的完整故事", "分清'昨天/今天/明天'", "发音基本清晰"],
    socialCognitive: ["有固定的朋友", "理解并遵守游戏规则", "能区分现实与想象（逐步）"],
    redFlags: [
      "5岁后发音仍大量含糊、影响交流",
      "无法专注任何活动超过5分钟",
      "极端攻击行为或极端退缩",
      "日常自理（如厕、穿衣）明显落后同龄",
    ],
  },
  {
    minMonth: 73,
    maxMonth: 96,
    stageLabel: "学龄早期（6-8岁）",
    grossMotor: ["骑两轮自行车", "跳绳连续多次", "参与规则性体育活动"],
    fineMotor: ["书写流畅度提升", "使用工具做简单手工", "系鞋带"],
    language: ["阅读简单书籍", "书面表达简单句子", "理解笑话和双关（萌芽）"],
    socialCognitive: ["重视友谊与同伴认同", "理解输赢并逐步接受失败", "有初步的时间和金钱概念"],
    redFlags: [
      "阅读/书写困难显著落后同龄（需评估学习障碍）",
      "无法维持任何同伴关系",
      "持续的躯体化抱怨（频繁肚子疼/头疼）伴随上学回避",
      "情绪爆发频繁且强度与年龄不符",
    ],
  },
];

export function findStageByMonth(ageMonths: number): MilestoneStage | undefined {
  return milestoneStages.find(
    (s) => ageMonths >= s.minMonth && ageMonths <= s.maxMonth,
  );
}
