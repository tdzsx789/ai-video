import { useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Sparkles, WandSparkles } from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import { getModelLabel } from '../../lib/modelLabels.js';
import {
  getDurationOptions,
  getRatioOptions,
  getSeedanceCapabilities,
  normalizeModelForm,
} from './seedanceCapabilities.js';
import shared from '../../styles/shared.module.css';
import styles from './GeneratorForm.module.css';

const LEGACY_DURATION_OPTIONS = [4, 5, 6, 8, 10, 12, 15, 30];
const LEGACY_RATIO_OPTIONS = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'];
const VIDEO_GENERATION_COST = 30;
const MODE_OPTIONS = [
  { value: 'auto', label: 'AI 自动判断' },
  { value: 'reference', label: '基于素材创作' },
  { value: 'edit', label: '视频编辑' },
  { value: 'extend', label: '视频延展' },
];

export const AI_TOOLS = [
  {
    id: 'seedance',
    label: 'seedance',
    models: [
      { key: 'doubao-seedance-2-5-260628', label: 'seedance 2.5' },
      { key: 'doubao-seedance-2-0-fast-260128', label: 'seedance 2.0-fast' },
      { key: 'doubao-seedance-2-0-mini-260615', label: 'seedance 2.0-mini' },
    ],
  },
  {
    id: 'kling',
    label: '可灵2.6',
    models: [
      'kling-v2-6/std/10',
      'kling-v2-6-video',
      'kling-v2-6/pro/10',
      'kling-v2-6-video-pro',
    ],
  },
  {
    id: 'hailuo',
    label: '海螺2.3',
    models: [
      'MiniMax-Hailuo-2.3-Fast/768p/6s',
      'MiniMax-Hailuo-2.3-Fast/768p/10s',
      'MiniMax-Hailuo-2.3-Fast/1080p/6s',
    ],
  },
];

function modelKey(model) {
  return typeof model === 'string' ? model : model.key;
}

function modelLabel(model) {
  return typeof model === 'string' ? getModelLabel(model) : model.label;
}

function getToolForModel(model) {
  return AI_TOOLS.find(tool => tool.models.some(item => modelKey(item) === model)) || AI_TOOLS[0];
}

function getSelectedModel(tool, model) {
  return tool.models.find(item => modelKey(item) === model) || tool.models[0];
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span className={styles.toggleControl} aria-hidden="true" />
    </label>
  );
}

