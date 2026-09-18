import { Clipboard, ExternalLink, Film, Image, LoaderCircle, Play, RotateCcw, ScanSearch, WandSparkles } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../../lib/format.js';
import { getModelLabel } from '../../lib/modelLabels.js';
import shared from '../../styles/shared.module.css';
import styles from './HistoryCard.module.css';

export default function HistoryCard({ item, onCopy, onUseTask, onReuse, onPreview, assetMode = false }) {
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
    <article className={`${styles.historyCard} ${assetMode ? styles.assetCard : ''}`}>
      <div className={styles.historyThumbnail}>
        <span className={styles.assetTypeBadge}>
          {isImage ? <Image size={12} /> : <Film size={12} />}
          {isImage ? '图片' : '视频'}
        </span>
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
          <span className={styles.statusPill}>
            <span className={`${styles.statusDot} ${dotClass}`} />
            {statusLabel(item.status)}
          </span>
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
          {assetMode && media ? (
            <button className={styles.assetPrimaryAction} type="button" onClick={() => onPreview?.(media)}>
              <ScanSearch size={15} />
              预览素材
            </button>
          ) : null}
          <div className={styles.assetSecondaryActions}>
            {!assetMode && media ? (
              <button className={shared.inlineAction} type="button" onClick={() => onPreview?.(media)}>
                <ScanSearch size={14} />
                预览素材
              </button>
            ) : null}
            {isImage && item.imageUrl ? (
              <>
                <a
                  className={assetMode ? styles.assetIconAction : shared.inlineAction}
                  href={item.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="打开原图"
                  aria-label="打开原图"
                >
                  <ExternalLink size={14} />
                  {!assetMode ? '打开原图' : null}
                </a>
                <button
                  className={assetMode ? styles.assetIconAction : shared.inlineAction}
                  type="button"
                  onClick={() => onCopy(item.imageUrl)}
                  title="复制地址"
                  aria-label="复制地址"
                >
                  <Clipboard size={14} />
                  {!assetMode ? '复制地址' : null}
                </button>
              </>
            ) : item.videoUrl ? (
              <>
                <a
                  className={assetMode ? styles.assetIconAction : shared.inlineAction}
                  href={item.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="打开原视频"
                  aria-label="打开原视频"
                >
                  <ExternalLink size={14} />
                  {!assetMode ? '打开原视频' : null}
                </a>
                <button
                  className={assetMode ? styles.assetIconAction : shared.inlineAction}
                  type="button"
                  onClick={() => onCopy(item.videoUrl)}
                  title="复制地址"
                  aria-label="复制地址"
                >
                  <Clipboard size={14} />
                  {!assetMode ? '复制地址' : null}
                </button>
              </>
            ) : null}
            {media ? (
              <button
                className={assetMode ? styles.assetIconAction : shared.inlineAction}
                type="button"
                onClick={() => onReuse?.(item)}
                title="用于创作"
                aria-label="用于创作"
              >
                <WandSparkles size={14} />
                {!assetMode ? '用于创作' : null}
              </button>
            ) : null}
            {!isImage && item.id && !item.videoUrl ? (
              <button
                className={assetMode ? styles.assetIconAction : shared.inlineAction}
                type="button"
                onClick={() => onUseTask(item.id)}
                title="继续查询"
                aria-label="继续查询"
              >
                <RotateCcw size={14} />
                {!assetMode ? '继续查询' : null}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
