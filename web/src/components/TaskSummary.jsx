import { Check, Clipboard, ExternalLink, FileVideo, LoaderCircle, Sparkles } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../lib/format.js';

export default function TaskSummary({
  task,
  currentVideoUrl,
  onCopy,
  onGenerate,
  generating,
  form,
}) {
  const status = task?.status || (generating ? 'processing' : '');
  const tone = statusTone(status);

  return (
    <aside className="summary-card">
      <div className="summary-card-header">
        <div>
          <div className="panel-kicker">LIVE TASK</div>
          <h2>生成摘要</h2>
        </div>
        <span className={`summary-status status-pill-${tone}`}>
          {tone === 'loading' ? <LoaderCircle className="spin" size={13} /> : <span className="status-pill-dot" />}
          {statusLabel(status)}
        </span>
      </div>

      <div className={`task-visual task-visual-${tone}`}>
        {currentVideoUrl ? (
          <video src={currentVideoUrl} controls playsInline preload="metadata" />
        ) : (
          <div className="task-visual-placeholder">
            {generating ? <LoaderCircle className="spin" size={28} /> : <FileVideo size={29} />}
            <span>{generating ? '视频生成完成前会显示在这里' : '提交任务后查看视频结果'}</span>
          </div>
        )}
      </div>

      {currentVideoUrl ? (
        <div className="result-actions">
          <a href={currentVideoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            打开视频
          </a>
          <button type="button" onClick={() => onCopy(currentVideoUrl)}>
            <Clipboard size={14} />
            复制地址
          </button>
        </div>
      ) : null}

      <div className="summary-block">
        <div className="summary-line">
          <span>模型</span>
          <strong>{form.model || '未选择'}</strong>
        </div>
        <div className="summary-line">
          <span>输出规格</span>
          <strong>{form.resolution} · {formatDuration(form.duration)}</strong>
        </div>
        <div className="summary-line summary-line-stack">
          <span>任务编号</span>
          <strong className="mono-text">{task?.id || '提交后生成'}</strong>
        </div>
        <div className="summary-line">
          <span>更新时间</span>
          <strong>{formatDate(task?.finishedAt || task?.updatedAt || task?.createdAt)}</strong>
        </div>
      </div>

      <div className="summary-prompt">
        <div className="summary-prompt-label"><Sparkles size={14} /> 当前提示词</div>
        <p>{form.prompt || '还没有输入提示词。'}</p>
      </div>

      <button className="submit-button" type="button" onClick={onGenerate} disabled={generating || !form.prompt.trim()}>
        {generating ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
        {generating ? '正在生成…' : '生成视频'}
        {!generating ? <Check size={16} className="submit-arrow" /> : null}
      </button>
    </aside>
  );
}
