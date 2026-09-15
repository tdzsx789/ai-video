import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import shared from '../styles/shared.module.css';
import styles from './ProfilePage.module.css';

export default function ProfilePage({
  user,
  onSave,
  onChangePassword,
  onOpenAuth,
  onLogout,
}) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [contactFeedback, setContactFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user?.email, user?.name, user?.phone]);

  if (!user) {
    return (
      <div className={`${shared.pageStack} ${styles.profilePage} ${styles.profilePageEmpty}`}>
        <section className={styles.emptyAccountPanel}>
          <div className={styles.emptyAccountIcon}><UserRound size={25} /></div>
          <div className={`${shared.sectionEyebrow} ${styles.emptyAccountEyebrow}`}>ACCOUNT CENTER</div>
          <h1>登录你的 AI金铲</h1>
          <p>登录后可以管理账户资料、安全设置与创作资产。</p>
          <button type="button" className={shared.primaryAction} onClick={onOpenAuth}>
            <UserRound size={16} />
            登录工作区
          </button>
        </section>
      </div>
    );
  }

  const setProfileValue = (key, value) => {
    setProfileForm(current => ({ ...current, [key]: value }));
    if (key === 'name') setProfileFeedback(null);
    if (key === 'email' || key === 'phone') setContactFeedback(null);
  };

  const saveProfile = async event => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);
    try {
      await onSave({ name: profileForm.name });
      setProfileFeedback({ type: 'success', text: '账户资料已保存。' });
    } catch (error) {
      setProfileFeedback({ type: 'error', text: error.message || '资料保存失败，请稍后重试。' });
    } finally {
      setProfileSaving(false);
    }
  };

  const saveContacts = async event => {
    event.preventDefault();
    setContactSaving(true);
    setContactFeedback(null);
    try {
      await onSave({
        email: profileForm.email,
        phone: profileForm.phone,
      });
      setContactFeedback({ type: 'success', text: '联系方式已保存。' });
    } catch (error) {
      setContactFeedback({ type: 'error', text: error.message || '联系方式保存失败，请稍后重试。' });
    } finally {
      setContactSaving(false);
    }
  };

  const setPasswordValue = (key, value) => {
    setPasswordForm(current => ({ ...current, [key]: value }));
    setPasswordFeedback(null);
  };

  const changePassword = async event => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', text: '新密码需要至少 8 位字符。' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: 'error', text: '两次输入的新密码不一致。' });
      return;
    }

    setPasswordSaving(true);
    setPasswordFeedback(null);
    try {
      await onChangePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordFeedback({ type: 'success', text: '密码已更新，其他登录会话已退出。' });
    } catch (error) {
      setPasswordFeedback({ type: 'error', text: error.message || '密码更新失败，请稍后重试。' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className={`${shared.pageStack} ${styles.profilePage}`}>
      <section className={`${shared.pageHeading} ${shared.pageHeadingCompact}`}>
        <div>
          <div className={shared.sectionEyebrow}>ACCOUNT CENTER</div>
          <h1>用户中心</h1>
          <p>管理账户资料、联系方式和登录安全。</p>
        </div>
        <button type="button" className={shared.ghostAction} onClick={onLogout}>
          <LogOut size={15} />
          退出登录
        </button>
      </section>

      <div className={styles.profileGrid}>
        <section className={`${shared.plainPanel} ${styles.profileCard}`}>
          <div className={styles.profileCardHead}>
            <div className={styles.largeAvatar}>{user.name?.slice(0, 1) || user.username?.slice(0, 1) || 'AI'}</div>
            <div>
              <div className={shared.panelKicker}>ACCOUNT PROFILE</div>
              <h2>{user.name || user.username}</h2>
              <span className={styles.accountType}>AI金铲创作者</span>
            </div>
          </div>

          <form className={styles.settingsForm} onSubmit={saveProfile}>
            <label className={shared.fieldLabel}>
              <span><KeyRound size={13} /> 账号</span>
              <input value={user.username || ''} readOnly />
            </label>
            <label className={shared.fieldLabel}>
              <span><UserRound size={13} /> 昵称</span>
              <input
                value={profileForm.name}
                onChange={event => setProfileValue('name', event.target.value)}
                placeholder="设置你的显示名称"
                maxLength={80}
                required
              />
            </label>
            <button type="submit" className={shared.primaryAction} disabled={profileSaving}>
              <Save size={15} />
              {profileSaving ? '保存中…' : '保存账户资料'}
            </button>
            {profileFeedback ? <Feedback feedback={profileFeedback} /> : null}
          </form>
        </section>

        <section className={`${shared.plainPanel} ${styles.contactCard}`}>
          <div className={shared.plainPanelHeading}>
            <div>
              <div className={shared.panelKicker}>CONTACT METHODS</div>
              <h2>联系方式</h2>
            </div>
            <ShieldCheck size={17} />
          </div>

          <form className={styles.settingsForm} onSubmit={saveContacts}>
            <label className={shared.fieldLabel}>
              <span className={styles.labelWithStatus}>
                <span><Mail size={13} /> 邮箱</span>
                <StatusBadge value={user.email} />
              </span>
              <input
                value={profileForm.email}
                onChange={event => setProfileValue('email', event.target.value)}
                type="email"
                placeholder="name@example.com"
                maxLength={255}
                required
              />
            </label>
            <label className={shared.fieldLabel}>
              <span className={styles.labelWithStatus}>
                <span><Phone size={13} /> 手机号</span>
                <StatusBadge value={user.phone} />
              </span>
              <input
                value={profileForm.phone}
                onChange={event => setProfileValue('phone', event.target.value)}
                type="tel"
                placeholder="+86 138 0000 0000"
                maxLength={30}
                autoComplete="tel"
              />
            </label>
            <p className={styles.formHint}>手机号支持国际区号格式，保存后会进行格式规范化。短信验证码验证将在接入短信服务后开放。</p>
            <button type="submit" className={shared.secondaryAction} disabled={contactSaving}>
              <Save size={15} />
              {contactSaving ? '保存中…' : '保存联系方式'}
            </button>
            {contactFeedback ? <Feedback feedback={contactFeedback} /> : null}
          </form>
        </section>
      </div>

      <section className={`${shared.plainPanel} ${styles.securityCard}`}>
        <div className={shared.plainPanelHeading}>
          <div>
            <div className={shared.panelKicker}>SECURITY</div>
            <h2>登录安全</h2>
          </div>
          <LockKeyhole size={17} />
        </div>
        <div className={styles.securityLayout}>
          <div className={styles.securityIntro}>
            <div className={styles.securityIcon}><ShieldCheck size={20} /></div>
            <div>
              <strong>修改密码</strong>
              <p>修改后，其他设备上的登录会话会自动退出。</p>
            </div>
          </div>
          <form className={styles.passwordForm} onSubmit={changePassword}>
            <label className={shared.fieldLabel}>
              <span><LockKeyhole size={13} /> 当前密码</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={event => setPasswordValue('currentPassword', event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className={shared.fieldLabel}>
              <span><KeyRound size={13} /> 新密码</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={event => setPasswordValue('newPassword', event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className={shared.fieldLabel}>
              <span><CheckCircle2 size={13} /> 确认新密码</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={event => setPasswordValue('confirmPassword', event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <button type="submit" className={shared.primaryAction} disabled={passwordSaving}>
              <LockKeyhole size={15} />
              {passwordSaving ? '更新中…' : '更新密码'}
            </button>
            {passwordFeedback ? <Feedback feedback={passwordFeedback} /> : null}
          </form>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ value }) {
  return (
    <span className={`${styles.bindingStatus} ${value ? styles.bindingStatusSet : ''}`}>
      {value ? '已设置' : '未设置'}
    </span>
  );
}

function Feedback({ feedback }) {
  const Icon = feedback.type === 'success' ? CheckCircle2 : ShieldCheck;
  return (
    <div className={`${styles.feedback} ${feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`} role="status">
      <Icon size={14} />
      <span>{feedback.text}</span>
    </div>
  );
}
