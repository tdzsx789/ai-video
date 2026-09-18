import { useEffect, useState } from 'react';
import AuthModal from './components/AuthModal.jsx';
import HomePage from './pages/HomePage.jsx';
import StudioPage from './pages/StudioPage.jsx';
import {
  getCurrentUser,
  login,
  logout as logoutRequest,
  recharge,
  updatePassword,
  updateProfile,
  verifyCurrentPassword,
} from './lib/api.js';
import styles from './App.module.css';

const PAYMENT_METHOD_LABELS = {
  wechat: '微信支付',
  alipay: '支付宝支付',
  card: '银行卡 / 信用卡',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('video');
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    getCurrentUser()
      .then(response => {
        setUser(response.user);
        setCredits(Number(response.credits?.balance || 0));
      })
      .catch(error => {
        if (error.status !== 401) setToast(error.message || '读取账户状态失败。');
      })
      .finally(() => setAuthReady(true));
  }, []);

  const showToast = message => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 3200);
  };

  const openAuth = () => {
    setAuthError('');
    setAuthOpen(true);
  };

  const handleLogin = async credentials => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await login(credentials.username, credentials.password);
      setUser(response.user);
      setCredits(Number(response.credits?.balance || 0));
      setAuthOpen(false);
      setActiveSection('video');
      showToast('登录成功，继续开始创作吧。');
    } catch (error) {
      setAuthError(error.message || '登录失败，请检查账号和密码。');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUser = async patch => {
    const response = await updateProfile(patch);
    setUser(response.user);
    return response.user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await updatePassword(currentPassword, newPassword);
    showToast(response.message || '密码已更新。');
    return response;
  };

  const verifyPassword = async currentPassword => {
    const response = await verifyCurrentPassword(currentPassword);
    return response;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Clear local UI even if the session was already invalid.
    }
    setUser(null);
    setCredits(0);
    showToast('已退出当前账户。');
    setActiveSection('video');
  };

  const handleRecharge = async (plan, paymentMethod = 'wechat') => {
    try {
      const response = await recharge(plan.id, crypto.randomUUID(), paymentMethod, plan.amount ?? plan.price);
      setCredits(Number(response.balance || 0));
      const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethod] || PAYMENT_METHOD_LABELS.wechat;
      showToast(`已通过${paymentLabel}充值 ${plan.credits.toLocaleString('zh-CN')} 积分。`);
      return response;
    } catch (error) {
      showToast(error.message || '充值失败。');
      throw error;
    }
  };

  const navigate = id => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!authReady) {
    return <div className={styles.authLoading}>正在连接账户服务…</div>;
  }

  return (
    <>
      {user ? (
        <StudioPage
          activeSection={activeSection}
          onNavigate={navigate}
          credits={credits}
          user={user}
          onOpenAuth={openAuth}
          onLogout={logout}
          onRecharge={handleRecharge}
          onSaveUser={updateUser}
          onChangePassword={changePassword}
          onVerifyPassword={verifyPassword}
          onCreditsChange={setCredits}
        />
      ) : (
        <HomePage
          onLogin={openAuth}
          onRegister={openAuth}
        />
      )}

      {authOpen ? (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSubmit={handleLogin}
          error={authError}
          loading={authLoading}
        />
      ) : null}

      {toast ? <div className={styles.toastMessage} role="status">{toast}</div> : null}
    </>
  );
}
