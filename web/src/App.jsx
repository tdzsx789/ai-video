import { useState } from 'react';
import AuthModal from './components/AuthModal.jsx';
import StudioPage from './pages/StudioPage.jsx';

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState('studio');
  const [user, setUser] = useState(() => readStored('ai_jinchan_user', null));
  const [credits, setCredits] = useState(() => Number(localStorage.getItem('ai_jinchan_credits') || 860));
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('seedance_api_key') || import.meta.env.VITE_DEFAULT_API_KEY || '');
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = message => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 3200);
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const saveUser = nextUser => {
    const normalizedUser = {
      name: nextUser.name?.trim() || nextUser.email?.split('@')[0] || 'AI创作者',
      email: nextUser.email?.trim() || '',
    };
    setUser(normalizedUser);
    localStorage.setItem('ai_jinchan_user', JSON.stringify(normalizedUser));
    setAuthOpen(false);
    showToast(authMode === 'register' ? '账户创建成功，欢迎来到 AI金铲。' : '登录成功，继续开始创作吧。');
  };

  const updateUser = patch => {
    setUser(current => {
      const next = { ...current, ...patch };
      localStorage.setItem('ai_jinchan_user', JSON.stringify(next));
      return next;
    });
    showToast('个人资料已更新。');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_jinchan_user');
    showToast('已退出当前账户。');
    setActiveSection('studio');
  };

  const recharge = plan => {
    setCredits(current => {
      const next = current + plan.credits;
      localStorage.setItem('ai_jinchan_credits', String(next));
      return next;
    });
    showToast(`已模拟充值 ${plan.credits.toLocaleString('zh-CN')} 积分。`);
  };

  const navigate = id => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <StudioPage
        activeSection={activeSection}
        onNavigate={navigate}
        credits={credits}
        user={user}
        onOpenAuth={() => openAuth('login')}
        onLogout={logout}
        onRecharge={recharge}
        apiKey={apiKey}
        onApiKeyChange={value => {
          setApiKey(value);
          localStorage.setItem('seedance_api_key', value);
        }}
        onSaveUser={updateUser}
      />

      {authOpen ? (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onSubmit={saveUser}
        />
      ) : null}

      {toast ? <div className="toast-message" role="status">{toast}</div> : null}
    </>
  );
}
