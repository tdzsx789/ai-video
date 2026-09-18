import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  CircleAlert,
  CirclePlay,
  Copy,
  Database,
  Download,
  ExternalLink,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import HistoryList from '../features/history/HistoryList.jsx';
import GeneratorForm, { composeVideoPrompt } from '../features/generator/GeneratorForm.jsx';
import ImageGeneratorForm, { composeImagePrompt } from '../features/generator/ImageGeneratorForm.jsx';
import CreditsPage from './CreditsPage.jsx';
import PricingInfoPage from './PricingInfoPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import TaskSummary from '../components/TaskSummary.jsx';
import MediaPreviewModal from '../components/MediaPreviewModal.jsx';
import {
  createImage,
  createVideoTask,
  deleteHistory,
  getHistory,
  queryVideoTask,
  uploadFileToOss,
} from '../lib/api.js';
import { formatDate, getTaskStatus, getVideoUrl, TERMINAL_STATUSES } from '../lib/format.js';
import { getModelLabel } from '../lib/modelLabels.js';
import shared from '../styles/shared.module.css';
import styles from './StudioPage.module.css';

const DEFAULT_MODEL = 'doubao-seedance-2-5-260628';
const POLL_INTERVAL = 5000;
const MAX_POLL_TIME = 30 * 60 * 1000;
const RETRIABLE_POLL_STATUSES = new Set([404, 408, 409, 425, 429, 500, 502, 503, 504]);

