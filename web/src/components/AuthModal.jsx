import { AtSign, LockKeyhole, Sparkles, UserRound, X } from 'lucide-react';
import { useState } from 'react';

export default function AuthModal({ mode, onModeChange, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const submit = event => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
          <X size={17} />
        </button>
        <div className="auth-modal-mark"><img src="/ai-jinchan-logo.png" alt="" /></div>
        <div className="section-eyebrow">{mode === 'register' ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</div>
        <h2 id="auth-title">{mode === 'register' ? '注册 AI金铲' : '登录 AI金铲'}</h2>
        <p className="auth-modal-subtitle">
          {mode === 'register' ? '建立你的个人创作空间。' : '继续你的创作工作流。'}
        </p>

        <div className="auth-tabs" role="tablist">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => onModeChange('login')}>登录</button>
          <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => onModeChange('register')}>注册</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' ? (
            <label className="field-label">
              <span><UserRound size={13} /> 昵称</span>
              <input
                autoFocus
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                placeholder="你的创作者昵称"
                required
              />
            </label>
          ) : null}
          <label className="field-label">
            <span><AtSign size={13} /> 邮箱</span>
            <input
              autoFocus={mode === 'login'}
              type="email"
              value={form.email}
              onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
              placeholder="name@example.com"
              required
            />
          </label>
          <label className="field-label">
            <span><LockKeyhole size={13} /> 密码</span>
            <input
              type="password"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              placeholder="至少 6 位字符"
              minLength={6}
              required
            />
          </label>
          <button type="submit" className="primary-action auth-submit">
            <Sparkles size={16} />
            {mode === 'register' ? '创建账户' : '进入工作区'}
          </button>
        </form>
        <small className="auth-modal-footnote">当前为本地演示注册，正式账户服务可直接接入。</small>
      </section>
    </div>
  );
}
