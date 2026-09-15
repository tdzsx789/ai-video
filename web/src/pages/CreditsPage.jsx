import { useState } from 'react';
import {
  Check,
  Coins,
  CreditCard,
  Gem,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
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

const PAYMENT_METHODS = [
  {
    id: 'wechat',
    name: '微信支付',
    description: '扫码或微信客户端支付',
    logo: '/payment-wechat.svg',
  },
  {
    id: 'alipay',
    name: '支付宝支付',
    description: '支持常用支付方式',
    logo: '/payment-alipay.svg',
  },
  {
    id: 'card',
    name: '银行卡 / 信用卡',
    description: 'Visa、Mastercard 等',
    icon: CreditCard,
  },
];

const PAYMENT_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map(method => [method.id, method.name]),
);

function formatPrice(price) {
  return `¥${Number(price).toFixed(2)}`;
}

export default function CreditsPage({ credits, onRecharge }) {
  const [selectedPlanId, setSelectedPlanId] = useState('creator');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('wechat');
  const selectedPlan = PLANS.find(plan => plan.id === selectedPlanId) || PLANS[1];
  const SelectedPlanIcon = selectedPlan.icon;
  const selectedPaymentLabel = PAYMENT_LABELS[selectedPaymentMethod] || PAYMENT_LABELS.wechat;

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

      <div className={styles.purchaseLayout}>
        <section className={styles.planPicker} aria-label="选择充值套餐">
          <div className={styles.planPickerHeader}>
            <div>
              <div className={shared.panelKicker}>CREDIT PACKAGES</div>
              <h2>选择充值套餐</h2>
            </div>
            <span>一次性到账 · 永久有效</span>
          </div>

          <div className={styles.creditPlans}>
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isSelected = plan.id === selectedPlan.id;
              return (
                <article
                  key={plan.id}
                  className={`${styles.creditPlan} ${plan.featured ? styles.isFeatured : ''} ${isSelected ? styles.isSelected : ''}`}
                >
                  {plan.featured ? <span className={styles.planRecommend}>最受欢迎</span> : null}
                  <div className={styles.creditPlanIcon}><Icon size={19} /></div>
                  <div className={styles.creditPlanName}>{plan.name}</div>
                  <div className={styles.creditPlanCredits}>{plan.credits.toLocaleString('zh-CN')} <span>积分</span></div>
                  <p>{plan.description}</p>
                  <div className={styles.creditPlanPrice}><strong>{formatPrice(plan.price)}</strong><span>一次性</span></div>
                  <button
                    type="button"
                    className={`${isSelected ? shared.primaryAction : shared.secondaryAction} ${styles.planChoiceButton}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? <Check size={15} /> : <Coins size={15} />}
                    {isSelected ? '已选择' : '选择套餐'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={styles.paymentPanel} aria-label="充值订单摘要">
          <div className={styles.paymentPanelHeader}>
            <div>
              <div className={shared.panelKicker}>ORDER SUMMARY</div>
              <h2>订单摘要</h2>
            </div>
            <span className={styles.paymentReady}><ShieldCheck size={14} /> 安全支付</span>
          </div>

          <div className={styles.orderPlan}>
            <div className={styles.orderPlanIcon}><SelectedPlanIcon size={18} /></div>
            <div className={styles.orderPlanCopy}>
              <span>{selectedPlan.name}</span>
              <strong>{selectedPlan.credits.toLocaleString('zh-CN')} 积分</strong>
            </div>
            <button
              type="button"
              className={styles.changePlanButton}
              onClick={() => document.querySelector(`.${styles.planPicker}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              更换
            </button>
          </div>

          <div className={styles.paymentBlock}>
            <div className={styles.paymentBlockHeading}>
              <span>支付方式</span>
              <small>选择一种方式完成充值</small>
            </div>
            <div className={styles.paymentMethods}>
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon;
                const isSelected = method.id === selectedPaymentMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    className={`${styles.paymentMethod} ${isSelected ? styles.isSelected : ''}`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    aria-pressed={isSelected}
                >
                    <span className={`${styles.paymentMethodIcon} ${method.logo ? styles.hasPaymentLogo : ''}`}>
                      {method.logo ? (
                        <img src={method.logo} alt="" aria-hidden="true" />
                      ) : (
                        <Icon size={17} />
                      )}
                    </span>
                    <span className={styles.paymentMethodCopy}>
                      <strong>{method.name}</strong>
                      <small>{method.description}</small>
                    </span>
                    <span className={styles.paymentMethodCheck}>
                      {isSelected ? <Check size={14} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.orderLines}>
            <div><span>充值积分</span><strong>{selectedPlan.credits.toLocaleString('zh-CN')} 积分</strong></div>
            <div><span>支付方式</span><strong>{selectedPaymentLabel}</strong></div>
          </div>

          <div className={styles.orderTotal}>
            <span>应付金额</span>
            <strong>{formatPrice(selectedPlan.price)}</strong>
          </div>

          <button
            type="button"
            className={`${shared.primaryAction} ${styles.paymentSubmit}`}
            onClick={() => onRecharge(selectedPlan, selectedPaymentMethod)}
          >
            <Zap size={16} />
            确认充值
          </button>

          <p className={styles.paymentNote}>
            <ShieldCheck size={14} />
            <span>当前为演示支付，确认后积分会即时入账。</span>
          </p>
        </aside>
      </div>
    </div>
  );
}