export default function GeneratorForm({
  form,
  onChange,
  disabled,
  onGenerate,
  generating,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const selectedTool = getToolForModel(form.model);
  const selectedModel = getSelectedModel(selectedTool, form.model);
  const isSeedance = selectedTool.id === 'seedance';
  const capabilities = getSeedanceCapabilities(form.model);
  const mode = form.omniReferenceTaskType || 'auto';
  const isEditing = isSeedance && mode === 'edit';
  const isExtending = isSeedance && mode === 'extend';
  const modeRequiresVideo = isEditing || isExtending;
  const modeAllowsFrames = !capabilities.supportsOmniReferenceTaskType || mode === 'auto';
  const modeAllowsReferences = !capabilities.supportsOmniReferenceTaskType
    || mode === 'auto'
    || mode === 'reference';
  const showReferenceVideo = isSeedance
    && capabilities.supportsReferenceVideo
    && (modeAllowsReferences || modeRequiresVideo);
  const showReferenceAudio = isSeedance
    && capabilities.supportsReferenceAudio
    && modeAllowsReferences;
  const showReferenceImages = isSeedance
    && capabilities.supportsReferenceImages
    && modeAllowsReferences;
  const showFirstLastFrames = isSeedance && modeAllowsFrames;
  const hasImageReference = Boolean(
    form.firstFrameUrl?.trim()
    || form.lastFrameUrl?.trim()
    || form.referenceImageUrl?.trim(),
  );
  const hasCreativeInput = Boolean(
    form.prompt?.trim()
    || form.firstFrameUrl?.trim()
    || form.lastFrameUrl?.trim()
    || form.referenceImageUrl?.trim()
    || form.referenceVideoUrl?.trim()
    || form.referenceAudioUrl?.trim(),
  );
  const hasReferenceInput = Boolean(
    form.firstFrameUrl?.trim()
    || form.lastFrameUrl?.trim()
    || form.referenceImageUrl?.trim()
    || form.referenceVideoUrl?.trim()
    || form.referenceAudioUrl?.trim(),
  );
  const referenceStatus = hasReferenceInput
    ? modeRequiresVideo && !form.referenceVideoUrl?.trim() ? '需视频' : '已添加'
    : modeRequiresVideo || mode === 'reference' ? '需要添加' : '可选';
  const durationOptions = isSeedance ? getDurationOptions(capabilities) : LEGACY_DURATION_OPTIONS;
  const ratioOptions = isSeedance ? getRatioOptions(capabilities) : LEGACY_RATIO_OPTIONS;
  const advancedOptionCount = isSeedance
    ? [
      capabilities.supportsOutputFormat,
      capabilities.supportsSeed,
      capabilities.supportsFrames,
      capabilities.supportsCameraFixed,
      capabilities.supportsDraft,
      capabilities.supportsReturnLastFrame,
    ].filter(Boolean).length
    : 0;

  const chooseTool = tool => {
    onChange(normalizeModelForm(form, modelKey(tool.models[0])));
  };

  const chooseModel = event => {
    onChange(normalizeModelForm(form, event.target.value));
  };

  const chooseMode = event => {
    const nextMode = event.target.value;
    const updates = { omniReferenceTaskType: nextMode };
    if (nextMode === 'edit' || nextMode === 'extend') updates.ratio = 'adaptive';
    if (nextMode === 'edit') updates.duration = -1;
    onChange(updates);
  };

  const chooseDraft = checked => {
    onChange({
      draft: checked,
      ...(checked ? { resolution: '480P', returnLastFrame: false } : {}),
    });
  };

  return (
    <div className={styles.studioForm}>
      <section className={styles.quickSetupPanel} id="studio" aria-label="视频基础设置">
        <div className={styles.quickSetupRow}>
          <div className={styles.compactStepHeading}>
            <StepBadge value="01" />
            <div>
              <div className={shared.sectionEyebrow}>AI TOOL</div>
              <h2>选择工具</h2>
            </div>
          </div>

          <div className={styles.toolSegment} role="group" aria-label="选择 AI 工具">
            {AI_TOOLS.map(tool => (
              <button
                type="button"
                key={tool.id}
                className={`${styles.toolOption} ${selectedTool.id === tool.id ? styles.isSelected : ''}`}
                onClick={() => chooseTool(tool)}
                disabled={disabled}
              >
                <span>{tool.label}</span>
                {selectedTool.id === tool.id ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.quickSetupPanel} aria-label="模型版本设置">
        <div className={styles.quickSetupRow}>
          <div className={styles.compactStepHeading}>
            <StepBadge value="02" />
            <div>
              <div className={shared.sectionEyebrow}>MODEL VERSION</div>
              <h2>选择版本</h2>
            </div>
          </div>

          <label className={styles.modelSelectField}>
            <select value={form.model} onChange={chooseModel} disabled={disabled}>
              {selectedTool.models.map(model => (
                <option key={modelKey(model)} value={modelKey(model)}>{modelLabel(model)}</option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>
      </section>

      <section className={`${shared.workSection} ${styles.promptSection} ${styles.promptSectionPrimary}`}>
        <div className={styles.promptSectionHead}>
          <SectionHeading
            step="03"
            eyebrow="PROMPT & PARAMETERS"
            title="描述你的镜头"
            description="用具体的主体、动作、环境和镜头语言描述你想生成的画面。"
            compact
          />
          <div className={styles.promptHeaderMeta}>
            <div className={styles.currentConfigStrip} aria-label="当前模型配置">
              <span>{selectedTool.label} · {modelLabel(selectedModel)}</span>
            </div>
          </div>
        </div>

        <div className={styles.promptLayout}>
          <div className={styles.promptColumn}>
            <label className={`${shared.fieldLabel} ${styles.promptField}`}>
              <span>提示词</span>
              <textarea
                value={form.prompt}
                onChange={event => onChange({ prompt: event.target.value })}
                placeholder="请输入视频提示词，描述主体、动作、场景和镜头效果"
                disabled={disabled}
                spellCheck="false"
              />
              <small>{form.prompt.length} / 2000</small>
            </label>
          </div>

          <div className={styles.parameterPanel}>
            <div className={styles.parameterPanelHeading}>
              <div>
                <span>常用配置</span>
                <small>影响成片的主要选项</small>
              </div>
              <span className={styles.parameterStatus}>默认</span>
            </div>

            {isSeedance && capabilities.supportsOmniReferenceTaskType ? (
              <label className={shared.fieldLabel}>
                <span>创作模式</span>
                <select value={mode} onChange={chooseMode} disabled={disabled}>
                  {MODE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className={styles.parameterGrid}>
              <label className={shared.fieldLabel}>
                <span>时长</span>
                <select
                  value={form.duration ?? 5}
                  onChange={event => onChange({ duration: Number(event.target.value) })}
                  disabled={disabled || Boolean(form.frames) || isEditing}
                >
                  {durationOptions.map(value => (
                    <option key={value} value={value}>
                      {value === -1 ? '自动（模型决定）' : `${value} 秒`}
                    </option>
                  ))}
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>分辨率</span>
                <select
                  value={form.resolution || '720P'}
                  onChange={event => onChange({ resolution: event.target.value })}
                  disabled={disabled || Boolean(form.draft)}
                >
                  {(isSeedance ? capabilities.resolutions : ['480P', '720P', '1080P']).map(value => (
                    <option key={value} value={value}>{value.toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>画幅比例</span>
                <select
                  value={form.ratio || '16:9'}
                  onChange={event => onChange({ ratio: event.target.value })}
                  disabled={disabled || isEditing || isExtending}
                >
                  {ratioOptions.map(value => (
                    <option key={value} value={value}>{value === 'adaptive' ? '跟随素材' : value}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.toggleGrid}>
              {isSeedance && capabilities.supportsAudio ? (
                <ToggleRow
                  label="生成音频"
                  description="同步生成对白、音效和背景音乐"
                  checked={form.generateAudio ?? true}
                  onChange={checked => onChange({ generateAudio: checked })}
                  disabled={disabled}
                />
              ) : null}
              <ToggleRow
                label="提示词增强"
                description="补充镜头、光照和运动细节"
                checked={form.promptExtend ?? true}
                onChange={checked => onChange({ promptExtend: checked })}
                disabled={disabled}
              />
            </div>

            {isSeedance ? (
              <div className={styles.referenceSection}>
                <button
                  type="button"
                  className={styles.referenceToggle}
                  onClick={() => setReferenceOpen(open => !open)}
                  aria-expanded={referenceOpen}
                  aria-controls="video-creative-material-options"
                  disabled={disabled}
                >
                  <span className={styles.referenceToggleMeta}>
                    <strong>创作素材</strong>
                    <small>帮助保持人物、场景和镜头连续</small>
                  </span>
                  <span className={styles.referenceToggleAction}>
                    <span className={styles.parameterStatus}>{referenceStatus}</span>
                    <ChevronDown className={referenceOpen ? styles.isExpanded : ''} size={17} />
                  </span>
                </button>

                {referenceOpen ? (
                  <div className={styles.referenceContent} id="video-creative-material-options">
                    <p className={styles.parameterHint}>
                      {modeRequiresVideo
                        ? '当前模式需要添加视频素材。'
                        : isSeedance && capabilities.family === '2.0'
                          ? '2.0 版本的参考音频需要搭配图片或视频素材。'
                        : '首尾画面与创作素材请二选一；多个地址请每行填写一个。'}
                    </p>

                    {showFirstLastFrames ? (
                      <div className={styles.referenceGrid}>
                        <label className={shared.fieldLabel}>
                          <span>首帧图片</span>
                          <input
                            type="url"
                            value={form.firstFrameUrl || ''}
                            onChange={event => onChange({ firstFrameUrl: event.target.value })}
                            placeholder="https://…"
                            disabled={disabled}
                          />
                        </label>
                        <label className={shared.fieldLabel}>
                          <span>尾帧图片</span>
                          <input
                            type="url"
                            value={form.lastFrameUrl || ''}
                            onChange={event => onChange({ lastFrameUrl: event.target.value })}
                            placeholder="https://…"
                            disabled={disabled}
                          />
                        </label>
                      </div>
                    ) : null}

                    {showReferenceImages ? (
                      <label className={shared.fieldLabel}>
                        <span>图片素材</span>
                        <textarea
                          className={styles.referenceInput}
                          rows="2"
                          value={form.referenceImageUrl || ''}
                          onChange={event => onChange({ referenceImageUrl: event.target.value })}
                          placeholder="每行一个图片地址"
                          disabled={disabled}
                        />
                      </label>
                    ) : null}

                    {showReferenceVideo ? (
                      <label className={shared.fieldLabel}>
                        <span>视频素材</span>
                        <textarea
                          className={styles.referenceInput}
                          rows="2"
                          value={form.referenceVideoUrl || ''}
                          onChange={event => onChange({ referenceVideoUrl: event.target.value })}
                          placeholder="每行一个视频地址"
                          disabled={disabled}
                        />
                      </label>
                    ) : null}

                    {showReferenceAudio ? (
                      <label className={shared.fieldLabel}>
                        <span>音频素材</span>
                        <textarea
                          className={styles.referenceInput}
                          rows="2"
                          value={form.referenceAudioUrl || ''}
                          onChange={event => onChange({ referenceAudioUrl: event.target.value })}
                          placeholder="每行一个音频地址"
                          disabled={disabled}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isSeedance && advancedOptionCount ? (
              <div className={styles.advancedSection}>
                <button
                  type="button"
                  className={styles.advancedToggle}
                  onClick={() => setAdvancedOpen(open => !open)}
                  aria-expanded={advancedOpen}
                  disabled={disabled}
                >
                  <span>
                    <strong>高级配置</strong>
                    <small>较少使用的成片控制</small>
                  </span>
                  <ChevronDown className={advancedOpen ? styles.isExpanded : ''} size={17} />
                </button>

                {advancedOpen ? (
                  <div className={styles.advancedContent}>
                    <div className={styles.toggleGrid}>
                      <ToggleRow
                        label="添加水印"
                        description="在成片右下角保留 AI Generated 水印"
                        checked={Boolean(form.watermark)}
                        onChange={checked => onChange({ watermark: checked })}
                        disabled={disabled}
                      />
                      {capabilities.supportsReturnLastFrame ? (
                        <ToggleRow
                          label="生成尾帧"
                          description="返回最后一帧图片，方便衔接下一镜"
                          checked={Boolean(form.returnLastFrame)}
                          onChange={checked => onChange({ returnLastFrame: checked })}
                          disabled={disabled || Boolean(form.draft)}
                        />
                      ) : null}
                      {capabilities.supportsCameraFixed ? (
                        <ToggleRow
                          label="固定镜头"
                          description="减少镜头移动，适合稳定构图"
                          checked={Boolean(form.cameraFixed)}
                          onChange={checked => onChange({ cameraFixed: checked })}
                          disabled={disabled || hasImageReference}
                        />
                      ) : null}
                      {capabilities.supportsDraft ? (
                        <ToggleRow
                          label="草稿预览"
                          description="用较低成本快速检查镜头结构"
                          checked={Boolean(form.draft)}
                          onChange={chooseDraft}
                          disabled={disabled}
                        />
                      ) : null}
                    </div>

                    <div className={styles.advancedGrid}>
                      {capabilities.supportsOutputFormat ? (
                        <label className={shared.fieldLabel}>
                          <span>输出格式</span>
                          <select
                            value={form.outputFormat || 'mp4'}
                            onChange={event => onChange({ outputFormat: event.target.value })}
                            disabled={disabled}
                          >
                            <option value="mp4">MP4（兼容性好）</option>
                            <option value="mov">MOV（适合后期）</option>
                          </select>
                        </label>
                      ) : null}
                      {capabilities.supportsSeed ? (
                        <label className={shared.fieldLabel}>
                          <span>随机种子</span>
                          <input
                            type="number"
                            min="-1"
                            max="2147483647"
                            step="1"
                            value={form.seed ?? ''}
                            onChange={event => onChange({ seed: event.target.value })}
                            placeholder="-1 表示随机"
                            disabled={disabled}
                          />
                        </label>
                      ) : null}
                      {capabilities.supportsFrames ? (
                        <label className={shared.fieldLabel}>
                          <span>精确帧数</span>
                          <input
                            type="number"
                            min="29"
                            max="289"
                            step="4"
                            value={form.frames ?? ''}
                            onChange={event => onChange({ frames: event.target.value })}
                            placeholder="29–289，步长 4"
                            disabled={disabled}
                          />
                          <small className={styles.fieldHint}>填写后优先使用帧数，并覆盖时长。</small>
                        </label>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.videoFormFooter}>
          <div className={styles.videoFormNote}>
            <WandSparkles size={15} />
            <span>支持中文描述 · 高清视频</span>
          </div>
          <button
            type="button"
            className={`${shared.submitButton} ${styles.videoSubmitButton}`}
            onClick={onGenerate}
            disabled={generating || !hasCreativeInput}
          >
            {generating ? <LoaderCircle className={shared.spin} size={17} /> : <Sparkles size={17} />}
            {generating ? (
              '正在生成…'
            ) : (
              <>
                <span>生成视频</span>
                <small className={styles.videoSubmitCost}>{VIDEO_GENERATION_COST} 积分</small>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
