import { Clipboard, ExternalLink, Film, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../../lib/format.js';
import shared from '../../styles/shared.module.css';
import styles from './HistoryCard.module.css';

export default function HistoryCard({ item, onCopy, onUseTask }) {
  const tone = statusTone(item.status);
  const dotClass = tone === 'success'
    ? styles.dotSuccess
    : tone === 'loading'
      ? styles.dotLoading
      : tone === 'danger'
        ? styles.dotDanger
        : styles.dotNeutral;
  return (
    <article className={styles.historyCard}>
      <div className={styles.historyThumbnail}>
        {item.videoUrl ? (
          <video src={item.videoUrl} preload="metadata" muted playsInline />
        ) : (
          <div className={styles.historyThumbnailEmpty}>
            {tone === 'loading' ? <LoaderCircle className={shared.spin} size={22} /> : <Film size={22} />}
          </div>
        )}
        {item.videoUrl ? (
          <a className={styles.thumbnailPlay} href={item.videoUrl} target="_blank" rel="noreferrer" aria-label="打开视频">
            <Play size={15} fill="currentColor" />
          </a>
        ) : null}
      </div>
      <div className={styles.historyCardBody}>
        <div className={styles.historyCardHeading}>
          <span className={`${styles.statusDot} ${dotClass}`} />
          <span>{statusLabel(item.status)}</span>
          <span className={styles.historyDate}>{formatDate(item.finishedAt || item.createdAt || item.savedAt)}</span>
        </div>
        <p className={styles.historyPrompt}>{item.prompt || '未记录提示词'}</p>
        <div className={styles.historyCardMeta}>
          <span>{item.resolution || '自动分辨率'}</span>
          <span>{formatDuration(item.duration)}</span>
          <span title={item.id}>{item.id?.slice(0, 16) || '无任务编号'}</span>
        </div>
        <div className={styles.historyCardActions}>
          {item.videoUrl ? (
            <>
              <a className={shared.inlineAction} href={item.videoUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开
              </a>
              <button className={shared.inlineAction} type="button" onClick={() => onCopy(item.videoUrl)}>
                <Clipboard size={14} />
                复制地址
              </button>
            </>
          ) : null}
          {item.id ? (
            <button className={shared.inlineAction} type="button" onClick={() => onUseTask(item.id)}>
              <RotateCcw size={14} />
              继续查询
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
