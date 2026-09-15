import { Coins, Image, Info, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { useState } from 'react';
import { getModelLabel } from '../lib/modelLabels.js';
import shared from '../styles/shared.module.css';
import styles from './PricingInfoPage.module.css';

const VIDEO_PRICING = [
  {
    type: '文生视频',
    model: 'doubao-seedance-2-5-260628',
    version: getModelLabel('doubao-seedance-2-5-260628'),
    unit: '每次生成',
    credits: 68,
    specs: '720p / 5 秒起',
    note: '画质优先，适合正式素材和镜头成片。',
  },
  {
    type: '文生视频',
    model: 'doubao-seedance-2-0-fast-260128',
    version: getModelLabel('doubao-seedance-2-0-fast-260128'),
    unit: '每次生成',
    credits: 36,
    specs: '720p / 5 秒起',
    note: '速度优先，适合快速验证提示词和镜头方向。',
  },
  {
    type: '文生视频',
    model: 'doubao-seedance-2-0-mini-260615',
    version: getModelLabel('doubao-seedance-2-0-mini-260615'),
    unit: '每次生成',
    credits: 22,
    specs: '480p / 4 秒起',
    note: '低成本预览，适合批量试错。',
  },
  {
    type: '参考图生视频',
    model: 'doubao-seedance-2-5-260628',
    version: 'seedance 2.5 参考图',
    unit: '每次生成',
    credits: 88,
    specs: '首帧/尾帧参考',
    note: '带参考素材时消耗更高，适合控制主体一致性。',
  },
  {
    type: '参考音视频生成',
    model: 'doubao-seedance-2-5-260628',
    version: 'seedance 2.5 多模态参考',
    unit: '每次生成',
    credits: 108,
    specs: '图片 / 视频 / 音频参考',
    note: '多参考素材任务，适合复杂运动和声音方向控制。',
  },
  {
    type: '视频生成',
    model: 'kling-v2-6-video-pro',
    version: getModelLabel('kling-v2-6-video-pro'),
    unit: '每次生成',
    credits: 96,
    specs: '专业版 / 10 秒',
    note: '第三方视频模型 mock 计费，后续按实际供应商调整。',
  },
  {
    type: '视频生成',
    model: 'MiniMax-Hailuo-2.3-Fast/1080p/6s',
    version: getModelLabel('MiniMax-Hailuo-2.3-Fast/1080p/6s'),
    unit: '每次生成',
    credits: 58,
    specs: '1080p / 6 秒',
    note: '海螺 Fast 版本 mock 计费，适合快速高清输出。',
  },
];

const IMAGE_PRICING = [
  {
    type: '文生图片',
    model: 'gpt-image-2.5',
    version: 'gpt-image 2.5',
    unit: '每张图片',
    credits: 12,
    specs: '标准质量 / 1 张',
    note: '适合日常概念图、配图和产品视觉草稿。',
  },
  {
    type: '文生图片',
    model: 'gpt-image-2.5-sunburst',
    version: 'gpt-image 2.5 Sunburst',
    unit: '每张图片',
    credits: 18,
    specs: '高细节 / 1 张',
    note: '适合更强光影、更高质感的视觉探索。',
  },
  {
    type: '风格化图片',
    model: 'gpt-image-2.5',
    version: '电影感 / 杂志视觉 / 插画风 / 产品棚拍',
    unit: '每张图片',
    credits: 14,
    specs: '风格参数启用',
    note: '选择明确风格后按增强任务计费。',
  },
  {
    type: '图片重试',
    model: 'gpt-image-2.5',
    version: '同提示词重新生成',
    unit: '每张图片',
    credits: 10,
    specs: '同参数重试',
    note: '同一任务短时间内重试可使用优惠消耗。',
  },
];

const PRICING_VIEWS = {
  video: {
    label: '视频生成',
    title: 'VIDEO PRICING',
    description: '视频生成收费',
    icon: Video,
    items: VIDEO_PRICING,
    range: '22 - 108 积分 / 次',
  },
  image: {
    label: '图片生成',
    title: 'IMAGE PRICING',
    description: '图片生成收费',
    icon: Image,
    items: IMAGE_PRICING,
    range: '10 - 18 积分 / 张',
  },
};

function chargeUnitLabel(unit) {
  return String(unit || '').replace('每次生成', '次').replace('每张图片', '张');
}

function PricingTable({ title, description, icon: Icon, items }) {
  return (
    <section className={styles.pricingSection}>
      <div className={styles.pricingSectionHeader}>
        <div className={styles.sectionIcon}><Icon size={18} /></div>
        <div>
          <div className={shared.panelKicker}>{title}</div>
          <h2>{description}</h2>
        </div>
      </div>

      <div className={styles.tableShell}>
        <div className={styles.tableHeader}>
          <span>生成类型</span>
          <span>版本</span>
          <span>规格</span>
          <span>消耗</span>
          <span>说明</span>
        </div>
        <div className={styles.tableBody}>
          {items.map(item => (
            <article key={`${item.type}-${item.model}-${item.version}`} className={styles.pricingRow}>
              <div>
                <small>生成类型</small>
                <strong>{item.type}</strong>
              </div>
              <div>
                <small>版本</small>
                <strong>{item.version}</strong>
              </div>
              <div>
                <small>规格</small>
                <strong>{item.specs}</strong>
              </div>
              <div className={styles.creditCell}>
                <small>计费单位</small>
                <strong><Coins size={14} /> {item.credits} 积分 / {chargeUnitLabel(item.unit)}</strong>
              </div>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PricingInfoPage() {
  const [activeType, setActiveType] = useState('video');
  const activePricing = PRICING_VIEWS[activeType];
  const ActiveIcon = activePricing.icon;

  return (
    <div className={`${shared.pageStack} ${styles.pricingPage}`}>
      <section className={`${shared.pageHeading} ${shared.pageHeadingCompact}`}>
        <div>
          <div className={shared.sectionEyebrow}>PRICING RULES</div>
          <h1>费用说明</h1>
          <p>下面是当前用于产品调试的 mock 计费规则。正式上线前，建议由后端统一返回并锁定每次任务的实际扣费。</p>
        </div>
        <div className={styles.mockBadge}>
          <Sparkles size={16} />
          <span>Mock 数据</span>
        </div>
      </section>

      <div className={styles.pricingSwitcher} role="tablist" aria-label="费用类型">
        {Object.entries(PRICING_VIEWS).map(([type, view]) => {
          const Icon = view.icon;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.pricingTab} ${isActive ? styles.pricingTabActive : ''}`}
              onClick={() => setActiveType(type)}
            >
              <Icon size={16} />
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <ActiveIcon size={18} />
          <span>当前分类</span>
          <strong>{activePricing.label}</strong>
        </div>
        <div className={styles.summaryCard}>
          <Coins size={18} />
          <span>Mock 消耗区间</span>
          <strong>{activePricing.range}</strong>
        </div>
        <div className={styles.summaryCard}>
          <ShieldCheck size={18} />
          <span>失败返还</span>
          <strong>失败任务自动退回</strong>
        </div>
      </div>

      <PricingTable
        title={activePricing.title}
        description={activePricing.description}
        icon={activePricing.icon}
        items={activePricing.items}
      />

      <section className={styles.noticePanel}>
        <Info size={18} />
        <div>
          <h2>计费口径说明</h2>
          <p>积分消耗以后端创建任务时锁定的价格为准。任务提交失败、上游失败、取消、过期，或完成但没有返回有效作品地址时，系统应通过积分账本幂等退回本次预扣积分。</p>
        </div>
      </section>
    </div>
  );
}
