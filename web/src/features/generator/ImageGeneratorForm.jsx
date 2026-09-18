import { useState } from 'react';
import {
  Brush,
  Check,
  ChevronDown,
  Coins,
  Image,
  LayoutGrid,
  Palette,
  Settings2,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import SelectField from '../../components/SelectField.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import { getModelLabel } from '../../lib/modelLabels.js';
import { calculateImageGenerationCost } from '../../lib/pricing.js';
import { isImageProviderEnabled } from '../../lib/imageProviders.js';
import shared from '../../styles/shared.module.css';
import generatorStyles from './GeneratorForm.module.css';
import styles from './ImageGeneratorForm.module.css';

export const IMAGE_TOOLS = [
  {
    id: 'gpt-image',
    label: 'gpt-image',
    models: [
      { key: 'gpt-image-2.5', label: '2.5' },
      { key: 'gpt-image-2.5-sunburst', label: '2.5 Sunburst' },
    ],
  },
  {
    id: 'gemini-nano-banana',
    label: 'Gemini-nano-banana',
    models: [
      { key: 'gemini-2.5-flash-image', label: '2.5（暂不可用）', disabled: true },
    ],
  },
];

const IMAGE_CREATIVE_BRIEFS = [
  {
    id: 'none',
    label: '无',
    description: '完全按提示词执行',
    hint: '不套用预设创作目标和输出偏好',
    prompt: '',
    patch: {},
  },
  {
    id: 'product',
    label: '产品图',
    description: '突出主体、材质和卖点',
    hint: '适合电商主图、详情页、广告素材',
    prompt: '以产品为视觉主角，突出卖点、材质和可用性',
    patch: { size: '1536x1024', quality: 'high', background: 'auto' },
  },
  {
    id: 'poster',
    label: '海报视觉',
    description: '强调标题空间和冲击力',
    hint: '适合活动海报、社媒封面、KV 方向',
    prompt: '为海报或主视觉保留清晰的标题空间，画面具有强烈的视觉焦点',
    patch: { size: '1024x1536', quality: 'high', background: 'opaque' },
  },
  {
    id: 'avatar',
    label: '头像角色',
    description: '聚焦人物、表情和识别度',
    hint: '适合头像、角色设定、IP 形象',
    prompt: '聚焦人物或角色的脸部、表情和识别特征，保持主体清晰',
    patch: { size: '1024x1024', quality: 'medium', background: 'auto' },
  },
  {
    id: 'concept',
    label: '概念场景',
    description: '探索氛围、空间和世界观',
    hint: '适合概念图、场景草案、灵感板',
    prompt: '强调空间氛围、环境叙事和世界观细节，画面具有探索感',
    patch: { size: '1536x1024', quality: 'high', background: 'opaque' },
  },
];

export const IMAGE_STYLE_OPTIONS = [
  { id: 'none', label: '无', prompt: '' },
  { id: 'commercial', label: '商业摄影', prompt: '商业摄影质感，真实材质，高级布光，细节清晰' },
  { id: 'editorial', label: '杂志大片', prompt: '杂志大片风格，精致构图，强烈视觉记忆点，高级调色' },
  { id: 'minimal', label: '极简设计', prompt: '极简视觉，干净背景，克制留白，主体关系清晰' },
  { id: 'illustration', label: '插画感', prompt: '精致插画风格，形体概括清楚，色彩层次丰富' },
];

export const IMAGE_COMPOSITION_OPTIONS = [
  { id: 'none', label: '无', prompt: '' },
  { id: 'center', label: '居中主体', prompt: '主体居中，轮廓完整，视觉焦点明确' },
  { id: 'closeup', label: '近景细节', prompt: '近景构图，突出材质纹理和局部细节' },
  { id: 'negative-space', label: '留白构图', prompt: '保留充足留白，适合后期添加标题和版式信息' },
  { id: 'flatlay', label: '俯拍平铺', prompt: '俯拍平铺构图，元素排列有秩序，适合视觉陈列' },
];

export const IMAGE_PALETTE_OPTIONS = [
  { id: 'none', label: '无', prompt: '' },
  { id: 'neutral', label: '高级中性', prompt: '高级中性色彩，黑白灰与低饱和色协调' },
  { id: 'warm', label: '暖调', prompt: '温暖色调，柔和明亮，亲和力强' },
  { id: 'cool', label: '冷调', prompt: '冷色调，清透克制，科技感和距离感更强' },
  { id: 'bold', label: '高对比', prompt: '高对比配色，视觉冲击强，主体和背景层次分明' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: '1024x1024', label: '1024 × 1024 · 方形' },
  { value: '1536x1024', label: '1536 × 1024 · 横向' },
  { value: '1024x1536', label: '1024 × 1536 · 纵向' },
];

const IMAGE_QUALITY_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低 · 更快' },
  { value: 'medium', label: '中 · 平衡' },
  { value: 'high', label: '高 · 更细节' },
];

