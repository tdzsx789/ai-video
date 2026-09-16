import { Clipboard, ExternalLink, Film, Image, LoaderCircle, Play, RotateCcw, ScanSearch } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../../lib/format.js';
import { getModelLabel } from '../../lib/modelLabels.js';
import shared from '../../styles/shared.module.css';
import styles from './HistoryCard.module.css';

export default function HistoryCard({ item, onCopy, onUseTask, onPreview }) {
  const isImage = item.kind === 'image';
  const mediaUrl = isImage ? item.imageUrl : item.videoUrl;
  const media = mediaUrl ? {
    type: isImage ? 'image' : 'video',
    url: mediaUrl,
    title: isImage ? '图片创作结果' : '视频创作结果',
    alt: 'AI金铲生成结果',
    prompt: item.prompt,
    model: item.model ? getModelLabel(item.model) : '',
    createdAt: formatDate(item.finishedAt || item.createdAt || item.savedAt),
  } : null;
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
        {media ? (
          <button
            type="button"
            className={styles.thumbnailPreview}
            onClick={() => onPreview?.(media)}
            aria-label={`预览${isImage ? '图片' : '视频'}`}
          >
            {isImage ? (
              <img src={item.imageUrl} alt="AI金铲生成图片" />
            ) : (
              <video src={item.videoUrl} preload="metadata" muted playsInline />
            )}
          </button>
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
          <span className={styles.thumbnailPlay} aria-hidden="true">
            <Play size={15} fill="currentColor" />
          </span>
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
          <span>{isImage ? (item.size || item.ratio || '自动尺寸') : (item.resolution || '自动分辨率')}</span>
          <span>{isImage ? getModelLabel(item.model || '图片模型') : formatDuration(item.duration)}</span>
          <span>{item.creditCost ? `${item.creditCost} 积分` : '未计费'}</span>
          <span title={item.id}>{item.id?.slice(0, 16) || '无任务编号'}</span>
        </div>
        <div className={styles.historyCardActions}>
          {isImage && item.imageUrl ? (
            <>
              <button className={shared.inlineAction} type="button" onClick={() => onPreview?.(media)}>
                <ScanSearch size={14} />
                预览图片
              </button>
              <a className={shared.inlineAction} href={item.imageUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开原图
              </a>
              <button className={shared.inlineAction} type="button" onClick={() => onCopy(item.imageUrl)}>
                <Clipboard size={14} />
                复制地址
              </button>
            </>
          ) : item.videoUrl ? (
            <>
              <button className={shared.inlineAction} type="button" onClick={() => onPreview?.(media)}>
                <ScanSearch size={14} />
                预览视频
              </button>
              <a className={shared.inlineAction} href={item.videoUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开原视频
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
