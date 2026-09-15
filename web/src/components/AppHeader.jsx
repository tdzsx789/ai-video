import {
  Clock3,
  Coins,
  ReceiptText,
  Image,
  LogIn,
  UserRound,
  Video,
} from 'lucide-react';
import styles from './AppHeader.module.css';

const navItems = [
  { id: 'video', label: '视频创作', icon: Video },
  { id: 'image', label: '图片创作', icon: Image },
  { id: 'history', label: '历史记录', icon: Clock3 },
  { id: 'credits', label: '充值积分', icon: Coins },
  { id: 'profile', label: '用户中心', icon: UserRound },
  { id: 'pricing', label: '费用说明', icon: ReceiptText },
];

function UserAvatar({ user }) {
  return (
    <span className={styles.userAvatar} aria-hidden="true">
      {user?.name?.slice(0, 1) || 'AI'}
    </span>
  );
}

function Navigation({ activeSection, onNavigate, mobile = false }) {
  return (
    <nav className={mobile ? styles.mobileBottomNav : styles.topNav} aria-label="主导航">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`${styles.navLink} ${activeSection === id ? styles.isActive : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon size={mobile ? 18 : 15} strokeWidth={activeSection === id ? 2.4 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function AppHeader({
  credits,
  user,
  activeSection,
  onNavigate,
  onOpenAuth,
}) {
  return (
    <>
      <header className={styles.appTopbar}>
        <button type="button" className={styles.brandLockup} onClick={() => onNavigate('video')} aria-label="返回 AI金铲视频创作">
          <span className={styles.brandMark}>
            <img src="/ai-jinchan-logo.png" alt="" />
          </span>
          <span className={styles.brandCopy}>
            <strong>AI金铲</strong>
            <small>AI CREATIVE WORKSPACE</small>
          </span>
        </button>

        <Navigation activeSection={activeSection} onNavigate={onNavigate} />

        <div className={styles.topbarTools}>
          <button type="button" className={styles.topCredit} onClick={() => onNavigate('credits')}>
            <Coins size={14} />
            <span>积分</span>
            <strong>{Number(credits || 0).toLocaleString('zh-CN')}</strong>
          </button>
          {user ? (
            <button type="button" className={styles.topUser} onClick={() => onNavigate('profile')}>
              <UserAvatar user={user} />
              <span>{user.name}</span>
            </button>
          ) : (
            <button type="button" className={styles.topLoginAction} onClick={onOpenAuth}>
              <LogIn size={14} />
              登录
            </button>
          )}
        </div>
      </header>

      <header className={styles.mobileTopbar}>
        <button type="button" className={styles.brandLockup} onClick={() => onNavigate('video')} aria-label="返回 AI金铲视频创作">
          <span className={styles.brandMark}>
            <img src="/ai-jinchan-logo.png" alt="" />
          </span>
          <span className={styles.brandCopy}>
            <strong>AI金铲</strong>
            <small>AI CREATIVE WORKSPACE</small>
          </span>
        </button>
        {user ? (
          <button type="button" className={styles.mobileAvatarButton} onClick={() => onNavigate('profile')} aria-label="打开用户中心">
            <UserAvatar user={user} />
          </button>
        ) : (
          <button type="button" className={styles.mobileLoginButton} onClick={onOpenAuth}>
            登录
          </button>
        )}
      </header>

      <Navigation activeSection={activeSection} onNavigate={onNavigate} mobile />
    </>
  );
}
