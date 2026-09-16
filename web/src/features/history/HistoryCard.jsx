import { Clipboard, ExternalLink, Film, Image, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../../lib/format.js';
import { getModelLabel } from '../../lib/modelLabels.js';
import shared from '../../styles/shared.module.css';
import styles from './HistoryCard.module.css';

export default function HistoryCard({ item, onCopy, onUseTask }) {
  const isImage = item.kind === 'image';
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
        {isImage && item.imageUrl ? (
          <img src={item.imageUrl} alt="AI金铲生成图片" />
        ) : !isImage && item.videoUrl ? (
          <video src={item.videoUrl} preload="metadata" muted playsInline />
        ) : (
          <div className={styles.historyThumbnailEmpty}>
            {tone === 'loading'
              ? <LoaderCircle className={shared.spin} size={22} />
              : isImage
                ? <Image size={22} />
                : <Film size={22} />}
          </div>
        )}
        {!isImage && item.videoUrl ? (
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
          <span>{isImage ? (item.ratio || '自动画幅') : (item.resolution || '自动分辨率')}</span>
          <span>{isImage ? getModelLabel(item.model || '图片模型') : formatDuration(item.duration)}</span>
          <span>{item.creditCost ? `${item.creditCost} 积分` : '未计费'}</span>
          <span title={item.id}>{item.id?.slice(0, 16) || '无任务编号'}</span>
        </div>
        <div className={styles.historyCardActions}>
          {isImage && item.imageUrl ? (
            <>
              <a className={shared.inlineAction} href={item.imageUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开图片
              </a>
              <button className={shared.inlineAction} type="button" onClick={() => onCopy(item.imageUrl)}>
                <Clipboard size={14} />
                复制地址
              </button>
            </>
          ) : item.videoUrl ? (
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
          {!isImage && item.id ? (
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
