import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Coins,
  CreditCard,
  Gem,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getCreditRecords } from '../lib/api.js';
import shared from '../styles/shared.module.css';
import styles from './CreditsPage.module.css';

const PLANS = [
  {
    id: 'cny10',
    name: '基础充值',
    credits: 1000,
    price: 10,
    description: '适合快速补充余额，开始一次轻量创作',
    icon: Sparkles,
  },
  {
    id: 'cny50',
    name: '常用充值',
    credits: 5000,
    price: 50,
    description: '适合日常图片和视频创作',
    icon: Zap,
    featured: true,
  },
  {
    id: 'cny100',
    name: '高频充值',
    credits: 10000,
    price: 100,
    description: '适合高频生成和团队测试',
    icon: Gem,
  },
];

const CUSTOM_PLAN_ID = 'custom';
const MIN_CUSTOM_AMOUNT = 10;
const CREDITS_PER_YUAN = 100;
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

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

const LEDGER_TYPE_LABELS = {
  welcome_grant: '注册赠送',
  recharge: '充值到账',
  video_debit: '视频生成',
  video_refund: '视频退款',
  image_debit: '图片生成',
  image_refund: '图片退款',
  adjustment: '余额调整',
};

const PLAN_LABELS = Object.fromEntries(PLANS.map(plan => [plan.id, plan.name]));
PLAN_LABELS[CUSTOM_PLAN_ID] = '自定义充值';