function initialForm() {
  return {
    model: DEFAULT_MODEL,
    prompt: '',
    duration: 5,
    resolution: '720P',
    promptExtend: true,
    promptOptimizer: true,
    fastPretreatment: false,
    omniReferenceTaskType: 'auto',
    firstFrameUrl: '',
    lastFrameUrl: '',
    referenceImageUrl: '',
    referenceVideoUrl: '',
    referenceAudioUrl: '',
    returnLastFrame: false,
    generateAudio: true,
    ratio: '16:9',
    creativeBrief: 'none',
    visualStyle: 'none',
    motionStyle: 'none',
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
    imageBrief: 'none',
    imageStyle: 'none',
    imageComposition: 'none',
    imagePalette: 'none',
    size: 'auto',
    quality: 'auto',
    background: 'auto',
    outputFormat: 'png',
    outputCompression: 100,
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

function canRetryPoll(error) {
  const status = Number(error?.status || error?.data?.status || 0);
  return !status || RETRIABLE_POLL_STATUSES.has(status);
}

function needsVideoRecovery(item) {
  const status = getTaskStatus(item);
  return item?.kind === 'video'
    && item?.id
    && (
      !TERMINAL_STATUSES.has(status)
      || (['completed', 'succeeded'].includes(status) && !getVideoUrl(item))
    );
}

function imageStateLabel({ generating, result, error, requested }) {
  if (generating) return '生成中';
  if (error) return '生成失败';
  if (result?.imageUrl) return '已生成';
  return requested ? '已提交' : '等待生成';
}

function previewMediaForHistoryItem(item) {
  const isImage = item?.kind === 'image';
  const url = isImage ? item?.imageUrl : item?.videoUrl;
  if (!url) return null;
  return {
    type: isImage ? 'image' : 'video',
    url,
    title: isImage ? '图片创作结果' : '视频创作结果',
    alt: 'AI金铲生成结果',
    prompt: item.prompt,
    model: item.model ? getModelLabel(item.model) : '',
    createdAt: formatDate(item.finishedAt || item.createdAt || item.savedAt),
  };
}

function ImageResultPanel({ generating, requested, result, error, form, onCopy, onPreview, onRegenerate, onUseAsVideoAsset }) {
  const imageUrl = result?.imageUrl || '';
  const hasImage = Boolean(imageUrl);
  const imageSize = result?.size || form.size || 'auto';
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
          <button
            type="button"
            className={styles.imageResultPreviewButton}
            onClick={() => onPreview?.({
              type: 'image',
              url: imageUrl,
              title: '图片生成结果',
              alt: 'AI金铲生成图片',
              prompt: form.prompt,
              model: getModelLabel(result?.model || form.model || 'gpt-image-2.5'),
            })}
            aria-label="预览生成图片"
          >
            <img src={imageUrl} alt="AI金铲生成图片" />
            <span className={styles.imageResultPreviewHint}>点击放大预览</span>
          </button>
        ) : (
          <div className={styles.imageResultPlaceholder}>
            {generating ? (
              <>
                <span className={styles.previewSpinner} />
                <strong>正在调用 {getModelLabel(form.model || 'gpt-image-2.5')}</strong>
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
                <small>尺寸、质量和背景会同步到本次生成任务</small>
              </>
            )}
          </div>
        )}
      </div>
      {hasImage ? (
        <div className={`${shared.resultActions} ${styles.imageResultActions}`}>
          <button
            className={shared.inlineAction}
            type="button"
            onClick={() => onPreview?.({
              type: 'image',
              url: imageUrl,
              title: '图片生成结果',
              alt: 'AI金铲生成图片',
              prompt: form.prompt,
              model: getModelLabel(result?.model || form.model || 'gpt-image-2.5'),
            })}
          >
            <ScanSearch size={14} />
            放大预览
          </button>
          <button className={shared.inlineAction} type="button" onClick={onRegenerate} disabled={generating}>
            <Sparkles size={14} />
            再来一版
          </button>
          <button className={shared.inlineAction} type="button" onClick={() => onUseAsVideoAsset?.(imageUrl)}>
            <WandSparkles size={14} />
            用作视频素材
          </button>
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
        <div><span>输出尺寸</span><strong>{imageSize}</strong></div>
        <div><span>图片模型</span><strong>{getModelLabel(result?.model || form.model || 'gpt-image-2.5')}</strong></div>
        <div><span>当前状态</span><strong>{stateLabel}</strong></div>
      </div>
      <div className={styles.imageConnectionNote}>
        <ShieldCheck size={15} />
        <span>{hasImage ? `生成尺寸 ${imageSize}，可下载或复制图片地址。` : `${getModelLabel(form.model || 'gpt-image-2.5')} 已接入图片创作链路。`}</span>
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
  onSaveUser,
  onChangePassword,
  onVerifyPassword,
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
  const [previewMedia, setPreviewMedia] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadingAssets, setUploadingAssets] = useState({});
  const [assetUploads, setAssetUploads] = useState({});
  const [assetFilter, setAssetFilter] = useState('all');
  const [assetSearch, setAssetSearch] = useState('');
  const pollingRef = useRef(false);
  const recoveredTaskIdsRef = useRef(new Set());

  const currentVideoUrl = task?.videoUrl || '';
  const currentStatus = task?.status || (generating ? 'processing' : '');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getHistory();
      setHistory(response.data || []);
    } catch (error) {
      setStatusMessage(error.message || '读取资产库失败。');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
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

  const uploadAsset = async (field, assetType, file) => {
    if (!file) return;
    setUploadingAssets(current => ({ ...current, [field]: true }));
    setStatusMessage(`正在上传${assetType === 'image' ? '图片' : assetType === 'video' ? '视频' : '音频'}素材…`);

    try {
      const uploaded = await uploadFileToOss(file, assetType);
      setForm(current => ({ ...current, [field]: uploaded.url }));
      setAssetUploads(current => ({ ...current, [field]: uploaded }));
      setStatusMessage('素材上传完成，可以继续生成。');
    } catch (error) {
      setStatusMessage(error.message || '素材上传失败，请稍后重试。');
    } finally {
      setUploadingAssets(current => ({ ...current, [field]: false }));
    }
  };

  const removeAsset = field => {
    setForm(current => ({ ...current, [field]: '' }));
    setAssetUploads(current => {
      const next = { ...current };
      delete next[field];
      return next;
    });
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

  const openPreview = media => {
    if (media?.url) setPreviewMedia(media);
  };

  const reuseAsset = item => {
    const mediaUrl = item?.kind === 'image' ? item.imageUrl : item.videoUrl;
    if (!mediaUrl) return;

    setForm(current => ({
      ...current,
      model: 'doubao-seedance-2-5-260628',
      prompt: item.prompt || current.prompt,
      omniReferenceTaskType: 'reference',
      ...(item.kind === 'image'
        ? {
          referenceImageUrl: mediaUrl,
          referenceVideoUrl: '',
        }
        : {
          referenceVideoUrl: mediaUrl,
          referenceImageUrl: '',
        }),
    }));
    setAssetUploads(current => ({
      ...current,
      ...(item.kind === 'image'
        ? { referenceImageUrl: { name: '资产库图片', size: 0, type: 'image/*', url: mediaUrl } }
        : { referenceVideoUrl: { name: '资产库视频', size: 0, type: 'video/*', url: mediaUrl } }),
    }));
    onNavigate('video');
    setStatusMessage(`已将${item.kind === 'image' ? '图片' : '视频'}素材带入视频创作。`);
  };

  const pollTask = useCallback(async (taskId, initialTask) => {
    const startedAt = Date.now();
    pollingRef.current = true;
    let latest = initialTask;
    let consecutiveErrors = 0;

    while (pollingRef.current && Date.now() - startedAt < MAX_POLL_TIME) {
      try {
        const response = await queryVideoTask(taskId);
        consecutiveErrors = 0;
        syncCredits(response);
        latest = mergeTaskResponse(latest, response);
        setTask(latest);

        const status = getTaskStatus(response.data);
        if (TERMINAL_STATUSES.has(status)) {
          const hasVideoUrl = Boolean(
            response.task?.videoUrl
            || response.data?.videoUrl
            || getVideoUrl(response.data),
          );
          if (['completed', 'succeeded'].includes(status) && !hasVideoUrl) {
            setStatusMessage('任务状态已完成，正在获取视频地址…');
            await wait(POLL_INTERVAL);
            continue;
          }
          pollingRef.current = false;
          if (['completed', 'succeeded'].includes(status)) {
            setStatusMessage(hasVideoUrl
              ? '视频生成完成，素材已保存到资产库。'
              : '任务完成，但上游暂未返回视频素材地址。');
            await loadHistory();
          } else {
            setStatusMessage(`任务结束：${status}`);
          }
          return latest;
        }

        setStatusMessage(`任务正在生成${response.data?.progress ? ` · ${response.data.progress}` : '…'}`);
      } catch (error) {
        consecutiveErrors += 1;
        if (!canRetryPoll(error)) {
          pollingRef.current = false;
          setStatusMessage(error.message || '查询任务失败，请稍后点击“继续查询”。');
          return latest;
        }

        const retryDelay = Math.min(POLL_INTERVAL * consecutiveErrors, 15_000);
        setStatusMessage(`任务状态查询暂时失败，${Math.ceil(retryDelay / 1000)} 秒后重试…`);
        await wait(retryDelay);
        continue;
      }

      await wait(POLL_INTERVAL);
    }

    pollingRef.current = false;
    setStatusMessage('轮询已超时，可以稍后用任务编号继续查询。');
    return latest;
  }, [loadHistory, onCreditsChange]);

  useEffect(() => {
    if (generating || pollingRef.current) return;
    const pending = history.find(item => (
      needsVideoRecovery(item)
      && !recoveredTaskIdsRef.current.has(item.id)
    ));
    if (!pending) return;

    recoveredTaskIdsRef.current.add(pending.id);
    const recoveredTask = {
      id: pending.id,
      status: getTaskStatus(pending) || 'processing',
      videoUrl: pending.videoUrl || '',
      createdAt: pending.createdAt || pending.savedAt || new Date().toISOString(),
      finishedAt: pending.finishedAt || '',
    };
    setTask(recoveredTask);
    setGenerating(true);
    setStatusMessage(`正在恢复任务：${pending.id}`);
    pollTask(pending.id, recoveredTask).finally(() => {
      setGenerating(false);
    });
  }, [generating, history, pollTask]);

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
      const response = await createVideoTask({
        ...form,
        prompt: composeVideoPrompt(form),
      }, crypto.randomUUID());
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
    setStatusMessage(`正在调用 ${getModelLabel(imageForm.model || 'gpt-image-2.5')} 生成图片…`);

    try {
      const response = await createImage({
        ...imageForm,
        prompt: composeImagePrompt(imageForm),
      }, crypto.randomUUID());
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

  const useImageResultAsVideoAsset = imageUrl => {
    if (!imageUrl) return;
    setForm(current => ({
      ...current,
      model: 'doubao-seedance-2-5-260628',
      prompt: imageForm.prompt || current.prompt,
      omniReferenceTaskType: 'reference',
      referenceImageUrl: imageUrl,
      referenceVideoUrl: '',
    }));
    setAssetUploads(current => ({
      ...current,
      referenceImageUrl: { name: '图片生成结果', size: 0, type: 'image/*', url: imageUrl },
    }));
    onNavigate('video');
    setStatusMessage('已将图片结果带入视频创作。');
  };

  const clearHistory = async () => {
    if (!window.confirm('确定要清空当前账户的全部创作资产吗？')) return;
    try {
      await deleteHistory();
      setHistory([]);
      setStatusMessage('资产库已清空。');
    } catch (error) {
      setStatusMessage(error.message || '清空资产库失败。');
    }
  };

  const visibleHistory = useMemo(() => history.slice(0, 3), [history]);
  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    return history.filter(item => {
      const kind = item.kind === 'image' ? 'image' : 'video';
      if (assetFilter !== 'all' && kind !== assetFilter) return false;
      if (!keyword) return true;
      return [
        item.prompt,
        item.model,
        item.id,
        item.videoUrl,
        item.imageUrl,
        item.status,
      ].some(value => String(value || '').toLowerCase().includes(keyword));
    });
  }, [assetFilter, assetSearch, history]);
  const assetCounts = useMemo(() => ({
    total: history.length,
    video: history.filter(item => item.kind !== 'image').length,
    image: history.filter(item => item.kind === 'image').length,
  }), [history]);

  const renderHistoryPage = () => (
    <div className={`${shared.pageStack} ${styles.historyPage}`}>
      <section className={shared.pageHeading}>
        <div>
          <div className={shared.sectionEyebrow}>CREATIVE ASSETS</div>
          <h1>资产库</h1>
          <p>所有生成的视频和图片都会自动归档，作为后续项目的素材、参考和版本记录。</p>
        </div>
        <div className={styles.headingStat}>
          <Database size={17} />
          <strong>{assetCounts.total}</strong>
          <span>个素材资产</span>
        </div>
      </section>
      <HistoryList
        items={filteredAssets}
        loading={historyLoading}
        onRefresh={loadHistory}
        onClear={clearHistory}
        onCopy={copyText}
        onUseTask={manualPoll}
        onReuse={reuseAsset}
        onPreview={openPreview}
        filter={assetFilter}
        onFilterChange={setAssetFilter}
        search={assetSearch}
        onSearchChange={setAssetSearch}
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
            onUploadAsset={uploadAsset}
            onRemoveAsset={removeAsset}
            uploadingAssets={uploadingAssets}
            assetUploads={assetUploads}
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
              onReuse={reuseAsset}
              onPreview={openPreview}
              compact
            />
          </section>
        </div>

        <div className={styles.studioSide}>
          <TaskSummary
            task={task}
            currentVideoUrl={currentVideoUrl}
            onCopy={copyText}
            onPreview={openPreview}
            generating={generating}
            form={form}
          />
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
                  onClick={() => openPreview(previewMediaForHistoryItem(item))}
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
          onPreview={openPreview}
          onRegenerate={generateImage}
          onUseAsVideoAsset={useImageResultAsVideoAsset}
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
            onSave={onSaveUser}
            onChangePassword={onChangePassword}
            onVerifyPassword={onVerifyPassword}
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
          />
        ) : null}
        {activeSection === 'pricing' ? <PricingInfoPage /> : null}
      </main>

      <footer className={styles.appFooter}>
        <div>AI金铲</div>
        <span>为创作而生的 AI 工作区</span>
      </footer>

      <MediaPreviewModal
        media={previewMedia}
        onClose={() => setPreviewMedia(null)}
        onCopy={copyText}
      />
    </div>
  );
}
