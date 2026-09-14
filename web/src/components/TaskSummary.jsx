import { Check, Clipboard, ExternalLink, FileVideo, LoaderCircle, Sparkles } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../lib/format.js';
import shared from '../styles/shared.module.css';
import styles from './TaskSummary.module.css';

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
  const statusClass = tone === 'loading'
    ? styles.statusPillLoading
    : tone === 'success'
      ? styles.statusPillSuccess
      : tone === 'danger'
        ? styles.statusPillDanger
        : styles.statusPillNeutral;
  const visualClass = tone === 'loading' ? styles.taskVisualLoading : '';

  return (
    <aside className={styles.summaryCard}>
      <div className={styles.summaryCardHeader}>
        <div>
          <div className={shared.panelKicker}>LIVE TASK</div>
          <h2>生成摘要</h2>
        </div>
        <span className={`${styles.summaryStatus} ${statusClass}`}>
          {tone === 'loading' ? <LoaderCircle className={shared.spin} size={13} /> : <span className={styles.statusPillDot} />}
          {statusLabel(status)}
        </span>
      </div>

      <div className={`${styles.taskVisual} ${visualClass}`}>
        {currentVideoUrl ? (
          <video src={currentVideoUrl} controls playsInline preload="metadata" />
        ) : (
          <div className={styles.taskVisualPlaceholder}>
            {generating ? <LoaderCircle className={shared.spin} size={28} /> : <FileVideo size={29} />}
            <span>{generating ? '视频生成完成前会显示在这里' : '提交任务后查看视频结果'}</span>
          </div>
        )}
      </div>

      {currentVideoUrl ? (
        <div className={styles.resultActions}>
          <a className={shared.inlineAction} href={currentVideoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            打开视频
          </a>
          <button className={shared.inlineAction} type="button" onClick={() => onCopy(currentVideoUrl)}>
            <Clipboard size={14} />
            复制地址
          </button>
        </div>
      ) : null}

      <div className={styles.summaryBlock}>
        <div className={styles.summaryLine}>
          <span>模型</span>
          <strong>{form.model || '未选择'}</strong>
        </div>
        <div className={styles.summaryLine}>
          <span>输出规格</span>
          <strong>{form.resolution} · {formatDuration(form.duration)}</strong>
        </div>
        <div className={styles.summaryLine}>
          <span>任务编号</span>
          <strong className={styles.monoText}>{task?.id || '提交后生成'}</strong>
        </div>
        <div className={styles.summaryLine}>
          <span>更新时间</span>
          <strong>{formatDate(task?.finishedAt || task?.updatedAt || task?.createdAt)}</strong>
        </div>
      </div>

      <div className={styles.summaryPrompt}>
        <div className={styles.summaryPromptLabel}><Sparkles size={14} /> 当前提示词</div>
        <p>{form.prompt || '还没有输入提示词。'}</p>
      </div>

      <button className={`${shared.submitButton} ${styles.summarySubmitButton}`} type="button" onClick={onGenerate} disabled={generating || !form.prompt.trim()}>
        {generating ? <LoaderCircle className={shared.spin} size={18} /> : <Sparkles size={18} />}
        {generating ? '正在生成…' : '生成视频'}
        {!generating ? <Check size={16} className={shared.submitArrow} /> : null}
      </button>
    </aside>
  );
}
