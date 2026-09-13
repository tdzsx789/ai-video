import { Activity, Check, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';

export default function ProfilePage({
  user,
  apiKey,
  onApiKeyChange,
  health,
  onSave,
  onOpenAuth,
  onLogout,
}) {
  if (!user) {
    return (
      <div className="page-stack profile-page">
        <section className="empty-account-panel">
          <div className="empty-account-icon"><UserRound size={25} /></div>
          <div className="section-eyebrow">ACCOUNT CENTER</div>
          <h1>登录你的 AI金铲</h1>
          <p>注册后可以继续完善个人资料，后续同步创作资产与积分。</p>
          <button type="button" className="primary-action" onClick={onOpenAuth}>
            <UserRound size={16} />
            登录 / 注册
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack profile-page">
      <section className="page-heading page-heading-compact">
        <div>
          <div className="section-eyebrow">ACCOUNT CENTER</div>
          <h1>用户中心</h1>
          <p>管理个人资料与创作服务连接。</p>
        </div>
        <button type="button" className="ghost-action" onClick={onLogout}>
          <LogOut size={15} />
          退出登录
        </button>
      </section>

      <div className="profile-grid">
        <section className="plain-panel profile-card">
          <div className="profile-card-head">
            <div className="large-avatar">{user.name?.slice(0, 1) || 'AI'}</div>
            <div>
              <div className="panel-kicker">CREATOR PROFILE</div>
              <h2>{user.name}</h2>
              <span className="account-type">本地演示账户</span>
            </div>
          </div>
          <div className="profile-fields">
            <label className="field-label">
              <span><UserRound size={13} /> 昵称</span>
              <input name="name" defaultValue={user.name} onBlur={event => onSave({ name: event.target.value })} />
            </label>
            <label className="field-label">
              <span><Mail size={13} /> 邮箱</span>
              <input name="email" type="email" defaultValue={user.email} onBlur={event => onSave({ email: event.target.value })} />
            </label>
          </div>
          <div className="profile-status">
            <ShieldCheck size={15} />
            <span>账户信息已保存在本机浏览器</span>
          </div>
        </section>

        <section className="plain-panel connection-card">
          <div className="plain-panel-heading">
            <div>
              <div className="panel-kicker">SERVICE CONNECTION</div>
              <h2>服务连接</h2>
            </div>
            <span className={`connection-state ${health?.ok ? 'is-online' : ''}`}>
              <Activity size={13} />
              {health?.ok ? '在线' : '检测中'}
            </span>
          </div>
          <label className="field-label api-key-field">
            <span><KeyRound size={13} /> API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={event => onApiKeyChange(event.target.value)}
              placeholder="使用服务端环境变量或输入密钥"
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          <p className="connection-note">密钥仅用于当前设备上的生成请求，不会写入历史记录。</p>
          <div className="connection-health">
            <span className={`health-dot ${health?.ok ? 'is-online' : ''}`} />
            <span>{health?.ok ? 'Node 服务与数据库连接正常' : '正在检查 Node 服务与数据库'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
