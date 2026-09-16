import { useState } from 'react';
import { Check, ChevronDown, Coins, Image, Settings2, Sparkles, WandSparkles } from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import { getModelLabel } from '../../lib/modelLabels.js';
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

const IMAGE_GENERATION_COST = 12;

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

  const chooseTool = tool => {
    onChange({ model: modelKey(tool.models[0]) });
  };

  return (
    <div className={styles.imageForm}>
      <section className={generatorStyles.quickSetupPanel} id="image" aria-label="图片 AI 工具设置">
        <div className={generatorStyles.quickSetupRow}>
          <div className={generatorStyles.compactStepHeading}>
            <StepBadge value="01" />
            <div>
              <div className={shared.sectionEyebrow}>AI TOOL</div>
              <h2>选择AI工具</h2>
            </div>
          </div>

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
        </div>
      </section>

      <section className={generatorStyles.quickSetupPanel} aria-label="图片模型版本设置">
        <div className={generatorStyles.quickSetupRow}>
          <div className={generatorStyles.compactStepHeading}>
            <StepBadge value="02" />
            <div>
              <div className={shared.sectionEyebrow}>MODEL VERSION</div>
              <h2>选择版本</h2>
            </div>
          </div>

          <label className={generatorStyles.modelSelectField}>
            <select value={modelKey(selectedModel)} onChange={event => onChange({ model: event.target.value })} disabled={generating}>
              {selectedTool.models.map(model => (
                <option key={modelKey(model)} value={modelKey(model)} disabled={model.disabled}>{modelLabel(model)}</option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>
      </section>

      <section className={`${shared.workSection} ${generatorStyles.promptSection} ${generatorStyles.promptSectionPrimary}`}>
        <div className={generatorStyles.promptSectionHead}>
          <SectionHeading
            step="03"
            eyebrow="PROMPT & PARAMETERS"
            title="描述你的画面"
            description="用具体的主体、环境、光线、材质和构图描述你想生成的画面。"
            compact
          />
          <div className={styles.promptHeaderMeta}>
            <div className={generatorStyles.currentConfigStrip} aria-label="当前图片模型配置">
              <span>{selectedTool.label} · {modelLabel(selectedModel)}</span>
            </div>
          </div>
        </div>

        <div className={generatorStyles.promptLayout}>
          <label className={`${shared.fieldLabel} ${generatorStyles.promptField}`}>
            <span>画面描述</span>
            <textarea
              value={form.prompt}
              onChange={event => onChange({ prompt: event.target.value })}
              placeholder="请输入画面描述，包含主体、场景、光线、材质和构图"
              disabled={generating}
              spellCheck="false"
            />
            <small>{form.prompt.length} / 2000</small>
          </label>

          <div className={generatorStyles.parameterPanel}>
            <div className={generatorStyles.parameterPanelHeading}>
              <div>
                <span>精细参数</span>
                <small>常用选项会直接作用于本次生成</small>
              </div>
              <span className={generatorStyles.parameterStatus}>GPT Image</span>
            </div>

            <div className={styles.imageParameterGrid}>
              <label className={shared.fieldLabel}>
                <span>尺寸</span>
                <select value={imageSize} onChange={event => onChange({ size: event.target.value })} disabled={generating}>
                  {IMAGE_SIZE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className={shared.fieldLabel}>
                <span>质量</span>
                <select value={imageQuality} onChange={event => onChange({ quality: event.target.value })} disabled={generating}>
                  {IMAGE_QUALITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className={shared.fieldLabel}>
                <span>背景</span>
                <select value={imageBackground} onChange={event => onChange({ background: event.target.value })} disabled={generating}>
                  {IMAGE_BACKGROUND_OPTIONS.map(option => (
                    <option key={option.value} value={option.value} disabled={outputFormat === 'jpeg' && option.value === 'transparent'}>{option.label}</option>
                  ))}
                </select>
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
                    <select value={outputFormat} onChange={event => onChange({ outputFormat: event.target.value })} disabled={generating}>
                      {IMAGE_FORMAT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
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
              {IMAGE_GENERATION_COST} 积分 / 张
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
