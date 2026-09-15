import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  CircleAlert,
  CirclePlay,
  Copy,
  Database,
  Download,
  ExternalLink,
  Server,
  ShieldCheck,
} from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import HistoryList from '../features/history/HistoryList.jsx';
import GeneratorForm from '../features/generator/GeneratorForm.jsx';
import ImageGeneratorForm from '../features/generator/ImageGeneratorForm.jsx';
import CreditsPage from './CreditsPage.jsx';
import PricingInfoPage from './PricingInfoPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import TaskSummary from '../components/TaskSummary.jsx';
import { createImage, createVideoTask, deleteHistory, getHealth, getHistory, queryVideoTask } from '../lib/api.js';
import { formatDate, getTaskStatus, getVideoUrl, TERMINAL_STATUSES } from '../lib/format.js';
import shared from '../styles/shared.module.css';
import styles from './StudioPage.module.css';

const DEFAULT_MODEL = 'doubao-seedance-2-5-260628';
const POLL_INTERVAL = 5000;
const MAX_POLL_TIME = 30 * 60 * 1000;

function initialForm() {
  return {
    model: DEFAULT_MODEL,
    prompt: '',
    duration: 5,
    resolution: '720P',
    promptExtend: true,
    omniReferenceTaskType: 'auto',
    firstFrameUrl: '',
    lastFrameUrl: '',
    referenceImageUrl: '',
    referenceVideoUrl: '',
    referenceAudioUrl: '',
    returnLastFrame: false,
    generateAudio: true,
    ratio: '16:9',
    watermark: false,
    outputFormat: 'mp4',
    cameraFixed: false,
    draft: false,
    seed: '',
    frames: '',
  };
}

function initialImageForm() {
  return {
    model: 'gpt-image-2.5',
    prompt: '',
    style: 'product',
    ratio: '1:1',
  };
}

