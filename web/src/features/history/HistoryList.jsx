import { Database, RefreshCw, Trash2 } from 'lucide-react';
import HistoryCard from './HistoryCard.jsx';

export default function HistoryList({
  items,
  loading,
  onRefresh,
  onClear,
  onCopy,
  onUseTask,
  compact = false,
}) {
  return (
    <div className={`history-panel ${compact ? 'is-compact' : ''}`}>
      <div className="history-panel-header">
        <div>
          <div className="panel-kicker">PERSISTED LIBRARY</div>
          <h3>历史视频地址</h3>
          <p>{items.length} 条记录保存在 PostgreSQL 中</p>
        </div>
        <div className="history-panel-actions">
          <button type="button" className="icon-button" onClick={onRefresh} disabled={loading} title="刷新历史记录" aria-label="刷新历史记录">
            <RefreshCw className={loading ? 'spin' : ''} size={16} />
          </button>
          {!compact ? (
            <button type="button" className="icon-button icon-button-danger" onClick={onClear} title="清空历史记录" aria-label="清空历史记录">
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {loading && !items.length ? (
        <div className="history-empty">
          <RefreshCw className="spin" size={20} />
          <span>正在读取历史记录…</span>
        </div>
      ) : items.length ? (
        <div className="history-list">
          {items.map(item => (
            <HistoryCard key={item.id || item.videoUrl} item={item} onCopy={onCopy} onUseTask={onUseTask} />
          ))}
        </div>
      ) : (
        <div className="history-empty">
          <Database size={22} />
          <span>完成任务后，视频地址会自动出现在这里。</span>
        </div>
      )}
    </div>
  );
}