function formatPrice(price) {
  return `¥${Number(price).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatCreditAmount(value) {
  const amount = Number(value || 0);
  return `${amount > 0 ? '+' : ''}${amount.toLocaleString('zh-CN')} 积分`;
}

function rechargeStatusLabel(value) {
  return ({ paid: '已支付', pending: '待支付', cancelled: '已取消', expired: '已过期', failed: '失败' })[value] || value || '未知';
}

export default function CreditsPage({ credits, onRecharge }) {
  const [selectedPlanId, setSelectedPlanId] = useState('cny50');
  const [customAmount, setCustomAmount] = useState('10');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('wechat');
  const [recordTab, setRecordTab] = useState('ledger');
  const [records, setRecords] = useState({ ledger: [], recharges: [] });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const customAmountText = String(customAmount).trim();
  const parsedCustomAmount = Number(customAmountText);
  const customAmountValid = AMOUNT_PATTERN.test(customAmountText)
    && Number.isFinite(parsedCustomAmount)
    && parsedCustomAmount >= MIN_CUSTOM_AMOUNT;
  const customCredits = customAmountValid ? Math.round(parsedCustomAmount * CREDITS_PER_YUAN) : 0;
  const selectedBasePlan = PLANS.find(plan => plan.id === selectedPlanId) || PLANS[1];
  const selectedPlan = selectedPlanId === CUSTOM_PLAN_ID
    ? {
      id: CUSTOM_PLAN_ID,
      name: '自定义充值',
      credits: customCredits,
      price: customAmountValid ? parsedCustomAmount : 0,
      amount: customAmount,
      icon: CreditCard,
    }
    : selectedBasePlan;
  const SelectedPlanIcon = selectedPlan.icon;
  const selectedPaymentLabel = PAYMENT_LABELS[selectedPaymentMethod] || PAYMENT_LABELS.wechat;
  const canRecharge = selectedPlanId !== CUSTOM_PLAN_ID || customAmountValid;

  const loadRecords = async () => {
    setRecordsLoading(true);
    setRecordsError('');
    try {
      const response = await getCreditRecords();
      setRecords({ ledger: response.ledger || [], recharges: response.recharges || [] });
    } catch (error) {
      setRecordsError(error.message || '读取积分记录失败。');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleRecharge = async () => {
    try {
      await onRecharge(selectedPlan, selectedPaymentMethod);
      await loadRecords();
    } catch {
      // The parent already shows the recharge error toast.
    }
  };

  return (
    <div className={`${shared.pageStack} ${styles.creditsPage}`}>
      <section className={`${shared.pageHeading} ${shared.pageHeadingCompact}`}>
        <div>
          <div className={shared.sectionEyebrow}>RECHARGE CENTER</div>
          <h1>充值中心</h1>
          <p>充值积分、查看余额和追踪每一笔账户变化。固定比例为 1 元 = 100 积分。</p>
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
            <span>1 元 = 100 积分 · 最低 10 元</span>
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

          <section className={`${styles.customRecharge} ${selectedPlanId === CUSTOM_PLAN_ID ? styles.isSelected : ''}`} aria-label="自定义充值金额">
            <div className={styles.customRechargeHead}>
              <div>
                <div className={shared.panelKicker}>CUSTOM AMOUNT</div>
                <h3>自定义金额</h3>
              </div>
              <button
                type="button"
                className={`${selectedPlanId === CUSTOM_PLAN_ID ? shared.primaryAction : shared.secondaryAction} ${styles.customSelectButton}`}
                onClick={() => setSelectedPlanId(CUSTOM_PLAN_ID)}
              >
                {selectedPlanId === CUSTOM_PLAN_ID ? <Check size={15} /> : <Coins size={15} />}
                {selectedPlanId === CUSTOM_PLAN_ID ? '已选择' : '选择自定义'}
              </button>
            </div>
            <div className={styles.customRechargeBody}>
              <label className={`${shared.fieldLabel} ${styles.customAmountField}`}>
                <span>充值金额</span>
                <input
                  type="number"
                  min={MIN_CUSTOM_AMOUNT}
                  step="0.01"
                  value={customAmount}
                  onFocus={() => setSelectedPlanId(CUSTOM_PLAN_ID)}
                  onChange={event => setCustomAmount(event.target.value)}
                  placeholder="至少 10 元"
                />
              </label>
              <div className={styles.customCreditPreview}>
                <span>预计到账</span>
                <strong>{customCredits.toLocaleString('zh-CN')} 积分</strong>
                <small>{customAmountValid ? `${formatPrice(parsedCustomAmount)} × ${CREDITS_PER_YUAN}` : '最低充值 10 元'}</small>
              </div>
            </div>
          </section>
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
            onClick={handleRecharge}
            disabled={!canRecharge}
          >
            <Zap size={16} />
            确认充值
          </button>

          <p className={styles.paymentNote}>
            <ShieldCheck size={14} />
            <span>确认支付后积分会即时入账，自定义金额最低 10 元。</span>
          </p>
        </aside>
      </div>

      <section className={styles.recordsSection} aria-label="积分与充值记录">
        <div className={styles.recordsHeader}>
          <div>
            <div className={shared.panelKicker}>ACCOUNT HISTORY</div>
            <h2>账户记录</h2>
            <p>充值订单和创作扣费统一记录在充值中心。</p>
          </div>
          <button
            type="button"
            className={styles.recordsRefresh}
            onClick={loadRecords}
            disabled={recordsLoading}
            title="刷新账户记录"
            aria-label="刷新账户记录"
          >
            <RefreshCw className={recordsLoading ? shared.spin : ''} size={16} />
          </button>
        </div>

        <div className={styles.recordsTabs} role="tablist" aria-label="账户记录类型">
          <button
            type="button"
            role="tab"
            aria-selected={recordTab === 'ledger'}
            className={recordTab === 'ledger' ? styles.isActive : ''}
            onClick={() => setRecordTab('ledger')}
          >
            <History size={14} />
            积分明细
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={recordTab === 'recharges'}
            className={recordTab === 'recharges' ? styles.isActive : ''}
            onClick={() => setRecordTab('recharges')}
          >
            <CreditCard size={14} />
            充值记录
          </button>
        </div>

        {recordsLoading ? (
          <div className={styles.recordsEmpty}><LoaderCircle className={shared.spin} size={18} />正在读取记录…</div>
        ) : recordsError ? (
          <div className={`${styles.recordsEmpty} ${styles.recordsError}`}>{recordsError}</div>
        ) : recordTab === 'ledger' ? (
          <div className={styles.recordList}>
            {records.ledger.length ? records.ledger.map(item => (
              <div className={styles.recordRow} key={item.id}>
                <span className={`${styles.recordIcon} ${item.amountDelta > 0 ? styles.recordIconPositive : styles.recordIconNegative}`}>
                  {item.amountDelta > 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className={styles.recordCopy}>
                  <strong>{item.description || LEDGER_TYPE_LABELS[item.type] || '积分变动'}</strong>
                  <small>{LEDGER_TYPE_LABELS[item.type] || '积分变动'} · {formatDate(item.createdAt)}</small>
                </div>
                <div className={styles.recordAmount}>
                  <strong className={item.amountDelta > 0 ? styles.amountPositive : styles.amountNegative}>{formatCreditAmount(item.amountDelta)}</strong>
                  <small>余额 {Number(item.balanceAfter || 0).toLocaleString('zh-CN')}</small>
                </div>
              </div>
            )) : <div className={styles.recordsEmpty}>暂时没有积分变动记录。</div>}
          </div>
        ) : (
          <div className={styles.recordList}>
            {records.recharges.length ? records.recharges.map(item => (
              <div className={styles.recordRow} key={item.id}>
                <span className={`${styles.recordIcon} ${styles.recordIconPositive}`}><CreditCard size={15} /></span>
                <div className={styles.recordCopy}>
                  <strong>{PLAN_LABELS[item.planId] || item.planId || '积分套餐'}</strong>
                  <small>{formatDate(item.paidAt || item.createdAt)} · {item.provider === 'dev' ? '模拟支付' : item.provider}</small>
                </div>
                <div className={styles.recordAmount}>
                  <strong className={styles.amountPositive}>+{Number(item.credits || 0).toLocaleString('zh-CN')} 积分</strong>
                  <small>{formatPrice(Number(item.amountCents || 0) / 100)} · {rechargeStatusLabel(item.status)}</small>
                </div>
              </div>
            )) : <div className={styles.recordsEmpty}>暂时没有充值记录。</div>}
          </div>
        )}
      </section>
    </div>
  );
}
