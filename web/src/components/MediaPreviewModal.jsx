import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Clipboard,
  Download,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import shared from '../styles/shared.module.css';
import styles from './MediaPreviewModal.module.css';

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function fileNameForMedia(media, isImage) {
  if (media?.fileName) return media.fileName;
  const extension = isImage ? 'png' : 'mp4';
  return `ai-jinchan-${isImage ? 'image' : 'video'}.${extension}`;
}

export default function MediaPreviewModal({ media, onClose, onCopy }) {
  const closeButtonRef = useRef(null);
  const videoRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [scale, setScale] = useState(1);

  const type = media?.type || media?.kind || 'image';
  const isImage = type === 'image';

  useEffect(() => {
    if (!media) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (!isImage) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setScale(current => clampScale(current + SCALE_STEP));
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setScale(current => clampScale(current - SCALE_STEP));
      }
      if (event.key === '0') {
        event.preventDefault();
        setScale(1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isImage, media?.url, onClose]);

  useEffect(() => {
    setScale(1);
  }, [media?.url]);

  if (!media?.url) return null;

  const title = media.title || (isImage ? '图片预览' : '视频预览');
  const fileName = fileNameForMedia(media, isImage);
  const updateScale = delta => setScale(current => clampScale(current + delta));

  const handleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      // Some browsers only allow native video fullscreen from a direct click.
    }
  };

  const handleWheel = event => {
    if (!isImage) return;
    event.preventDefault();
    updateScale(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
  };

  const preview = (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <section className={styles.previewModal} role="dialog" aria-modal="true" aria-labelledby="media-preview-title">
        <header className={styles.modalHeader}>
          <div className={styles.modalHeading}>
            <span className={styles.modalEyebrow}>{isImage ? 'IMAGE PREVIEW' : 'VIDEO PREVIEW'}</span>
            <h2 id="media-preview-title">{title}</h2>
            {media.model ? <span className={styles.modalMeta}>{media.model}</span> : null}
          </div>
          <div className={styles.headerActions}>
            {isImage ? (
              <>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => updateScale(-SCALE_STEP)}
                  disabled={scale <= MIN_SCALE}
                  title="缩小图片"
                  aria-label="缩小图片"
                >
                  <Minus size={16} />
                </button>
                <span className={styles.zoomValue}>{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => updateScale(SCALE_STEP)}
                  disabled={scale >= MAX_SCALE}
                  title="放大图片"
                  aria-label="放大图片"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setScale(1)}
                  disabled={scale === 1}
                  title="适应窗口"
                  aria-label="适应窗口"
                >
                  <RotateCcw size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleFullscreen}
                title="全屏播放"
                aria-label="全屏播放"
              >
                <Maximize2 size={16} />
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              className={`${styles.iconButton} ${styles.closeButton}`}
              onClick={onClose}
              title="关闭预览"
              aria-label="关闭预览"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={styles.mediaStage} onWheel={handleWheel}>
          {isImage ? (
            <img
              className={styles.previewImage}
              src={media.url}
              alt={media.alt || title}
              draggable="false"
              style={{ transform: `scale(${scale})` }}
            />
          ) : (
            <video
              ref={videoRef}
              className={styles.previewVideo}
              src={media.url}
              controls
              playsInline
              preload="metadata"
            />
          )}
        </div>

        <footer className={styles.modalFooter}>
          <div className={styles.mediaDetails}>
            {media.prompt ? <p title={media.prompt}>{media.prompt}</p> : null}
            {media.createdAt ? <span>{media.createdAt}</span> : null}
          </div>
          <div className={styles.footerActions}>
            <a className={shared.inlineAction} href={media.url} download={fileName}>
              <Download size={14} />
              下载
            </a>
            <a className={shared.inlineAction} href={media.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              打开原地址
            </a>
            <button className={shared.inlineAction} type="button" onClick={() => onCopy?.(media.url)}>
              <Clipboard size={14} />
              复制地址
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return createPortal(preview, document.body);
}
