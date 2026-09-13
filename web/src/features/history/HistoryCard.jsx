import { Clipboard, ExternalLink, Film, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../../lib/format.js';

export default function HistoryCard({ item, onCopy, onUseTask }) {
  const tone = statusTone(item.status);
  return (
    <article className="history-card">
      <div className="history-thumbnail">
        {item.videoUrl ? (
          <video src={item.videoUrl} preload="metadata" muted playsInline />
        ) : (
          <div className="history-thumbnail-empty">
            {tone === 'loading' ? <LoaderCircle className="spin" size={22} /> : <Film size={22} />}
          </div>
        )}
        {item.videoUrl ? (
          <a className="thumbnail-play" href={item.videoUrl} target="_blank" rel="noreferrer" aria-label="打开视频">
            <Play size={15} fill="currentColor" />
          </a>
        ) : null}
      </div>
      <div className="history-card-body">
        <div className="history-card-heading">
          <span className={`status-dot dot-${tone}`} />
          <span className="history-status">{statusLabel(item.status)}</span>
          <span className="history-date">{formatDate(item.finishedAt || item.createdAt || item.savedAt)}</span>
        </div>
        <p className="history-prompt">{item.prompt || '未记录提示词'}</p>
        <div className="history-card-meta">
          <span>{item.resolution || '自动分辨率'}</span>
          <span>{formatDuration(item.duration)}</span>
          <span title={item.id}>{item.id?.slice(0, 16) || '无任务编号'}</span>
        </div>
        <div className="history-card-actions">
          {item.videoUrl ? (
            <>
              <a href={item.videoUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开
              </a>
              <button type="button" onClick={() => onCopy(item.videoUrl)}>
                <Clipboard size={14} />
                复制地址
              </button>
            </>
          ) : null}
          {item.id ? (
            <button type="button" onClick={() => onUseTask(item.id)}>
              <RotateCcw size={14} />
              继续查询
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
