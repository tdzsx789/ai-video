import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import shared from '../styles/shared.module.css';
import styles from './ProfilePage.module.css';

function blankPasswordForm() {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

export default function ProfilePage({
  user,
  onSave,
  onChangePassword,
  onVerifyPassword,
  onOpenAuth,
  onLogout,
}) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState(blankPasswordForm);
  const [passwordVisible, setPasswordVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordVerifying, setPasswordVerifying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState('verify');
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

  const setProfileValue = (key, value) => {
    setProfileForm(current => ({ ...current, [key]: value }));
    if (key === 'name') setProfileFeedback(null);
    if (key === 'email' || key === 'phone') setContactFeedback(null);
  };

  const resetForms = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setPasswordForm(blankPasswordForm());
    setPasswordVisible({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setPasswordStep('verify');
    setProfileFeedback(null);
    setContactFeedback(null);
    setPasswordFeedback(null);
  };

  const closePasswordDialog = () => {
    if (passwordSaving || passwordVerifying) return;
    setPasswordDialogOpen(false);
    setPasswordForm(blankPasswordForm());
    setPasswordVisible({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setPasswordStep('verify');
    setPasswordFeedback(null);
  };

  const openPasswordDialog = () => {
    setPasswordDialogOpen(true);
    setPasswordForm(blankPasswordForm());
    setPasswordVisible({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setPasswordStep('verify');
    setPasswordFeedback(null);
  };

  const toggleEditing = () => {
    if (editing) {
      resetForms();
      setEditing(false);
      return;
    }
    setEditing(true);
  };

  useEffect(() => {
    if (!editing && !passwordDialogOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key !== 'Escape') return;
      if (passwordSaving || passwordVerifying) return;
      if (passwordDialogOpen) {
        closePasswordDialog();
      } else if (editing) {
        toggleEditing();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [editing, passwordDialogOpen, passwordSaving, passwordVerifying]);

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

  const togglePasswordVisible = key => {
    setPasswordVisible(current => ({ ...current, [key]: !current[key] }));
  };

  const passwordScore = [
    passwordForm.newPassword.length >= 8,
    passwordForm.newPassword.length >= 12,
    /[A-Za-z]/.test(passwordForm.newPassword),
    /\d/.test(passwordForm.newPassword),
    /[^A-Za-z0-9]/.test(passwordForm.newPassword),
  ].filter(Boolean).length;
  const passwordStrength = passwordScore >= 4
    ? { label: '强', className: styles.passwordStrengthStrong }
    : passwordScore >= 2
      ? { label: '中', className: styles.passwordStrengthMedium }
      : { label: '弱', className: styles.passwordStrengthWeak };
  const passwordChecks = [
    { label: '至少 8 位字符', valid: passwordForm.newPassword.length >= 8 },
    { label: '不能与当前密码相同', valid: Boolean(passwordForm.currentPassword && passwordForm.newPassword && passwordForm.currentPassword !== passwordForm.newPassword) },
    { label: '两次输入的新密码一致', valid: Boolean(passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword) },
  ];
  const passwordSuggestions = [
    { label: '建议至少 12 位', valid: passwordForm.newPassword.length >= 12 },
    { label: '建议混合字母、数字和符号', valid: /[A-Za-z]/.test(passwordForm.newPassword) && /\d/.test(passwordForm.newPassword) && /[^A-Za-z0-9]/.test(passwordForm.newPassword) },
  ];
  const passwordBusy = passwordSaving || passwordVerifying;
  const passwordProgressStep = passwordStep === 'done' ? 3 : passwordStep === 'reset' ? 2 : 1;
  const canVerifyPassword = Boolean(passwordForm.currentPassword) && !passwordVerifying;
  const canSubmitPassword = passwordStep === 'reset'
    && passwordChecks.every(item => item.valid)
    && Boolean(passwordForm.currentPassword)
    && !passwordSaving;

  const verifyPassword = async event => {
    event.preventDefault();
    if (!passwordForm.currentPassword) {
      setPasswordFeedback({ type: 'error', text: '请输入当前密码。' });
      return;
    }

    setPasswordVerifying(true);
    setPasswordFeedback(null);
    try {
      if (onVerifyPassword) {
        await onVerifyPassword(passwordForm.currentPassword);
      }
      setPasswordStep('reset');
      setPasswordFeedback({ type: 'success', text: '身份已验证，请设置新的登录密码。' });
    } catch (error) {
      setPasswordFeedback({ type: 'error', text: error.message || '当前密码验证失败，请重新输入。' });
    } finally {
      setPasswordVerifying(false);
    }
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
      setPasswordForm(blankPasswordForm());
      setPasswordVisible({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setPasswordStep('done');
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
          <p>{editing ? '修改账户资料、联系方式和登录安全。' : '查看当前账户信息和安全状态。'}</p>
        </div>
        <div className={styles.pageActions}>
          {!editing ? (
            <button type="button" className={shared.primaryAction} onClick={toggleEditing}>
              <Edit3 size={15} />
              修改账号信息
            </button>
          ) : null}
          <button type="button" className={shared.ghostAction} onClick={onLogout}>
            <LogOut size={15} />
            退出登录
          </button>
        </div>
      </section>

      {!editing ? (
        <section className={`${shared.plainPanel} ${styles.accountOverview}`}>
          <div className={styles.profileCardHead}>
            <div className={styles.largeAvatar}>{user.name?.slice(0, 1) || user.username?.slice(0, 1) || 'AI'}</div>
            <div>
              <div className={shared.panelKicker}>ACCOUNT PROFILE</div>
              <h2>{user.name || user.username}</h2>
              <span className={styles.accountType}>AI金铲创作者</span>
            </div>
          </div>

          <div className={styles.accountOverviewGrid}>
            <OverviewItem icon={KeyRound} label="账号" value={user.username} />
            <OverviewItem icon={UserRound} label="昵称" value={user.name} />
            <OverviewItem icon={Mail} label="邮箱" value={user.email} />
            <OverviewItem icon={Phone} label="手机号" value={user.phone} />
          </div>

          <div className={styles.accountSecuritySummary}>
            <div className={styles.securityIcon}><ShieldCheck size={18} /></div>
            <div>
              <strong>登录密码</strong>
              <p>密码已设置。修改密码会要求先验证当前密码。</p>
            </div>
            <div className={styles.accountSecurityActions}>
              <span className={styles.bindingStatusSet}>已设置</span>
              <button type="button" className={styles.securityTextButton} onClick={openPasswordDialog}>
                更改密码
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) toggleEditing();
          }}
        >
          <section className={styles.editModal} role="dialog" aria-modal="true" aria-labelledby="edit-account-title">
            <div className={styles.editModalHeader}>
              <div>
                <div className={shared.panelKicker}>ACCOUNT SETTINGS</div>
                <h2 id="edit-account-title">修改账号信息</h2>
                <p>更新昵称、联系方式或登录密码。</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={toggleEditing}
                title="取消修改"
                aria-label="取消修改"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.editModalBody} onMouseDown={event => event.stopPropagation()}>
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
                <div className={styles.securityChangePanel}>
                  <div className={styles.securityIntro}>
                    <div className={styles.securityIcon}><ShieldCheck size={20} /></div>
                    <div>
                      <strong>密码与会话</strong>
                      <p>修改密码会先验证当前密码，更新后其他设备上的登录会话会自动退出。</p>
                    </div>
                  </div>
                  <button type="button" className={shared.primaryAction} onClick={openPasswordDialog}>
                    <LockKeyhole size={15} />
                    更改密码
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {passwordDialogOpen ? (
        <div
          className={`${styles.modalBackdrop} ${styles.passwordModalBackdrop}`}
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closePasswordDialog();
          }}
        >
          <section className={styles.passwordModal} role="dialog" aria-modal="true" aria-labelledby="change-password-title">
            <div className={styles.editModalHeader}>
              <div>
                <div className={shared.panelKicker}>SIGN-IN SECURITY</div>
                <h2 id="change-password-title">更改密码</h2>
                <p>先验证当前密码，再设置新的登录密码。</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closePasswordDialog}
                disabled={passwordBusy}
                title="关闭"
                aria-label="关闭"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.passwordDialogBody} onMouseDown={event => event.stopPropagation()}>
              <div className={styles.passwordProgress} aria-label={`更改密码进度：第 ${passwordProgressStep} 步，共 3 步`}>
                {['验证身份', '设置新密码', '完成'].map((label, index) => {
                  const step = index + 1;
                  const isComplete = passwordProgressStep > step || passwordStep === 'done';
                  const isActive = passwordProgressStep === step && passwordStep !== 'done';
                  return (
                    <span
                      key={label}
                      className={`${styles.passwordProgressItem} ${isActive ? styles.passwordProgressActive : ''} ${isComplete ? styles.passwordProgressComplete : ''}`}
                    >
                      <span>{step}</span>
                      {label}
                    </span>
                  );
                })}
              </div>

              {passwordStep === 'verify' ? (
                <form className={styles.passwordStageForm} onSubmit={verifyPassword}>
                  <div className={styles.passwordStep}>
                    <span className={styles.passwordStepIndex}>1</span>
                    <div>
                      <strong>验证当前密码</strong>
                      <p>确认是本人操作后，再进入新密码设置。</p>
                    </div>
                  </div>

                  <PasswordInput
                    label="当前密码"
                    icon={LockKeyhole}
                    value={passwordForm.currentPassword}
                    onChange={value => setPasswordValue('currentPassword', value)}
                    autoComplete="current-password"
                    visible={passwordVisible.currentPassword}
                    onToggleVisible={() => togglePasswordVisible('currentPassword')}
                    disabled={passwordBusy}
                  />

                  <div className={styles.passwordSessionNotice}>
                    <ShieldCheck size={16} />
                    <span>验证通过后才能设置新密码。系统不会在页面中显示或保存你的明文密码。</span>
                  </div>

                  <div className={styles.passwordDialogActions}>
                    <button type="button" className={shared.ghostAction} onClick={closePasswordDialog} disabled={passwordBusy}>
                      取消
                    </button>
                    <button type="submit" className={shared.primaryAction} disabled={!canVerifyPassword || passwordBusy}>
                      <ShieldCheck size={15} />
                      {passwordVerifying ? '验证中…' : '验证并继续'}
                    </button>
                  </div>

                  {passwordFeedback ? <Feedback feedback={passwordFeedback} /> : null}
                </form>
              ) : null}

              {passwordStep === 'reset' ? (
                <form className={styles.passwordStageForm} onSubmit={changePassword}>
                  <div className={styles.passwordStep}>
                    <span className={styles.passwordStepIndex}>2</span>
                    <div>
                      <strong>设置新密码</strong>
                      <p>使用不容易猜到、且没有在其他网站重复使用的密码。</p>
                    </div>
                  </div>

                  <PasswordInput
                    label="新密码"
                    icon={KeyRound}
                    value={passwordForm.newPassword}
                    onChange={value => setPasswordValue('newPassword', value)}
                    autoComplete="new-password"
                    visible={passwordVisible.newPassword}
                    onToggleVisible={() => togglePasswordVisible('newPassword')}
                    disabled={passwordBusy}
                  />

                  <div className={styles.passwordStrengthBlock}>
                    <div className={styles.passwordStrengthHeader}>
                      <span>密码强度</span>
                      <strong className={passwordStrength.className}>{passwordStrength.label}</strong>
                    </div>
                    <div className={styles.passwordStrengthTrack}>
                      <span className={passwordStrength.className} style={{ width: `${Math.max(passwordScore, 1) * 20}%` }} />
                    </div>
                    <div className={styles.passwordCheckGrid}>
                      {[...passwordChecks, ...passwordSuggestions].map(item => (
                        <span key={item.label} className={item.valid ? styles.passwordCheckPassed : ''}>
                          <CheckCircle2 size={13} />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <PasswordInput
                    label="确认新密码"
                    icon={CheckCircle2}
                    value={passwordForm.confirmPassword}
                    onChange={value => setPasswordValue('confirmPassword', value)}
                    autoComplete="new-password"
                    visible={passwordVisible.confirmPassword}
                    onToggleVisible={() => togglePasswordVisible('confirmPassword')}
                    disabled={passwordBusy}
                  />

                  <div className={styles.passwordSessionNotice}>
                    <ShieldCheck size={16} />
                    <span>更新成功后，除当前设备外的其他登录会话会退出。</span>
                  </div>

                  <div className={styles.passwordDialogActions}>
                    <button
                      type="button"
                      className={shared.ghostAction}
                      onClick={() => {
                        if (passwordBusy) return;
                        setPasswordStep('verify');
                        setPasswordForm(current => ({
                          ...current,
                          newPassword: '',
                          confirmPassword: '',
                        }));
                        setPasswordFeedback(null);
                      }}
                      disabled={passwordBusy}
                    >
                      返回上一步
                    </button>
                    <button type="submit" className={shared.primaryAction} disabled={!canSubmitPassword || passwordBusy}>
                      <LockKeyhole size={15} />
                      {passwordSaving ? '更新中…' : '确认更改密码'}
                    </button>
                  </div>

                  {passwordFeedback ? <Feedback feedback={passwordFeedback} /> : null}
                </form>
              ) : null}

              {passwordStep === 'done' ? (
                <div className={styles.passwordSuccessPanel}>
                  <div className={styles.passwordSuccessIcon}><CheckCircle2 size={24} /></div>
                  <div>
                    <strong>密码已更新</strong>
                    <p>其他设备上的登录会话已退出，当前设备可以继续使用。</p>
                  </div>
                  <button type="button" className={shared.primaryAction} onClick={closePasswordDialog}>
                    完成
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PasswordInput({
  label,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  visible,
  onToggleVisible,
  disabled,
}) {
  return (
    <label className={`${shared.fieldLabel} ${styles.passwordInputField}`}>
      <span><Icon size={13} /> {label}</span>
      <span className={styles.passwordInputWrap}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          required
        />
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={disabled}
          title={visible ? '隐藏密码' : '显示密码'}
          aria-label={visible ? '隐藏密码' : '显示密码'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
    </label>
  );
}

function OverviewItem({ icon: Icon, label, value }) {
  return (
    <div className={styles.accountOverviewItem}>
      <span className={styles.accountOverviewLabel}><Icon size={14} /> {label}</span>
      <strong>{value || '未设置'}</strong>
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
