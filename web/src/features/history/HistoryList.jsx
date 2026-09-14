import { Database, RefreshCw, Trash2 } from 'lucide-react';
import HistoryCard from './HistoryCard.jsx';
import shared from '../../styles/shared.module.css';
import styles from './HistoryList.module.css';

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
    <div className={styles.historyPanel}>
      <div className={styles.historyPanelHeader}>
        <div>
          <div className={shared.panelKicker}>PERSISTED LIBRARY</div>
          <h3>历史视频地址</h3>
          <p>{items.length} 条记录保存在 PostgreSQL 中</p>
        </div>
        <div className={styles.historyPanelActions}>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading} title="刷新历史记录" aria-label="刷新历史记录">
            <RefreshCw className={loading ? shared.spin : ''} size={16} />
          </button>
          {!compact ? (
            <button type="button" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={onClear} title="清空历史记录" aria-label="清空历史记录">
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {loading && !items.length ? (
        <div className={styles.historyEmpty}>
          <RefreshCw className={shared.spin} size={20} />
          <span>正在读取历史记录…</span>
        </div>
      ) : items.length ? (
        <div className={styles.historyList}>
          {items.map(item => (
            <HistoryCard key={item.id || item.videoUrl} item={item} onCopy={onCopy} onUseTask={onUseTask} />
          ))}
        </div>
      ) : (
        <div className={styles.historyEmpty}>
          <Database size={22} />
          <span>完成任务后，视频地址会自动出现在这里。</span>
        </div>
      )}
    </div>
  );
}