const IMAGE_BACKGROUND_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'opaque', label: '不透明' },
  { value: 'transparent', label: '透明' },
];

const IMAGE_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG · 无损' },
  { value: 'jpeg', label: 'JPEG · 体积更小' },
  { value: 'webp', label: 'WebP · 体积更小' },
];

function modelKey(model) {
  return typeof model === 'string' ? model : model.key;
}

function modelLabel(model) {
  return typeof model === 'string' ? getModelLabel(model) : model.label;
}

function getToolForModel(model) {
  return IMAGE_TOOLS.find(tool => tool.models.some(item => modelKey(item) === model)) || IMAGE_TOOLS[0];
}

function getSelectedModel(tool, model) {
  return tool.models.find(item => modelKey(item) === model) || tool.models[0];
}

function selectedOptionLabel(options, id, fallback) {
  return options.find(option => option.id === id)?.label || fallback;
}

export function composeImagePrompt({
  prompt,
  imageBrief = 'none',
  imageStyle = 'none',
  imageComposition = 'none',
  imagePalette = 'none',
}) {
  const base = String(prompt || '').trim();
  const additions = [
    IMAGE_CREATIVE_BRIEFS.find(option => option.id === imageBrief)?.prompt,
    IMAGE_STYLE_OPTIONS.find(option => option.id === imageStyle)?.prompt,
    IMAGE_COMPOSITION_OPTIONS.find(option => option.id === imageComposition)?.prompt,
    IMAGE_PALETTE_OPTIONS.find(option => option.id === imagePalette)?.prompt,
  ].filter(Boolean);
  if (!base) return additions.join('，');
  return additions.length ? `${base}\n\n创作要求：${additions.join('，')}` : base;
}

