import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Copy,
  Database,
  Image,
  Server,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import HistoryList from '../features/history/HistoryList.jsx';
import GeneratorForm from '../features/generator/GeneratorForm.jsx';
import ImageGeneratorForm from '../features/generator/ImageGeneratorForm.jsx';
import CreditsPage from './CreditsPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import TaskSummary from '../components/TaskSummary.jsx';
import { createVideoTask, deleteHistory, getHealth, getHistory, queryVideoTask } from '../lib/api.js';
import { formatDate, getTaskStatus, getVideoUrl, TERMINAL_STATUSES } from '../lib/format.js';

const DEFAULT_MODEL = 'doubao-seedance-2-0-fast-260128';
const DEFAULT_PROMPT = '一个红色立方体在白色桌面上缓慢旋转，柔和棚拍光照，镜头平稳，电影质感。';
const POLL_INTERVAL = 5000;
const MAX_POLL_TIME = 30 * 60 * 1000;

function initialForm() {
  return {
    model: DEFAULT_MODEL,
    prompt: DEFAULT_PROMPT,
    duration: 5,
    resolution: '720P',
    promptExtend: true,
  };
}

function initialImageForm() {
  return {
    prompt: '一把金色的铲子置于黑曜石台面上，柔和的轮廓光，极简商业摄影，细腻高光。',
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

function WorkspaceTabs({ mode, onChange }) {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="工作台类型">
      <button type="button" className={mode === 'video' ? 'is-active' : ''} onClick={() => onChange('video')}>
        <Video size={17} />
        <span>视频创作</span>
        <small>VIDEO</small>
      </button>
      <button type="button" className={mode === 'image' ? 'is-active' : ''} onClick={() => onChange('image')}>
        <Image size={17} />
        <span>图片创作</span>
        <small>IMAGE</small>
      </button>
    </div>
  );
}

function ImageResultPanel({ generating, requested }) {
  return (
    <aside className="image-result-panel">
      <div className="image-result-heading">
        <div>
          <div className="panel-kicker">IMAGE OUTPUT</div>
          <h2>图片结果</h2>
        </div>
        <span className="result-state"><span className="result-state-dot" /> {requested ? '已创建草稿' : '等待生成'}</span>
      </div>
      <div className={`image-result-preview ${requested ? 'is-requested' : ''}`}>
        <div className="preview-grid" />
        <div className="image-result-placeholder">
          {generating ? (
            <>
              <span className="preview-spinner" />
              <strong>正在准备图片草稿</strong>
              <small>图片接口接入后会在这里返回成品</small>
            </>
          ) : requested ? (
            <>
              <CheckCircle2 size={28} />
              <strong>图片任务已创建</strong>
              <small>等待图片生成服务接入后即可查看高清结果</small>
            </>
          ) : (
            <>
              <CirclePlay size={28} />
              <strong>提交描述后查看结果</strong>
              <small>右侧参数会同步到本次图片草稿</small>
            </>
          )}
        </div>
      </div>
      <div className="image-result-meta">
        <div><span>输出画幅</span><strong>跟随工作台设置</strong></div>
        <div><span>当前状态</span><strong>{requested ? '草稿已保存' : '尚未创建'}</strong></div>
        <div><span>消耗积分</span><strong>12 积分 / 张</strong></div>
      </div>
      <div className="image-connection-note">
        <ShieldCheck size={15} />
        <span>图片工作台已预留生成链路，接入图片模型后无需调整产品结构。</span>
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
}) {
  const [form, setForm] = useState(initialForm);
  const [imageForm, setImageForm] = useState(initialImageForm);
  const [selectedPreset, setSelectedPreset] = useState('studio');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageRequested, setImageRequested] = useState(false);
  const [task, setTask] = useState(null);
  const [statusMessage, setStatusMessage] = useState('准备就绪，可以开始生成。');
  const [activeMode, setActiveMode] = useState('video');
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

  const choosePreset = preset => {
    setSelectedPreset(preset.id);
    setFormValue({
      duration: preset.duration,
      resolution: preset.resolution,
      promptExtend: preset.promptExtend,
    });
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
  }, [apiKey, loadHistory]);

  const generate = async () => {
    if (!form.prompt.trim()) {
      setStatusMessage('请先填写提示词。');
      return;
    }

    pollingRef.current = false;
    setGenerating(true);
    setTask(null);
    setStatusMessage('正在提交生成任务…');

    try {
      const response = await createVideoTask(form, apiKey);
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
      setStatusMessage(error.message || '提交生成任务失败。');
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!imageForm.prompt.trim()) return;
    setImageGenerating(true);
    setImageRequested(false);
    await wait(900);
    setImageRequested(true);
    setImageGenerating(false);
    setStatusMessage('图片草稿已创建，等待图片生成接口接入。');
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
    if (!window.confirm('确定要清空全部历史视频地址吗？')) return;
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
    <div className="page-stack history-page">
      <section className="page-heading">
        <div>
          <div className="section-eyebrow">CREATION ARCHIVE</div>
          <h1>历史记录</h1>
          <p>所有完成的视频任务都会自动归档，方便继续查询和复用。</p>
        </div>
        <div className="heading-stat">
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
    <div className="page-stack workspace-page">
      <section className="workspace-heading">
        <div>
          <div className="section-eyebrow">CREATIVE WORKSPACE</div>
          <h1>今天，做点好看的。</h1>
          <p>从一句描述开始，用 AI金铲快速完成视频与图片创作。</p>
        </div>
        <div className="workspace-heading-side">
          <div className="heading-credit">
            <CoinsIcon />
            <span>可用积分</span>
            <strong>{Number(credits || 0).toLocaleString('zh-CN')}</strong>
          </div>
          {!user ? (
            <button type="button" className="header-login-action" onClick={onOpenAuth}>
              登录 / 注册 <ArrowUpRight size={14} />
            </button>
          ) : null}
        </div>
      </section>

      <WorkspaceTabs mode={activeMode} onChange={mode => {
        setActiveMode(mode);
        setStatusMessage(mode === 'video' ? '视频工作台已准备好。' : '图片工作台已准备好。');
      }} />

      {activeMode === 'video' ? (
        <div className="studio-layout">
          <div className="studio-main">
            <GeneratorForm
              form={form}
              onChange={setFormValue}
              selectedPreset={selectedPreset}
              onPresetChange={choosePreset}
              disabled={generating}
              onModeChange={mode => {
                setActiveMode(mode);
                setStatusMessage('图片工作台已准备好。');
              }}
            />

            <section className="status-section">
              <StatusBanner status={currentStatus} message={statusMessage} />
              {task?.id ? (
                <div className="task-inline">
                  <div>
                    <span>当前任务</span>
                    <strong>{task.id}</strong>
                  </div>
                  <button type="button" onClick={() => copyText(task.id)} title="复制任务编号">
                    <Copy size={14} />
                    复制编号
                  </button>
                </div>
              ) : null}
            </section>

            <section className="history-section">
              <div className="section-trail">
                <div>
                  <div className="section-eyebrow">RECENT CREATIONS</div>
                  <h2>最近创作</h2>
                </div>
                <button type="button" className="text-action" onClick={() => onNavigate('history')}>
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

          <div className="studio-side">
            <TaskSummary
              task={task}
              currentVideoUrl={currentVideoUrl}
              onCopy={copyText}
              onGenerate={generate}
              generating={generating}
              form={form}
            />
            <div className="side-note">
              <div className="side-note-icon"><ShieldCheck size={16} /></div>
              <div>
                <strong>服务连接状态</strong>
                <p>Node 服务与数据库 {health?.ok ? '连接正常' : '正在检查'}，密钥不会写进视频历史记录。</p>
              </div>
            </div>
            {visibleHistory.length ? (
              <div className="recent-rail">
                <div className="recent-rail-heading">
                  <div>
                    <div className="panel-kicker">QUICK ACCESS</div>
                    <h3>最近结果</h3>
                  </div>
                  <Database size={16} />
                </div>
                {visibleHistory.map(item => (
                  <button key={item.id || item.videoUrl} type="button" className="recent-item" onClick={() => item.videoUrl && window.open(item.videoUrl, '_blank', 'noopener,noreferrer')}>
                    <span className="recent-item-status" />
                    <span className="recent-item-copy">
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
      ) : (
        <div className="image-layout">
          <ImageGeneratorForm form={imageForm} onChange={setImageFormValue} onGenerate={generateImage} generating={imageGenerating} />
          <ImageResultPanel generating={imageGenerating} requested={imageRequested} />
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <AppHeader
        credits={credits}
        user={user}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />

      <main className="page-content">
        {activeSection === 'studio' ? renderWorkspace() : null}
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
      </main>

      <footer className="app-footer">
        <div><Server size={14} /> AI金铲 · Node API · PostgreSQL</div>
        <span>为创作而生的 AI 工作区</span>
      </footer>
    </div>
  );
}

function CoinsIcon() {
  return <span className="heading-credit-icon"><Sparkles size={14} /></span>;
}
