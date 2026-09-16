import { Clipboard, FileVideo, LoaderCircle, ScanSearch, Sparkles } from 'lucide-react';
import { formatDate, formatDuration, statusLabel, statusTone } from '../lib/format.js';
import { getModelLabel } from '../lib/modelLabels.js';
import shared from '../styles/shared.module.css';
import styles from './TaskSummary.module.css';

export default function TaskSummary({
  task,
  currentVideoUrl,
  onCopy,
  onPreview,
  generating,
  form,
}) {
  const status = task?.status || (generating ? 'processing' : '');
  const tone = statusTone(status);
  const isHailuo = String(form.model || '').toLowerCase().startsWith('minimax-hailuo');
  const outputSpec = isHailuo
    ? `${form.resolution} · ${form.duration === -1 ? '自动时长' : formatDuration(form.duration)}`
    : `${form.resolution} · ${form.ratio || '16:9'} · ${form.duration === -1 ? '自动时长' : formatDuration(form.duration)}`;
  const audioLabel = isHailuo ? '无音频' : (form.generateAudio === false ? '关闭音频' : '生成音频');
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
          <button
            type="button"
            className={styles.taskVisualButton}
            onClick={() => onPreview?.({
              type: 'video',
              url: currentVideoUrl,
              title: '视频生成结果',
              prompt: form.prompt,
              model: getModelLabel(form.model),
            })}
            aria-label="预览生成视频"
          >
            <video src={currentVideoUrl} playsInline preload="metadata" />
            <span className={styles.taskVisualOverlay}><ScanSearch size={18} />点击预览</span>
          </button>
        ) : (
          <div className={styles.taskVisualPlaceholder}>
            {generating ? <LoaderCircle className={shared.spin} size={28} /> : <FileVideo size={29} />}
            <span>{generating ? '视频生成完成前会显示在这里' : '提交任务后查看视频结果'}</span>
          </div>
        )}
      </div>

      {currentVideoUrl ? (
        <div className={styles.resultActions}>
          <button
            className={shared.inlineAction}
            type="button"
            onClick={() => onPreview?.({
              type: 'video',
              url: currentVideoUrl,
              title: '视频生成结果',
              prompt: form.prompt,
              model: getModelLabel(form.model),
            })}
          >
            <ScanSearch size={14} />
            预览视频
          </button>
          <button className={shared.inlineAction} type="button" onClick={() => onCopy(currentVideoUrl)}>
            <Clipboard size={14} />
            复制地址
          </button>
        </div>
      ) : null}

      <div className={styles.summaryBlock}>
        <div className={styles.summaryLine}>
          <span>模型</span>
          <strong>{getModelLabel(form.model)}</strong>
        </div>
        <div className={styles.summaryLine}>
          <span>输出规格</span>
          <strong>{outputSpec}</strong>
        </div>
        <div className={styles.summaryLine}>
          <span>音频 / 水印</span>
          <strong>{audioLabel} · {form.watermark ? '含水印' : '无水印'}</strong>
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

    </aside>
  );
}