export default function ImageGeneratorForm({
  form,
  onChange,
  onGenerate,
  generating,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedTool = getToolForModel(form.model);
  const selectedModel = getSelectedModel(selectedTool, form.model);
  const selectedModelUnavailable = selectedModel.disabled;
  const imageSize = form.size || 'auto';
  const imageQuality = form.quality || 'auto';
  const imageBackground = form.background || 'auto';
  const outputFormat = form.outputFormat || 'png';
  const outputCompression = Number.isFinite(Number(form.outputCompression))
    ? Number(form.outputCompression)
    : 100;
  const estimatedCost = calculateImageGenerationCost(form);
  const selectedBrief = form.imageBrief || 'none';
  const selectedStyle = form.imageStyle || 'none';
  const selectedComposition = form.imageComposition || 'none';
  const selectedPalette = form.imagePalette || 'none';
  const finalPrompt = composeImagePrompt({
    prompt: form.prompt,
    imageBrief: selectedBrief,
    imageStyle: selectedStyle,
    imageComposition: selectedComposition,
    imagePalette: selectedPalette,
  });

  const chooseTool = tool => {
    onChange({ model: modelKey(tool.models[0]) });
  };

  const chooseBrief = brief => {
    if (brief.id === 'none') {
      onChange({ imageBrief: 'none' });
      return;
    }
    onChange({ imageBrief: brief.id, ...brief.patch });
  };

  return (
    <div className={styles.imageForm}>
      <section className={generatorStyles.creativeBriefPanel} id="image" aria-label="图片创作目标">
        <div className={generatorStyles.creativeBriefHeader}>
          <div className={generatorStyles.compactStepHeading}>
            <StepBadge value="01" />
            <div>
              <div className={shared.sectionEyebrow}>IMAGE BRIEF</div>
              <h2>选择创作目标</h2>
              <p>先定图片用途，再补主体、风格和输出规格。</p>
            </div>
          </div>
          <span className={generatorStyles.briefSummary}>
            <Image size={14} />
            {selectedOptionLabel(IMAGE_CREATIVE_BRIEFS, selectedBrief, '自定义图片')}
          </span>
        </div>

        <div className={generatorStyles.briefGrid} role="group" aria-label="选择图片创作目标">
          {IMAGE_CREATIVE_BRIEFS.map(brief => (
            <button
              type="button"
              key={brief.id}
              className={`${generatorStyles.briefCard} ${selectedBrief === brief.id ? generatorStyles.isSelected : ''}`}
              onClick={() => chooseBrief(brief)}
              disabled={generating}
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

      <section className={generatorStyles.quickSetupPanel} aria-label="图片模型设置">
        <div className={generatorStyles.quickSetupRow}>
          <div className={generatorStyles.compactStepHeading}>
            <StepBadge value="02" />
            <div>
              <div className={shared.sectionEyebrow}>MODEL</div>
              <h2>模型与版本</h2>
            </div>
          </div>

          <div className={generatorStyles.modelSetupGrid}>
            <div className={`${generatorStyles.toolSegment} ${styles.imageToolSegment}`} role="group" aria-label="选择图片 AI 工具">
              {IMAGE_TOOLS.map(tool => (
                <button
                  type="button"
                  key={tool.id}
                  className={`${generatorStyles.toolOption} ${selectedTool.id === tool.id ? generatorStyles.isSelected : ''}`}
                  onClick={() => chooseTool(tool)}
                  disabled={generating || !isImageProviderEnabled(tool.id) || tool.models.every(model => model.disabled)}
                  title={!isImageProviderEnabled(tool.id) ? '当前账号暂时没有可用通道' : undefined}
                >
                  <Image size={15} />
                  <span>{tool.label}</span>
                  {selectedTool.id === tool.id ? <Check size={14} /> : null}
                </button>
              ))}
            </div>

            <SelectField
              className={generatorStyles.modelSelectField}
              compact
              value={modelKey(selectedModel)}
              onChange={value => onChange({ model: value })}
              disabled={generating}
              ariaLabel="选择图片模型版本"
              options={selectedTool.models.map(model => ({
                value: modelKey(model),
                label: modelLabel(model),
                disabled: model.disabled,
              }))}
            />
          </div>
        </div>
      </section>

      <section className={`${shared.workSection} ${generatorStyles.promptSection} ${generatorStyles.promptSectionPrimary}`}>
        <div className={generatorStyles.promptSectionHead}>
          <SectionHeading
            step="03"
            eyebrow="IMAGE DESIGN"
            title="设计你的画面"
            description="写清主体和场景，再用风格、构图与色彩预设补齐设计语言。"
            compact
          />
          <div className={styles.promptHeaderMeta}>
            <div className={generatorStyles.currentConfigStrip} aria-label="当前图片模型配置">
              <span>{selectedTool.label} · {modelLabel(selectedModel)} · {selectedOptionLabel(IMAGE_STYLE_OPTIONS, selectedStyle, '自定义风格')}</span>
            </div>
          </div>
        </div>

        <div className={generatorStyles.promptLayout}>
          <div className={generatorStyles.promptColumn}>
            <label className={`${shared.fieldLabel} ${generatorStyles.promptField}`}>
              <span>画面描述</span>
              <textarea
                value={form.prompt}
                onChange={event => onChange({ prompt: event.target.value })}
                placeholder="例如：一只透明玻璃香水瓶，放在湿润黑色岩石上，背景有柔和绿色反光"
                disabled={generating}
                spellCheck="false"
              />
              <small>{form.prompt.length} / 2000</small>
            </label>

            <div className={styles.imageDesignGrid}>
              <div className={generatorStyles.presetGroup}>
                <div className={generatorStyles.presetGroupHeading}>
                  <Brush size={14} />
                  <span>视觉风格</span>
                </div>
                <div className={generatorStyles.presetChipGrid} role="group" aria-label="选择图片视觉风格">
                  {IMAGE_STYLE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${generatorStyles.presetChip} ${selectedStyle === option.id ? generatorStyles.isSelected : ''}`}
                      onClick={() => onChange({ imageStyle: option.id })}
                      disabled={generating}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={generatorStyles.presetGroup}>
                <div className={generatorStyles.presetGroupHeading}>
                  <LayoutGrid size={14} />
                  <span>构图方式</span>
                </div>
                <div className={generatorStyles.presetChipGrid} role="group" aria-label="选择图片构图方式">
                  {IMAGE_COMPOSITION_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${generatorStyles.presetChip} ${selectedComposition === option.id ? generatorStyles.isSelected : ''}`}
                      onClick={() => onChange({ imageComposition: option.id })}
                      disabled={generating}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={generatorStyles.presetGroup}>
                <div className={generatorStyles.presetGroupHeading}>
                  <Palette size={14} />
                  <span>色彩方向</span>
                </div>
                <div className={generatorStyles.presetChipGrid} role="group" aria-label="选择图片色彩方向">
                  {IMAGE_PALETTE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${generatorStyles.presetChip} ${selectedPalette === option.id ? generatorStyles.isSelected : ''}`}
                      onClick={() => onChange({ imagePalette: option.id })}
                      disabled={generating}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {finalPrompt ? (
              <div className={generatorStyles.promptPreview}>
                <strong>生成时会合并</strong>
                <p>{finalPrompt}</p>
              </div>
            ) : null}
          </div>

          <div className={generatorStyles.parameterPanel}>
            <div className={generatorStyles.parameterPanelHeading}>
              <div>
                <span>输出规格</span>
                <small>控制尺寸、质量、背景和文件格式</small>
              </div>
              <span className={generatorStyles.parameterStatus}>GPT Image</span>
            </div>

            <div className={styles.imageParameterGrid}>
              <label className={shared.fieldLabel}>
                <span>尺寸</span>
                <SelectField
                  value={imageSize}
                  onChange={value => onChange({ size: value })}
                  disabled={generating}
                  ariaLabel="选择图片尺寸"
                  options={IMAGE_SIZE_OPTIONS}
                />
              </label>

              <label className={shared.fieldLabel}>
                <span>质量</span>
                <SelectField
                  value={imageQuality}
                  onChange={value => onChange({ quality: value })}
                  disabled={generating}
                  ariaLabel="选择图片质量"
                  options={IMAGE_QUALITY_OPTIONS}
                />
              </label>

              <label className={shared.fieldLabel}>
                <span>背景</span>
                <SelectField
                  value={imageBackground}
                  onChange={value => onChange({ background: value })}
                  disabled={generating}
                  ariaLabel="选择图片背景"
                  options={IMAGE_BACKGROUND_OPTIONS.map(option => ({
                    ...option,
                    disabled: outputFormat === 'jpeg' && option.value === 'transparent',
                  }))}
                />
              </label>
            </div>

            <div className={styles.advancedSection}>
              <button
                type="button"
                className={styles.advancedToggle}
                onClick={() => setAdvancedOpen(current => !current)}
                disabled={generating}
                aria-expanded={advancedOpen}
                aria-controls="image-advanced-options"
              >
                <span className={styles.advancedToggleLabel}>
                  <Settings2 size={15} />
                  <span>
                    <strong>高级配置</strong>
                    <small>输出格式与压缩质量</small>
                  </span>
                </span>
                <ChevronDown className={advancedOpen ? styles.isExpanded : ''} size={16} />
              </button>

              {advancedOpen ? (
                <div className={styles.advancedContent} id="image-advanced-options">
                  <label className={shared.fieldLabel}>
                    <span>输出格式</span>
                    <SelectField
                      value={outputFormat}
                      onChange={value => onChange({ outputFormat: value })}
                      disabled={generating}
                      ariaLabel="选择图片输出格式"
                      options={IMAGE_FORMAT_OPTIONS}
                    />
                  </label>

                  <label className={`${shared.fieldLabel} ${styles.compressionField}`}>
                    <span className={styles.compressionLabel}>
                      <span>压缩质量</span>
                      <output>{outputFormat === 'png' ? 'PNG 不适用' : `${outputCompression}%`}</output>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={outputCompression}
                      onChange={event => onChange({ outputCompression: Number(event.target.value) })}
                      disabled={generating || outputFormat === 'png'}
                    />
                    <small>仅 JPEG / WebP 生效</small>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.imageFormFooter}>
          <div className={styles.imageFormNote}>
            <WandSparkles size={15} />
            <span>支持中文描述 · 一次生成 1 张</span>
          </div>
          <div className={styles.imageSubmitArea}>
            <span className={styles.imageCostBadge}>
              <Coins size={14} />
              {estimatedCost === null ? '待配置计费' : `${estimatedCost} 积分 / 次`}
            </span>
            <button
              type="button"
              className={`${shared.submitButton} ${styles.imageSubmitButton}`}
              onClick={onGenerate}
              disabled={generating || selectedModelUnavailable || !form.prompt.trim()}
            >
              {generating ? <span className={styles.buttonLoader} /> : <Sparkles size={17} />}
              {generating ? '正在生成…' : '生成图片'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
