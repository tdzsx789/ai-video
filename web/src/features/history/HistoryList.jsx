import { Database, Image, RefreshCw, Search, Trash2, Video } from 'lucide-react';
import HistoryCard from './HistoryCard.jsx';
import shared from '../../styles/shared.module.css';
import styles from './HistoryList.module.css';

function assetKind(item) {
  return item?.kind === 'image' ? 'image' : 'video';
}

export default function HistoryList({
  items,
  loading,
  onRefresh,
  onClear,
  onCopy,
  onUseTask,
  onReuse,
  onPreview,
  filter = 'all',
  onFilterChange,
  search = '',
  onSearchChange,
  compact = false,
}) {
  const videoCount = items.filter(item => assetKind(item) === 'video').length;
  const imageCount = items.filter(item => assetKind(item) === 'image').length;
  const filteredCount = items.length;

  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyPanelHeader}>
        <div>
          <div className={shared.panelKicker}>ASSET LIBRARY</div>
          <h3>{compact ? '最近素材' : '创作资产库'}</h3>
          <p>{compact ? `${items.length} 条最近创作` : '统一管理视频与图片素材，支持预览、复用、复制地址和继续查询。'}</p>
        </div>
        <div className={styles.historyPanelActions}>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading} title="刷新资产库" aria-label="刷新资产库">
            <RefreshCw className={loading ? shared.spin : ''} size={16} />
          </button>
          {!compact ? (
            <button type="button" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={onClear} title="清空资产库" aria-label="清空资产库">
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className={styles.assetToolbar}>
          <div className={styles.assetFilters} role="tablist" aria-label="筛选资产类型">
            {[
              { id: 'all', label: '全部', icon: Database },
              { id: 'video', label: '视频', icon: Video },
              { id: 'image', label: '图片', icon: Image },
            ].map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.assetFilterButton} ${filter === option.id ? styles.isSelected : ''}`}
                  onClick={() => onFilterChange?.(option.id)}
                  role="tab"
                  aria-selected={filter === option.id}
                >
                  <Icon size={15} />
                  {option.label}
                </button>
              );
            })}
          </div>

          <label className={styles.assetSearch}>
            <Search size={15} />
            <input
              value={search}
              onChange={event => onSearchChange?.(event.target.value)}
              placeholder="搜索提示词、模型或任务编号"
            />
          </label>
        </div>
      ) : null}

      {!compact ? (
        <div className={styles.assetStats} aria-label="资产统计">
          <div><strong>{filteredCount}</strong><span>当前结果</span></div>
          <div><strong>{videoCount}</strong><span>视频素材</span></div>
          <div><strong>{imageCount}</strong><span>图片素材</span></div>
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className={styles.historyEmpty}>
          <RefreshCw className={shared.spin} size={20} />
          <span>正在读取资产库…</span>
        </div>
      ) : items.length ? (
        <div className={`${styles.historyList} ${!compact ? styles.assetGrid : ''}`}>
          {items.map(item => (
            <HistoryCard
              key={item.id || item.videoUrl || item.imageUrl}
              item={item}
              onCopy={onCopy}
              onUseTask={onUseTask}
              onReuse={onReuse}
              onPreview={onPreview}
              assetMode={!compact}
            />
          ))}
        </div>
      ) : (
        <div className={styles.historyEmpty}>
          <Database size={22} />
          <span>{search || filter !== 'all' ? '没有找到匹配的素材。' : '完成任务后，视频和图片素材会自动出现在这里。'}</span>
        </div>
      )}
    </div>
  );
}
