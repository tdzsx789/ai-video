import { Check, Coins, Crown, Gem, Sparkles, Zap } from 'lucide-react';
import shared from '../styles/shared.module.css';
import styles from './CreditsPage.module.css';

const PLANS = [
  {
    id: 'starter',
    name: '尝鲜包',
    credits: 300,
    price: 9.9,
    description: '适合第一次体验 AI 创作',
    icon: Sparkles,
  },
  {
    id: 'creator',
    name: '创作者包',
    credits: 1200,
    price: 29.9,
    description: '日常创作的平衡选择',
    icon: Zap,
    featured: true,
  },
  {
    id: 'studio',
    name: '工作室包',
    credits: 5000,
    price: 99,
    description: '连续产出，单价更划算',
    icon: Gem,
  },
];

export default function CreditsPage({ credits, onRecharge }) {
  return (
    <div className={`${shared.pageStack} ${styles.creditsPage}`}>
      <section className={`${shared.pageHeading} ${shared.pageHeadingCompact}`}>
        <div>
          <div className={shared.sectionEyebrow}>CREDITS CENTER</div>
          <h1>充值积分</h1>
          <p>让每一个灵感，都有足够的试错空间。</p>
        </div>
        <div className={styles.balanceHero}>
          <span><Coins size={16} /> 当前余额</span>
          <strong>{Number(credits || 0).toLocaleString('zh-CN')}</strong>
          <small>积分</small>
        </div>
      </section>

      <section className={styles.creditPlans}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <article key={plan.id} className={`${styles.creditPlan} ${plan.featured ? styles.isFeatured : ''}`}>
              {plan.featured ? <span className={styles.planRecommend}>最受欢迎</span> : null}
              <div className={styles.creditPlanIcon}><Icon size={19} /></div>
              <div className={styles.creditPlanName}>{plan.name}</div>
              <div className={styles.creditPlanCredits}>{plan.credits.toLocaleString('zh-CN')} <span>积分</span></div>
              <p>{plan.description}</p>
              <div className={styles.creditPlanPrice}><strong>¥{plan.price}</strong><span>一次性</span></div>
              <button type="button" className={plan.featured ? shared.primaryAction : shared.secondaryAction} onClick={() => onRecharge(plan)}>
                <Coins size={15} />
                立即充值
              </button>
            </article>
          );
        })}
      </section>

      <section className={styles.creditInfoGrid}>
        <div className={shared.plainPanel}>
          <div className={shared.plainPanelHeading}>
            <div>
              <div className={shared.panelKicker}>HOW IT WORKS</div>
              <h2>积分消耗</h2>
            </div>
            <Crown size={18} />
          </div>
          <div className={styles.costList}>
            <div><span>视频生成</span><strong>约 30 积分 / 次</strong></div>
            <div><span>图片生成</span><strong>约 12 积分 / 张</strong></div>
            <div><span>失败任务</span><strong>不扣除积分</strong></div>
          </div>
        </div>
        <div className={`${shared.plainPanel} ${styles.balanceNote}`}>
          <div className={shared.plainPanelHeading}>
            <div>
              <div className={shared.panelKicker}>ACCOUNT NOTE</div>
              <h2>本地演示状态</h2>
            </div>
            <Check size={18} />
          </div>
          <p>当前充值会保存在本机浏览器中。接入正式账户与支付后，可无缝替换为真实余额。</p>
        </div>
      </section>
    </div>
  );
}
