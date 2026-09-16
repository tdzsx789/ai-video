import { Check, ChevronDown, Coins, Image, Sparkles, WandSparkles } from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import { getModelLabel } from '../../lib/modelLabels.js';
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
      { key: 'gemini-2.5-flash-image', label: '2.5' },
    ],
  },
];

const STYLE_OPTIONS = [
  { id: 'cinematic', label: '电影感' },
  { id: 'editorial', label: '杂志视觉' },
  { id: 'illustration', label: '插画风' },
  { id: 'product', label: '产品棚拍' },
];
const IMAGE_GENERATION_COST = 12;

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
  const selectedTool = getToolForModel(form.model);
  const selectedModel = getSelectedModel(selectedTool, form.model);

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
                disabled={generating}
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
                <option key={modelKey(model)} value={modelKey(model)}>{modelLabel(model)}</option>
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
            description="用具体的主体、环境、光线和风格描述你想生成的画面。"
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
              placeholder="请输入画面描述，包含主体、场景、光线和视觉风格"
              disabled={generating}
              spellCheck="false"
            />
            <small>{form.prompt.length} / 2000</small>
          </label>

          <div className={generatorStyles.parameterPanel}>
            <div className={generatorStyles.parameterPanelHeading}>
              <span>精细参数</span>
              <ChevronDown size={15} />
            </div>

            <div className={styles.parameterGroup}>
              <span className={shared.fieldCaption}>视觉风格</span>
              <div className={styles.styleOptions}>
                {STYLE_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.styleOption} ${form.style === option.id ? styles.isSelected : ''}`}
                    onClick={() => onChange({ style: option.id })}
                    disabled={generating}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={`${shared.fieldLabel} ${styles.imageRatioField}`}>
              <span>画幅</span>
              <select value={form.ratio} onChange={event => onChange({ ratio: event.target.value })} disabled={generating}>
                <option value="1:1">1:1 方形</option>
                <option value="4:3">4:3 横幅</option>
                <option value="16:9">16:9 宽屏</option>
                <option value="9:16">9:16 竖幅</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.imageFormFooter}>
          <div className={styles.imageFormNote}>
            <WandSparkles size={15} />
            <span>支持中文描述 · 高清草稿</span>
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
              disabled={generating || !form.prompt.trim()}
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
