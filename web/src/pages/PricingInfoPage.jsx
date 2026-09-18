import { Coins, Image, Info, Video } from 'lucide-react';
import { useState } from 'react';
import { isImageProviderEnabled } from '../lib/imageProviders.js';
import { isVideoProviderEnabled } from '../lib/videoProviders.js';
import shared from '../styles/shared.module.css';
import styles from './PricingInfoPage.module.css';

const ALL_VIDEO_PRICING = [
  {
    platform: 'seedance',
    model: 'doubao-seedance-2-5-260628',
    version: 'doubao-seedance-2-5-260628',
    unit: '每秒',
    credits: 100,
    specs: '视频时长 5 秒起',
    note: '按实际生成时长计费。',
  },
  {
    platform: 'seedance',
    model: 'doubao-seedance-2-0-fast-260128',
    version: 'doubao-seedance-2-0-fast-260128',
    unit: '每秒',
    credits: 80,
    specs: '视频时长 5 秒起',
    note: '按实际生成时长计费。',
  },
  {
    platform: 'seedance',
    model: 'doubao-seedance-2-0-mini-260615',
    version: 'doubao-seedance-2-0-mini-260615',
    unit: '每秒',
    credits: 40,
    specs: '视频时长 5 秒起',
    note: '按实际生成时长计费。',
  },
  {
    platform: '海螺',
    provider: 'hailuo',
    model: 'MiniMax-Hailuo-2.3-Fast/768p/6s',
    version: 'MiniMax-Hailuo-2.3-Fast/768p/6s',
    unit: '每次',
    credits: 200,
    specs: '固定 6 秒',
    note: '按官网固定时长按次计费。',
  },
  {
    platform: '海螺',
    provider: 'hailuo',
    model: 'MiniMax-Hailuo-2.3-Fast/768p/10s',
    version: 'MiniMax-Hailuo-2.3-Fast/768p/10s',
    unit: '每次',
    credits: 300,
    specs: '固定 10 秒',
    note: '按官网固定时长按次计费。',
  },
  {
    platform: '海螺',
    provider: 'hailuo',
    model: 'MiniMax-Hailuo-2.3-Fast/1080p/6s',
    version: 'MiniMax-Hailuo-2.3-Fast/1080p/6s',
    unit: '每次',
    credits: 300,
    specs: '固定 6 秒',
    note: '按官网固定时长按次计费。',
  },
];

const VIDEO_PRICING = ALL_VIDEO_PRICING.filter(item => (
  isVideoProviderEnabled(item.provider || 'seedance')
));

const ALL_IMAGE_PRICING = [
  {
    platform: 'gpt-image',
    model: 'gpt-image-2.5',
    version: 'gpt-image-2.5',
    unit: '每次',
    credits: 20,
    specs: '每次生成 1 张',
    note: '按次计费。',
  },
  {
    platform: 'gpt-image',
    model: 'gpt-image-2.5-sunburst',
    version: 'gpt-image-2.5-sunburst',
    unit: '每次',
    credits: 50,
    specs: '每次生成 1 张',
    note: '按次计费。',
  },
];

const IMAGE_PRICING = ALL_IMAGE_PRICING.filter(item => (
  isImageProviderEnabled(item.provider || 'gpt-image')
));

const PRICING_VIEWS = {
  video: {
    label: '视频生成',
    title: 'VIDEO PRICING',
    description: '视频生成收费',
    icon: Video,
    items: VIDEO_PRICING,
  },
  image: {
    label: '图片生成',
    title: 'IMAGE PRICING',
    description: '图片生成收费',
    icon: Image,
    items: IMAGE_PRICING,
  },
};

function chargeUnitLabel(unit) {
  return String(unit || '');
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
          <span>平台类型</span>
          <span>版本</span>
          <span>规格</span>
          <span>消耗</span>
          <span>说明</span>
        </div>
        <div className={styles.tableBody}>
          {items.map(item => (
            <article key={`${item.platform}-${item.model}`} className={styles.pricingRow}>
              <div>
                <small>平台类型</small>
                <strong>{item.platform}</strong>
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

  return (
    <div className={`${shared.pageStack} ${styles.pricingPage}`}>
      <section className={shared.pageHeading}>
        <div>
          <div className={shared.sectionEyebrow}>PRICING RULES</div>
          <h1>费用说明</h1>
          <p>这里用于说明不同平台和版本的积分消耗。Seedance 视频版本按实际生成秒数计费，视频时长均从 5 秒起；海螺视频版本按官网固定时长按次计费；图片版本按每次生成计费。实际扣费以提交任务时后端锁定的平台、版本和参数为准，生成失败、上游拒绝、任务取消或未返回有效作品时，本次预扣积分会自动退回。</p>
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
          <p>Seedance 按秒计费，实际消耗 = 视频时长 × 对应版本的每秒积分；海螺按版本固定时长按次计费，不额外按秒折算；图片按次计费。系统会先预扣本次任务积分，任务成功后完成结算；如果提交失败、上游生成失败、任务取消、过期，或最终没有可用的视频/图片地址，预扣积分会通过账本自动返还，重复提交同一请求也会按请求编号避免重复扣费。</p>
        </div>
      </section>
    </div>
  );
}
