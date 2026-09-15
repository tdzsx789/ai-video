import {
  ArrowUpRight,
  Check,
  Clapperboard,
  Images,
  Layers3,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import styles from './HomePage.module.css';

const FEATURES = [
  {
    icon: Clapperboard,
    eyebrow: 'VIDEO',
    title: '一句话生成视频',
    description: '把画面、动作、镜头和氛围交给 AI，快速得到可继续打磨的动态作品。',
  },
  {
    icon: Images,
    eyebrow: 'IMAGE',
    title: '让画面先成形',
    description: '从概念草图到产品视觉，用自然语言探索你想要的构图、光线与风格。',
  },
  {
    icon: Layers3,
    eyebrow: 'ARCHIVE',
    title: '作品自动归档',
    description: '生成过的内容集中保存，随时回看、复制地址，继续你的创作工作流。',
  },
];

const STEPS = [
  ['01', '写下灵感', '输入一句描述，不需要先学会复杂参数。'],
  ['02', '选择版本', '根据速度、画质和画幅，选择适合当前想法的模型版本。'],
  ['03', '开始创作', '提交任务，等待作品生成，再回到历史记录继续使用。'],
];

export default function HomePage({ onLogin }) {
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <button type="button" className={styles.brand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className={styles.brandMark}>
            <img src="/ai-jinchan-logo.png" alt="" />
          </span>
          <span className={styles.brandText}>
            <strong>AI金铲</strong>
            <small>AI CREATIVE WORKSPACE</small>
          </span>
        </button>

        <nav className={styles.nav} aria-label="首页导航">
          <a href="#capabilities">能力</a>
          <a href="#workflow">流程</a>
        </nav>

        <div className={styles.headerActions}>
          <button type="button" className={styles.loginButton} onClick={onLogin}>登录</button>
          <button type="button" className={styles.registerButton} onClick={onLogin}>
            登录工作区
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot} />
              AI CREATIVE WORKSPACE
            </div>
            <h1>把灵感，<span>铲进画面里。</span></h1>
            <p className={styles.heroDescription}>
              AI金铲，让视频与图片创作从一句话开始。少一点等待，多一点灵感真正落地的时刻。
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.heroPrimary} onClick={onLogin}>
                登录工作区，开始创作
                <ArrowUpRight size={17} />
              </button>
              <button type="button" className={styles.heroSecondary} onClick={onLogin}>
                使用 mock 账户登录
              </button>
            </div>
            <div className={styles.rewardLine}>
              <span className={styles.rewardIcon}><Sparkles size={14} /></span>
              <span>当前已配置 <strong>2 个 mock 账户</strong>，每个账户初始 1,000 积分。</span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="AI金铲创作工作台预览">
            <div className={styles.visualHeader}>
              <div className={styles.visualTitle}>
                <span className={styles.visualStatus} />
                <span>创作工作台</span>
              </div>
              <span className={styles.visualCode}>READY TO CREATE</span>
            </div>
            <div className={styles.visualCanvas}>
              <div className={styles.canvasGrid} />
              <div className={styles.canvasStamp}>FREE START</div>
              <div className={styles.canvasBrand}>
                <img src="/ai-jinchan-logo.png" alt="" />
              </div>
              <div className={styles.canvasPrompt}>
                <span>当前提示词</span>
                <strong>让一个想法，变成看得见的作品。</strong>
              </div>
              <div className={styles.canvasOutput}>
                <div className={styles.outputIcon}><WandSparkles size={17} /></div>
                <div>
                  <strong>准备开始生成</strong>
                  <small>视频 · 图片 · 一站式创作</small>
                </div>
                <Check size={16} />
              </div>
            </div>
            <div className={styles.visualFooter}>
              <span><span className={styles.footerDot} />模型已就绪</span>
              <span>登录后进入完整工作区</span>
            </div>
          </div>
        </section>

        <section className={styles.signalBar} aria-label="账户权益">
          <div>
            <span className={styles.signalNumber}>1,000</span>
            <span>每个账户初始积分</span>
          </div>
          <div>
            <span className={styles.signalNumber}>2</span>
            <span>可用 mock 账户</span>
          </div>
          <div>
            <span className={styles.signalNumber}>1</span>
            <span>个统一作品库</span>
          </div>
        </section>

        <section className={styles.section} id="capabilities">
          <div className={styles.sectionHeading}>
            <div>
              <div className={styles.eyebrow}>WHAT YOU CAN MAKE</div>
              <h2>从想法到成片，<span>更近一步。</span></h2>
            </div>
            <p>把复杂的创作步骤收进一个清晰的工作台，给每个灵感一个开始的机会。</p>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, eyebrow, title, description }) => (
              <article key={eyebrow} className={styles.feature}>
                <div className={styles.featureIcon}><Icon size={19} /></div>
                <div className={styles.featureEyebrow}>{eyebrow}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className={styles.featureArrow}><ArrowUpRight size={16} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.workflowSection}`} id="workflow">
          <div className={styles.workflowIntro}>
            <div className={styles.eyebrow}>HOW IT WORKS</div>
            <h2>三步，<span>开始创作。</span></h2>
            <p>不用准备复杂的素材，也不用先成为专业创作者。把第一句描述写下来就够了。</p>
            <button type="button" className={styles.textCta} onClick={onLogin}>
              登录工作区，领取初始积分
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className={styles.stepList}>
            {STEPS.map(([number, title, description]) => (
              <div key={number} className={styles.step}>
                <span className={styles.stepNumber}>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerMark}><img src="/ai-jinchan-logo.png" alt="" /></span>
          <span>AI金铲</span>
        </div>
        <span>一句灵感，成就一部作品。</span>
        <span>© 2026 AI金铲</span>
      </footer>
    </div>
  );
}
