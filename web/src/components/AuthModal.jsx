import { KeyRound, LockKeyhole, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import shared from '../styles/shared.module.css';
import styles from './AuthModal.module.css';

export default function AuthModal({ onClose, onSubmit, error, loading }) {
  const [form, setForm] = useState({ username: '', password: '' });

  const submit = event => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className={styles.authModal} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="关闭">
          <X size={17} />
        </button>
        <div className={styles.authModalMark}><img src="/ai-jinchan-logo.png" alt="" /></div>
        <div className={shared.sectionEyebrow}>MOCK ACCOUNT</div>
        <h2 id="auth-title">登录 AI金铲</h2>
        <p className={styles.authModalSubtitle}>使用已配置的 mock 账户进入创作工作区。</p>

        <form onSubmit={submit} className={styles.authForm}>
          <label className={shared.fieldLabel}>
            <span><KeyRound size={13} /> 账号</span>
            <input
              autoFocus
              value={form.username}
              onChange={event => setForm(current => ({ ...current, username: event.target.value }))}
              placeholder="请输入账号"
              required
            />
          </label>
          <label className={shared.fieldLabel}>
            <span><LockKeyhole size={13} /> 密码</span>
            <input
              type="password"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              placeholder="请输入密码"
              required
            />
          </label>
          {error ? <div className={styles.authError} role="alert">{error}</div> : null}
          <button type="submit" className={`${shared.primaryAction} ${styles.authSubmit}`} disabled={loading}>
            <Sparkles size={16} />
            {loading ? '登录中…' : '进入工作区'}
          </button>
        </form>
        <small className={styles.authModalFootnote}>当前使用 mock 账户，后续再接入注册流程。</small>
      </section>
    </div>
  );
}
