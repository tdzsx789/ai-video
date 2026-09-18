import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Clapperboard,
  FileAudio,
  FileImage,
  FileVideo,
  ImagePlus,
  LoaderCircle,
  Settings2,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import SelectField from '../../components/SelectField.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import { getModelLabel } from '../../lib/modelLabels.js';
import { calculateVideoGenerationCost } from '../../lib/pricing.js';
import { isVideoProviderEnabled } from '../../lib/videoProviders.js';
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
const MODE_OPTIONS = [
  { value: 'auto', label: '无素材创作' },
  { value: 'reference', label: '基于素材创作' },
  { value: 'edit', label: '视频编辑' },
  { value: 'extend', label: '视频延展' },
];

const CREATIVE_BRIEFS = [
  {
    id: 'none',
    label: '无',
    description: '完全按提示词执行',
    hint: '不套用预设创作方向和输出偏好',
    patch: {},
  },
  {
    id: 'product',
    label: '产品展示',
    description: '突出材质、细节和卖点',
    hint: '适合电商主图、广告短片、详情页动效',
    patch: {
      ratio: '16:9',
      duration: 5,
      generateAudio: false,
      cameraFixed: false,
    },
  },
  {
    id: 'social',
    label: '社媒短片',
    description: '节奏更快，第一眼抓人',
    hint: '适合小红书、抖音、竖版预告',
    patch: {
      ratio: '9:16',
      duration: 6,
      generateAudio: true,
      cameraFixed: false,
    },
  },
  {
    id: 'brand',
    label: '品牌氛围',
    description: '画面更稳，重视高级感',
    hint: '适合官网、品牌片和发布会视觉',
    patch: {
      ratio: '16:9',
      duration: 8,
      generateAudio: true,
      cameraFixed: false,
    },
  },
  {
    id: 'story',
    label: '故事镜头',
    description: '强调人物、动作和情绪',
    hint: '适合分镜预演、概念短片、片段测试',
    patch: {
      ratio: '21:9',
      duration: 8,
      generateAudio: true,
      cameraFixed: false,
    },
  },
];

export const VISUAL_STYLE_OPTIONS = [
  { id: 'none', label: '无', prompt: '' },
  { id: 'cinematic', label: '电影质感', prompt: '电影级布光，浅景深，真实镜头语言，高级调色' },
  { id: 'clean', label: '极简干净', prompt: '极简构图，干净背景，柔和自然光，画面留白克制' },
  { id: 'commercial', label: '商业广告', prompt: '商业广告质感，产品细节清晰，高级棚拍光线，画面精致' },
  { id: 'surreal', label: '超现实', prompt: '超现实视觉，强烈想象力，梦境般空间，细节丰富' },
];

export const MOTION_OPTIONS = [
  { id: 'none', label: '无', prompt: '' },
  { id: 'push-in', label: '缓慢推进', prompt: '镜头缓慢向前推进，运动平稳，有空间层次' },
  { id: 'orbit', label: '环绕展示', prompt: '镜头围绕主体轻微环绕，突出体积、材质和轮廓' },
  { id: 'static', label: '稳定定镜', prompt: '固定机位，构图稳定，主体动作自然，画面干净' },
  { id: 'handheld', label: '轻微手持', prompt: '轻微手持镜头，带有真实记录感和呼吸感' },
];

