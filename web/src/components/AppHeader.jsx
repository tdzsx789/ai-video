import {
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Coins,
  LogIn,
  UserRound,
} from 'lucide-react';

const navItems = [
  { id: 'studio', label: '工作台', icon: BriefcaseBusiness },
  { id: 'history', label: '历史记录', icon: Clock3 },
  { id: 'credits', label: '充值积分', icon: Coins },
  { id: 'profile', label: '用户中心', icon: UserRound },
];

function UserAvatar({ user }) {
  return (
    <div className="user-avatar" aria-hidden="true">
      {user?.name?.slice(0, 1) || 'AI'}
    </div>
  );
}

function Navigation({ activeSection, onNavigate, mobile = false }) {
  return (
    <nav className={mobile ? 'mobile-bottom-nav' : 'sidebar-nav'} aria-label="主导航">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav-link ${activeSection === id ? 'is-active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon size={mobile ? 18 : 17} strokeWidth={activeSection === id ? 2.3 : 1.8} />
          <span>{label}</span>
          {!mobile && activeSection === id ? <ChevronRight size={14} className="nav-link-arrow" /> : null}
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
  onLogout,
}) {
  return (
    <>
      <aside className="app-sidebar">
        <button type="button" className="brand-lockup" onClick={() => onNavigate('studio')} aria-label="返回 AI金铲工作台">
          <span className="brand-mark">
            <img src="/ai-jinchan-logo.png" alt="" />
          </span>
          <span className="brand-copy">
            <strong>AI金铲</strong>
            <small>AI CREATIVE WORKSPACE</small>
          </span>
        </button>

        <div className="sidebar-label">创作空间</div>
        <Navigation activeSection={activeSection} onNavigate={onNavigate} />

        <div className="sidebar-grow" />

        <button type="button" className="credit-balance" onClick={() => onNavigate('credits')}>
          <span className="credit-balance-top">
            <span>可用积分</span>
            <Coins size={15} />
          </span>
          <strong>{Number(credits || 0).toLocaleString('zh-CN')}</strong>
          <span className="credit-balance-action">去充值 <ChevronRight size={13} /></span>
        </button>

        <div className="sidebar-divider" />

        {user ? (
          <button type="button" className="sidebar-user" onClick={() => onNavigate('profile')}>
            <UserAvatar user={user} />
            <span className="sidebar-user-copy">
              <strong>{user.name}</strong>
              <small>{user.email || '本地演示账户'}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ) : (
          <button type="button" className="sidebar-user sidebar-user-guest" onClick={onOpenAuth}>
            <span className="user-avatar user-avatar-guest"><LogIn size={16} /></span>
            <span className="sidebar-user-copy">
              <strong>登录 / 注册</strong>
              <small>同步你的创作资产</small>
            </span>
            <ChevronRight size={15} />
          </button>
        )}

        {user ? (
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            退出当前账户
          </button>
        ) : null}

        <div className="sidebar-footer">
          <span className="sidebar-footer-dot" />
          <span>AI金铲 · 工作区 v1.0</span>
        </div>
      </aside>

      <header className="mobile-topbar">
        <button type="button" className="brand-lockup" onClick={() => onNavigate('studio')} aria-label="返回 AI金铲工作台">
          <span className="brand-mark">
            <img src="/ai-jinchan-logo.png" alt="" />
          </span>
          <span className="brand-copy">
            <strong>AI金铲</strong>
            <small>AI CREATIVE WORKSPACE</small>
          </span>
        </button>
        {user ? (
          <button type="button" className="mobile-avatar-button" onClick={() => onNavigate('profile')} aria-label="打开用户中心">
            <UserAvatar user={user} />
          </button>
        ) : (
          <button type="button" className="mobile-login-button" onClick={onOpenAuth}>
            登录
          </button>
        )}
      </header>

      <Navigation activeSection={activeSection} onNavigate={onNavigate} mobile />
    </>
  );
}