function mergeTaskResponse(previous, response) {
  const raw = response?.data;
  return {
    ...(previous || {}),
    ...(raw || {}),
    id: raw?.id || previous?.id || response?.task?.id || '',
    status: getTaskStatus(raw) || previous?.status || '',
    progress: raw?.progress || previous?.progress || '',
    videoUrl: getVideoUrl(raw) || previous?.videoUrl || response?.task?.videoUrl || '',
    finishedAt: response?.task?.finishedAt || previous?.finishedAt || '',
    createdAt: response?.task?.createdAt || previous?.createdAt || '',
  };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function imageStateLabel({ generating, result, error, requested }) {
  if (generating) return '生成中';
  if (error) return '生成失败';
  if (result?.imageUrl) return '已生成';
  return requested ? '已提交' : '等待生成';
}

function ImageResultPanel({ generating, requested, result, error, form, onCopy }) {
  const imageUrl = result?.imageUrl || '';
  const hasImage = Boolean(imageUrl);
  const stateLabel = imageStateLabel({ generating, result, error, requested });
  const previewClassName = [
    styles.imageResultPreview,
    requested ? styles.isRequested : '',
    hasImage ? styles.hasImage : '',
    error ? styles.hasError : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={styles.imageResultPanel}>
      <div className={styles.imageResultHeading}>
        <div>
          <div className={shared.panelKicker}>IMAGE OUTPUT</div>
          <h2>图片结果</h2>
        </div>
        <span className={`${styles.resultState} ${generating ? styles.isLoading : ''} ${hasImage ? styles.isSuccess : ''} ${error ? styles.isDanger : ''}`}>
          <span className={styles.resultStateDot} />
          {stateLabel}
        </span>
      </div>
      <div className={previewClassName}>
        <div className={styles.previewGrid} />
        {hasImage ? (
          <img src={imageUrl} alt="AI金铲生成图片" />
        ) : (
          <div className={styles.imageResultPlaceholder}>
            {generating ? (
              <>
                <span className={styles.previewSpinner} />
                <strong>正在调用 {form.model || 'gpt-image-2.5'}</strong>
                <small>生成完成后会在这里显示图片结果</small>
              </>
            ) : error ? (
              <>
                <CircleAlert size={28} />
                <strong>图片生成失败</strong>
                <small>{error}</small>
              </>
            ) : (
              <>
                <CirclePlay size={28} />
                <strong>提交描述后查看结果</strong>
                <small>画幅和风格会同步到本次生成任务</small>
              </>
            )}
          </div>
        )}
      </div>
      {hasImage ? (
        <div className={`${shared.resultActions} ${styles.imageResultActions}`}>
          <a className={shared.inlineAction} href={imageUrl} download="ai-jinchan-image.png">
            <Download size={14} />
            下载图片
          </a>
          <a className={shared.inlineAction} href={imageUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            打开原图
          </a>
          <button className={shared.inlineAction} type="button" onClick={() => onCopy(imageUrl)}>
            <Copy size={14} />
            复制地址
          </button>
        </div>
      ) : null}
      <div className={styles.imageResultMeta}>
        <div><span>输出画幅</span><strong>{result?.ratio || form.ratio}</strong></div>
        <div><span>图片模型</span><strong>{result?.model || form.model || 'gpt-image-2.5'}</strong></div>
        <div><span>当前状态</span><strong>{stateLabel}</strong></div>
      </div>
      <div className={styles.imageConnectionNote}>
        <ShieldCheck size={15} />
        <span>{hasImage ? `生成尺寸 ${result?.size || '跟随画幅设置'}，可下载或复制图片地址。` : '图片创作已接入 gpt-image-2.5 生成链路。'}</span>
      </div>
    </aside>
  );
}

export default function StudioPage({
  activeSection,
  onNavigate,
  credits,
  user,
  onOpenAuth,
  onLogout,
  onRecharge,
  apiKey,
  onApiKeyChange,
  onSaveUser,
  onCreditsChange,
}) {
  const [form, setForm] = useState(initialForm);
  const [imageForm, setImageForm] = useState(initialImageForm);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageRequested, setImageRequested] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [imageError, setImageError] = useState('');
  const [task, setTask] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [health, setHealth] = useState(null);
  const pollingRef = useRef(false);

  const currentVideoUrl = task?.videoUrl || '';
  const currentStatus = task?.status || (generating ? 'processing' : '');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getHistory();
      setHistory(response.data || []);
    } catch (error) {
      setStatusMessage(error.message || '读取历史记录失败。');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    getHealth().then(setHealth).catch(() => setHealth({ ok: false }));
  }, [loadHistory]);

  useEffect(() => () => {
    pollingRef.current = false;
  }, []);

  const setFormValue = values => {
    setForm(current => ({ ...current, ...values }));
  };

  const setImageFormValue = values => {
    setImageForm(current => ({ ...current, ...values }));
  };

  const syncCredits = response => {
    const balance = response?.balance ?? response?.credits?.balance ?? response?.data?.balance;
    if (Number.isFinite(Number(balance))) onCreditsChange?.(Number(balance));
  };

  const copyText = async text => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage('内容已复制。');
    } catch {
      setStatusMessage('浏览器未允许复制，请手动复制内容。');
    }
  };

  const pollTask = useCallback(async (taskId, initialTask) => {
    const startedAt = Date.now();
    pollingRef.current = true;
    let latest = initialTask;

    while (pollingRef.current && Date.now() - startedAt < MAX_POLL_TIME) {
      try {
        const response = await queryVideoTask(taskId, apiKey);
        syncCredits(response);
        latest = mergeTaskResponse(latest, response);
        setTask(latest);

        const status = getTaskStatus(response.data);
        if (TERMINAL_STATUSES.has(status)) {
          pollingRef.current = false;
          if (['completed', 'succeeded'].includes(status)) {
            setStatusMessage(response.task?.videoUrl || getVideoUrl(response.data)
              ? '视频生成完成，地址已保存到历史记录。'
              : '任务完成，但上游暂未返回视频地址。');
            await loadHistory();
          } else {
            setStatusMessage(`任务结束：${status}`);
          }
          return latest;
        }

        setStatusMessage(`任务正在生成${response.data?.progress ? ` · ${response.data.progress}` : '…'}`);
      } catch (error) {
        pollingRef.current = false;
        setStatusMessage(error.message || '查询任务失败。');
        return latest;
      }

      await wait(POLL_INTERVAL);
    }

    pollingRef.current = false;
    setStatusMessage('轮询已超时，可以稍后用任务编号继续查询。');
    return latest;
  }, [apiKey, loadHistory, onCreditsChange]);

  const generate = async () => {
    const hasCreativeInput = [
      form.prompt,
      form.firstFrameUrl,
      form.lastFrameUrl,
      form.referenceImageUrl,
      form.referenceVideoUrl,
      form.referenceAudioUrl,
    ].some(value => String(value || '').trim());

    if (!hasCreativeInput) {
      setStatusMessage('请填写提示词或添加创作素材。');
      return;
    }

    pollingRef.current = false;
    setGenerating(true);
    setTask(null);
    setStatusMessage('正在提交生成任务…');

    try {
      const response = await createVideoTask(form, apiKey, crypto.randomUUID());
      syncCredits(response);
      const taskId = response.taskId || response.data?.id || response.data?.task_id || '';
      const initialTask = {
        id: taskId,
        status: getTaskStatus(response.data) || 'queued',
        progress: response.data?.progress || '0%',
        createdAt: new Date().toISOString(),
      };
      setTask(initialTask);

      if (!taskId) {
        setStatusMessage('任务已提交，但响应中没有任务编号。');
        setGenerating(false);
        return;
      }

      setStatusMessage(`任务已创建：${taskId}，正在轮询状态…`);
      await pollTask(taskId, initialTask);
    } catch (error) {
      syncCredits(error.data);
      setStatusMessage(error.message || '提交生成任务失败。');
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!imageForm.prompt.trim()) {
      setStatusMessage('请先填写图片提示词。');
      return;
    }

    setImageGenerating(true);
    setImageRequested(true);
    setImageResult(null);
    setImageError('');
    setStatusMessage(`正在调用 ${imageForm.model || 'gpt-image-2.5'} 生成图片…`);

    try {
      const response = await createImage(imageForm, apiKey, crypto.randomUUID());
      syncCredits(response);
      setImageResult(response.result);
      setStatusMessage('图片生成完成。');
      await loadHistory();
    } catch (error) {
      syncCredits(error.data);
      const message = error.message || '图片生成失败。';
      setImageError(message);
      setStatusMessage(message);
    } finally {
      setImageGenerating(false);
    }
  };

  const manualPoll = async taskId => {
    if (!taskId) return;
    setGenerating(true);
    setStatusMessage(`正在查询任务：${taskId}`);
    const previous = { id: taskId };
    await pollTask(taskId, previous);
    setGenerating(false);
  };

  const clearHistory = async () => {
    if (!window.confirm('确定要清空当前账户的全部历史创作吗？')) return;
    try {
      await deleteHistory();
      setHistory([]);
      setStatusMessage('历史视频地址已清空。');
    } catch (error) {
      setStatusMessage(error.message || '清空历史失败。');
    }
  };

  const visibleHistory = useMemo(() => history.slice(0, 3), [history]);

  const renderHistoryPage = () => (
    <div className={`${shared.pageStack} ${styles.historyPage}`}>
      <section className={shared.pageHeading}>
        <div>
          <div className={shared.sectionEyebrow}>CREATION ARCHIVE</div>
          <h1>历史记录</h1>
          <p>所有完成的视频与图片任务都会自动归档，方便回看、复制地址和继续使用。</p>
        </div>
        <div className={styles.headingStat}>
          <Database size={17} />
          <strong>{history.length}</strong>
          <span>条创作记录</span>
        </div>
      </section>
      <HistoryList
        items={history}
        loading={historyLoading}
        onRefresh={loadHistory}
        onClear={clearHistory}
        onCopy={copyText}
        onUseTask={manualPoll}
      />
    </div>
  );

  const renderWorkspace = () => (
    <div className={`${shared.pageStack} ${styles.workspacePage}`}>
      <div className={styles.studioLayout}>
        <div className={styles.studioMain}>
          <GeneratorForm
            form={form}
            onChange={setFormValue}
            disabled={generating}
            onGenerate={generate}
            generating={generating}
          />

          {statusMessage || task?.id ? (
            <section className={styles.statusSection}>
              {statusMessage ? <StatusBanner status={currentStatus} message={statusMessage} /> : null}
              {task?.id ? (
                <div className={styles.taskInline}>
                  <div>
                    <span>当前任务</span>
                    <strong>{task.id}</strong>
                  </div>
                  <button className={shared.inlineAction} type="button" onClick={() => copyText(task.id)} title="复制任务编号">
                    <Copy size={14} />
                    复制编号
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.historySection}>
            <div className={styles.sectionTrail}>
              <div>
                <div className={shared.sectionEyebrow}>RECENT CREATIONS</div>
                <h2>最近创作</h2>
              </div>
              <button type="button" className={styles.textAction} onClick={() => onNavigate('history')}>
                查看全部 <ChevronRight size={15} />
              </button>
            </div>
            <HistoryList
              items={visibleHistory}
              loading={historyLoading}
              onRefresh={loadHistory}
              onClear={clearHistory}
              onCopy={copyText}
              onUseTask={manualPoll}
              compact
            />
          </section>
        </div>

        <div className={styles.studioSide}>
          <TaskSummary
            task={task}
            currentVideoUrl={currentVideoUrl}
            onCopy={copyText}
            generating={generating}
            form={form}
          />
          <div className={styles.sideNote}>
            <div className={styles.sideNoteIcon}><ShieldCheck size={16} /></div>
            <div>
              <strong>服务连接状态</strong>
              <p>Node 服务与数据库 {health?.ok ? '连接正常' : '正在检查'}，密钥不会写进视频历史记录。</p>
            </div>
          </div>
          {visibleHistory.length ? (
            <div className={styles.recentRail}>
              <div className={styles.recentRailHeading}>
                <div>
                  <div className={shared.panelKicker}>QUICK ACCESS</div>
                  <h3>最近结果</h3>
                </div>
                <Database size={16} />
              </div>
              {visibleHistory.map(item => (
                <button
                  key={item.id || item.videoUrl || item.imageUrl}
                  type="button"
                  className={styles.recentItem}
                  onClick={() => {
                    const url = item.videoUrl || item.imageUrl;
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <span className={styles.recentItemStatus} />
                  <span className={styles.recentItemCopy}>
                    <strong>{item.prompt || '未记录提示词'}</strong>
                    <small>{formatDate(item.finishedAt || item.savedAt)}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderImageWorkspace = () => (
    <div className={`${shared.pageStack} ${styles.workspacePage}`}>
      <div className={styles.imageLayout}>
        <ImageGeneratorForm form={imageForm} onChange={setImageFormValue} onGenerate={generateImage} generating={imageGenerating} />
        <ImageResultPanel
          generating={imageGenerating}
          requested={imageRequested}
          result={imageResult}
          error={imageError}
          form={imageForm}
          onCopy={copyText}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.appShell}>
      <AppHeader
        credits={credits}
        user={user}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
      />

      <main className={styles.pageContent}>
        {activeSection === 'video' ? renderWorkspace() : null}
        {activeSection === 'image' ? renderImageWorkspace() : null}
        {activeSection === 'history' ? renderHistoryPage() : null}
        {activeSection === 'credits' ? <CreditsPage credits={credits} onRecharge={onRecharge} /> : null}
        {activeSection === 'profile' ? (
          <ProfilePage
            user={user}
            apiKey={apiKey}
            onApiKeyChange={onApiKeyChange}
            health={health}
            onSave={onSaveUser}
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
          />
        ) : null}
        {activeSection === 'pricing' ? <PricingInfoPage /> : null}
      </main>

      <footer className={styles.appFooter}>
        <div><Server size={14} /> AI金铲 · Node API · PostgreSQL</div>
        <span>为创作而生的 AI 工作区</span>
      </footer>
    </div>
  );
}