const ALL_AI_TOOLS = [
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

export const AI_TOOLS = ALL_AI_TOOLS.filter(tool => isVideoProviderEnabled(tool.id));

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

function selectedOptionLabel(options, id, fallback) {
  return options.find(option => option.id === id)?.label || fallback;
}

function formatFileSize(size) {
  const bytes = Number(size);
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function assetIcon(assetType) {
  if (assetType === 'video') return FileVideo;
  if (assetType === 'audio') return FileAudio;
  return FileImage;
}

function AssetUploadCard({
  field,
  label,
  hint,
  accept,
  assetType,
  value,
  metadata,
  disabled,
  uploading,
  onUpload,
  onRemove,
}) {
  const Icon = assetIcon(assetType);
  const inputId = `asset-upload-${field}`;
  const hasValue = Boolean(String(value || '').trim());

  return (
    <div className={`${styles.assetUploadCard} ${hasValue ? styles.hasAsset : ''}`}>
      <div className={styles.assetUploadHeading}>
        <span className={styles.assetUploadTitle}>
          <Icon size={15} />
          <strong>{label}</strong>
        </span>
        {hasValue ? (
          <button
            type="button"
            className={styles.assetRemoveButton}
            onClick={onRemove}
            disabled={disabled || uploading}
            aria-label={`移除${label}`}
            title={`移除${label}`}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <small className={styles.assetUploadHint}>{hint}</small>

      {hasValue ? (
        <div className={styles.assetUploadedMeta}>
          <div>
            <strong>{metadata?.name || '已添加素材'}</strong>
            {metadata?.size ? <small>{formatFileSize(metadata.size)}</small> : null}
          </div>
          <span>已添加</span>
        </div>
      ) : null}

      <label
        className={`${styles.assetUploadAction} ${uploading ? styles.isUploading : ''} ${disabled ? styles.isDisabled : ''}`}
        htmlFor={inputId}
      >
        {uploading ? <LoaderCircle className={shared.spin} size={15} /> : <Upload size={15} />}
        <span>{uploading ? '上传中…' : hasValue ? '重新上传' : '选择文件'}</span>
        <input
          id={inputId}
          className={styles.assetUploadInput}
          type="file"
          accept={accept}
          disabled={disabled || uploading}
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            onUpload(file);
          }}
        />
      </label>
    </div>
  );
}

export function composeVideoPrompt({ prompt, visualStyle = 'none', motionStyle = 'none' }) {
  const base = String(prompt || '').trim();
  const additions = [
    VISUAL_STYLE_OPTIONS.find(option => option.id === visualStyle)?.prompt,
    MOTION_OPTIONS.find(option => option.id === motionStyle)?.prompt,
  ].filter(Boolean);
  if (!base) return additions.join('，');
  return additions.length ? `${base}\n\n创作要求：${additions.join('，')}` : base;
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
  onUploadAsset,
  onRemoveAsset,
  uploadingAssets = {},
  assetUploads = {},
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedTool = getToolForModel(form.model);
  const selectedModel = getSelectedModel(selectedTool, form.model);
  const isSeedance = selectedTool.id === 'seedance';
  const isHailuo = selectedTool.id === 'hailuo';
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
  const showFirstFrame = isHailuo || (isSeedance && modeAllowsFrames);
  const showLastFrame = isSeedance && modeAllowsFrames;
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
  const canChooseMode = isSeedance && capabilities.supportsOmniReferenceTaskType;
  const showMaterialSection = isHailuo
    || (canChooseMode ? mode !== 'auto' : isSeedance);
  const hasUploadingAsset = Object.values(uploadingAssets).some(Boolean);
  const durationOptions = isSeedance || isHailuo
    ? getDurationOptions(capabilities)
    : LEGACY_DURATION_OPTIONS;
  const estimatedCost = calculateVideoGenerationCost(form);
  const ratioOptions = isSeedance || isHailuo
    ? getRatioOptions(capabilities)
    : LEGACY_RATIO_OPTIONS;
  const advancedOptionCount = [
    ...(isSeedance
      ? [
      capabilities.supportsOutputFormat,
      capabilities.supportsSeed,
      capabilities.supportsFrames,
      capabilities.supportsCameraFixed,
      capabilities.supportsDraft,
      capabilities.supportsReturnLastFrame,
      ]
      : []),
    ...(isHailuo && capabilities.supportsFastPretreatment ? [true] : []),
  ].filter(Boolean).length;
  const selectedBrief = form.creativeBrief || 'none';
  const selectedVisualStyle = form.visualStyle || 'none';
  const selectedMotionStyle = form.motionStyle || 'none';
  const finalPrompt = composeVideoPrompt({
    prompt: form.prompt,
    visualStyle: selectedVisualStyle,
    motionStyle: selectedMotionStyle,
  });

  const chooseTool = tool => {
    onChange(normalizeModelForm(form, modelKey(tool.models[0])));
  };

  const chooseModel = value => {
    onChange(normalizeModelForm(form, value));
  };

  const chooseMode = value => {
    const nextMode = value;
    const updates = { omniReferenceTaskType: nextMode };
    if (nextMode === 'edit' || nextMode === 'extend') updates.ratio = 'adaptive';
    if (nextMode === 'edit') updates.duration = -1;
    if (nextMode === 'auto') {
      Object.assign(updates, {
        firstFrameUrl: '',
        lastFrameUrl: '',
        referenceImageUrl: '',
        referenceVideoUrl: '',
        referenceAudioUrl: '',
      });
    }
    if (nextMode === 'edit' || nextMode === 'extend') {
      Object.assign(updates, {
        firstFrameUrl: '',
        lastFrameUrl: '',
        referenceImageUrl: '',
        referenceAudioUrl: '',
      });
    }
    onChange(updates);
  };

  const chooseDraft = checked => {
    onChange({
      draft: checked,
      ...(checked ? { resolution: '480P', returnLastFrame: false } : {}),
    });
  };

  const chooseBrief = brief => {
    if (brief.id === 'none') {
      onChange({ creativeBrief: 'none' });
      return;
    }
    const patch = { creativeBrief: brief.id, ...brief.patch };
    const nextRatio = patch.ratio;
    const ratioAvailable = !nextRatio || ratioOptions.includes(nextRatio);
    const nextDuration = patch.duration;
    const durationAvailable = !nextDuration || durationOptions.includes(nextDuration);
    if (!ratioAvailable) delete patch.ratio;
    if (!durationAvailable) delete patch.duration;
    if (isEditing || isExtending) delete patch.ratio;
    if (isEditing || isHailuo) delete patch.duration;
    onChange(patch);
  };

  return (
    <div className={styles.studioForm}>
      <section className={styles.creativeBriefPanel} id="studio" aria-label="视频创作方向">
        <div className={styles.creativeBriefHeader}>
          <div className={styles.compactStepHeading}>
            <StepBadge value="01" />
            <div>
              <div className={shared.sectionEyebrow}>CREATIVE BRIEF</div>
              <h2>选择创作方向</h2>
              <p>先定用途和节奏，再微调模型参数。</p>
            </div>
          </div>
          <span className={styles.briefSummary}><Clapperboard size={14} /> {selectedOptionLabel(CREATIVE_BRIEFS, selectedBrief, '自定义创作')}</span>
        </div>

        <div className={styles.briefGrid} role="group" aria-label="选择视频创作用途">
          {CREATIVE_BRIEFS.map(brief => (
            <button
              type="button"
              key={brief.id}
              className={`${styles.briefCard} ${selectedBrief === brief.id ? styles.isSelected : ''}`}
              onClick={() => chooseBrief(brief)}
              disabled={disabled}
            >
              <span>
                <strong>{brief.label}</strong>
                <small>{brief.description}</small>
              </span>
              <em>{brief.hint}</em>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.quickSetupPanel} aria-label="视频模型设置">
        <div className={styles.quickSetupRow}>
          <div className={styles.compactStepHeading}>
            <StepBadge value="02" />
            <div>
              <div className={shared.sectionEyebrow}>MODEL</div>
              <h2>模型与版本</h2>
            </div>
          </div>

          <div className={styles.modelSetupGrid}>
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

            <SelectField
              className={styles.modelSelectField}
              compact
              value={form.model}
              onChange={chooseModel}
              disabled={disabled}
              ariaLabel="选择视频模型版本"
              options={selectedTool.models.map(model => ({
                value: modelKey(model),
                label: modelLabel(model),
              }))}
            />
          </div>
        </div>
      </section>

      <section className={`${shared.workSection} ${styles.promptSection} ${styles.promptSectionPrimary}`}>
        <div className={styles.promptSectionHead}>
          <SectionHeading
            step="03"
            eyebrow="SHOT DESIGN"
            title="描述你的镜头"
            description="先写主体、动作和场景，再用风格与运镜预设补齐画面语言。"
            compact
          />
          <div className={styles.promptHeaderMeta}>
            <div className={styles.currentConfigStrip} aria-label="当前模型配置">
              <span>{selectedTool.label} · {modelLabel(selectedModel)} · {selectedOptionLabel(VISUAL_STYLE_OPTIONS, selectedVisualStyle, '自定义风格')}</span>
            </div>
          </div>
        </div>

        <div className={styles.promptLayout}>
          <div className={styles.promptColumn}>
            <label className={`${shared.fieldLabel} ${styles.promptField}`}>
              <span>创作描述</span>
              <textarea
                value={form.prompt}
                onChange={event => onChange({ prompt: event.target.value })}
                placeholder="例如：一支透明香水瓶立在湿润的黑色岩石上，水雾缓慢流动，瓶身折射出绿色光线"
                disabled={disabled}
                spellCheck="false"
              />
              <small>{form.prompt.length} / 2000</small>
            </label>

            <div className={styles.designPresetGrid}>
              <div className={styles.presetGroup}>
                <div className={styles.presetGroupHeading}>
                  <Settings2 size={14} />
                  <span>视觉风格</span>
                </div>
                <div className={styles.presetChipGrid} role="group" aria-label="选择视觉风格">
                  {VISUAL_STYLE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.presetChip} ${selectedVisualStyle === option.id ? styles.isSelected : ''}`}
                      onClick={() => onChange({ visualStyle: option.id })}
                      disabled={disabled}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.presetGroup}>
                <div className={styles.presetGroupHeading}>
                  <Clapperboard size={14} />
                  <span>镜头节奏</span>
                </div>
                <div className={styles.presetChipGrid} role="group" aria-label="选择镜头节奏">
                  {MOTION_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.presetChip} ${selectedMotionStyle === option.id ? styles.isSelected : ''}`}
                      onClick={() => onChange({ motionStyle: option.id })}
                      disabled={disabled}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {finalPrompt ? (
              <div className={styles.promptPreview}>
                <strong>生成时会合并</strong>
                <p>{finalPrompt}</p>
              </div>
            ) : null}
          </div>

          <div className={styles.parameterPanel}>
            <div className={styles.parameterPanelHeading}>
              <div>
                <span>常用配置</span>
                <small>影响成片的主要选项</small>
              </div>
              <span className={styles.parameterStatus}>默认</span>
            </div>

            {canChooseMode ? (
              <>
                <label className={shared.fieldLabel}>
                  <span>创作模式</span>
                  <SelectField
                    value={mode}
                    onChange={chooseMode}
                    disabled={disabled}
                    ariaLabel="选择创作模式"
                    options={MODE_OPTIONS}
                  />
                </label>
                {mode === 'auto' ? (
                  <button
                    type="button"
                    className={styles.materialPrompt}
                    onClick={() => chooseMode('reference')}
                    disabled={disabled}
                  >
                    <ImagePlus size={15} />
                    <span>
                      <strong>需要参考图或视频？</strong>
                      <small>切换到基于素材创作，上传入口会显示在这里</small>
                    </span>
                    <ChevronDown size={15} />
                  </button>
                ) : null}
              </>
            ) : null}

            <div className={styles.parameterGrid}>
              <label className={shared.fieldLabel}>
                <span>{isHailuo ? '时长（版本固定）' : '时长'}</span>
                <SelectField
                  value={form.duration ?? 5}
                  onChange={value => onChange({ duration: Number(value) })}
                  disabled={disabled || Boolean(form.frames) || isEditing || isHailuo}
                  ariaLabel="选择视频时长"
                  options={durationOptions.map(value => ({
                    value,
                    label: value === -1 ? '自动（模型决定）' : `${value} 秒`,
                  }))}
                />
              </label>
              <label className={shared.fieldLabel}>
                <span>{isHailuo ? '分辨率（版本固定）' : '分辨率'}</span>
                <SelectField
                  value={form.resolution || '720P'}
                  onChange={value => onChange({ resolution: value })}
                  disabled={disabled || Boolean(form.draft) || isHailuo}
                  ariaLabel="选择视频分辨率"
                  options={(isSeedance || isHailuo ? capabilities.resolutions : ['480P', '720P', '1080P']).map(value => ({
                    value,
                    label: value === '2K' ? '2K' : value.toLowerCase(),
                  }))}
                />
              </label>
              {ratioOptions.length ? (
                <label className={shared.fieldLabel}>
                  <span>画幅比例</span>
                  <SelectField
                    value={form.ratio || '16:9'}
                    onChange={value => onChange({ ratio: value })}
                    disabled={disabled || isEditing || isExtending}
                    ariaLabel="选择视频画幅比例"
                    options={ratioOptions.map(value => ({
                      value,
                      label: value === 'adaptive' ? '跟随素材' : value,
                    }))}
                  />
                </label>
              ) : null}
            </div>

            {isHailuo ? (
              <p className={styles.parameterHint}>海螺 2.3 Fast 的时长和分辨率由第 2 步版本决定。</p>
            ) : null}

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
              {isHailuo ? (
                <ToggleRow
                  label="提示词优化"
                  description="自动优化镜头语言和运镜表达"
                  checked={form.promptOptimizer ?? true}
                  onChange={checked => onChange({ promptOptimizer: checked })}
                  disabled={disabled}
                />
              ) : (
                <ToggleRow
                  label="提示词增强"
                  description="补充镜头、光照和运动细节"
                  checked={form.promptExtend ?? true}
                  onChange={checked => onChange({ promptExtend: checked })}
                  disabled={disabled}
                />
              )}
            </div>

            {showMaterialSection ? (
              <div className={styles.materialSection}>
                <div className={styles.parameterGroupHeading}>
                  <div>
                    <strong>创作素材</strong>
                    <small>
                      {isHailuo
                        ? '海螺 2.3 Fast 需要上传首帧图片。'
                        : modeRequiresVideo
                          ? '当前模式需要上传一个视频素材。'
                          : capabilities.family === '2.0'
                            ? '参考音频需要搭配图片或视频素材。'
                            : '素材会先上传到 OSS，再带入生成任务。'}
                    </small>
                  </div>
                </div>

                <div className={styles.materialGrid}>
                  {showFirstFrame ? (
                    <AssetUploadCard
                      field="firstFrameUrl"
                      label="首帧图片"
                      hint={isHailuo ? '必填，作为视频起始画面' : '可选，控制开场画面'}
                      accept="image/*"
                      assetType="image"
                      value={form.firstFrameUrl}
                      metadata={assetUploads.firstFrameUrl}
                      disabled={disabled}
                      uploading={Boolean(uploadingAssets.firstFrameUrl)}
                      onUpload={file => onUploadAsset?.('firstFrameUrl', 'image', file)}
                      onRemove={() => onRemoveAsset?.('firstFrameUrl')}
                    />
                  ) : null}
                  {showLastFrame ? (
                    <AssetUploadCard
                      field="lastFrameUrl"
                      label="尾帧图片"
                      hint="可选，需要同时有首帧图片"
                      accept="image/*"
                      assetType="image"
                      value={form.lastFrameUrl}
                      metadata={assetUploads.lastFrameUrl}
                      disabled={disabled}
                      uploading={Boolean(uploadingAssets.lastFrameUrl)}
                      onUpload={file => onUploadAsset?.('lastFrameUrl', 'image', file)}
                      onRemove={() => onRemoveAsset?.('lastFrameUrl')}
                    />
                  ) : null}
                  {showReferenceImages ? (
                    <AssetUploadCard
                      field="referenceImageUrl"
                      label="图片素材"
                      hint="人物、产品或场景参考"
                      accept="image/*"
                      assetType="image"
                      value={form.referenceImageUrl}
                      metadata={assetUploads.referenceImageUrl}
                      disabled={disabled}
                      uploading={Boolean(uploadingAssets.referenceImageUrl)}
                      onUpload={file => onUploadAsset?.('referenceImageUrl', 'image', file)}
                      onRemove={() => onRemoveAsset?.('referenceImageUrl')}
                    />
                  ) : null}
                  {showReferenceVideo ? (
                    <AssetUploadCard
                      field="referenceVideoUrl"
                      label="视频素材"
                      hint={modeRequiresVideo ? '必填，用于编辑或延展' : '可选，参考动态和镜头'}
                      accept="video/*"
                      assetType="video"
                      value={form.referenceVideoUrl}
                      metadata={assetUploads.referenceVideoUrl}
                      disabled={disabled}
                      uploading={Boolean(uploadingAssets.referenceVideoUrl)}
                      onUpload={file => onUploadAsset?.('referenceVideoUrl', 'video', file)}
                      onRemove={() => onRemoveAsset?.('referenceVideoUrl')}
                    />
                  ) : null}
                  {showReferenceAudio ? (
                    <AssetUploadCard
                      field="referenceAudioUrl"
                      label="音频素材"
                      hint="对白、音效或音乐参考"
                      accept="audio/*"
                      assetType="audio"
                      value={form.referenceAudioUrl}
                      metadata={assetUploads.referenceAudioUrl}
                      disabled={disabled}
                      uploading={Boolean(uploadingAssets.referenceAudioUrl)}
                      onUpload={file => onUploadAsset?.('referenceAudioUrl', 'audio', file)}
                      onRemove={() => onRemoveAsset?.('referenceAudioUrl')}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {(isSeedance || isHailuo) && advancedOptionCount ? (
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
                      {isHailuo && capabilities.supportsFastPretreatment ? (
                        <ToggleRow
                          label="快速预处理"
                          description="缩短提示词优化的预处理时间"
                          checked={Boolean(form.fastPretreatment)}
                          onChange={checked => onChange({ fastPretreatment: checked })}
                          disabled={disabled}
                        />
                      ) : null}
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
                          <SelectField
                            value={form.outputFormat || 'mp4'}
                            onChange={value => onChange({ outputFormat: value })}
                            disabled={disabled}
                            ariaLabel="选择视频输出格式"
                            options={[
                              { value: 'mp4', label: 'MP4（兼容性好）' },
                              { value: 'mov', label: 'MOV（适合后期）' },
                            ]}
                          />
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
            disabled={generating || hasUploadingAsset || !hasCreativeInput}
          >
            {generating ? <LoaderCircle className={shared.spin} size={17} /> : <Sparkles size={17} />}
            {generating ? (
              '正在生成…'
            ) : hasUploadingAsset ? (
              '素材上传中…'
            ) : (
              <>
                <span>生成视频</span>
                <small className={styles.videoSubmitCost}>
                  {estimatedCost === null ? '待配置计费' : `${estimatedCost} 积分`}
                </small>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
