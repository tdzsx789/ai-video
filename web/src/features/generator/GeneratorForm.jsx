import { Check, ChevronDown } from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import StepBadge from '../../components/StepBadge.jsx';
import shared from '../../styles/shared.module.css';
import styles from './GeneratorForm.module.css';

export const AI_TOOLS = [
  {
    id: 'seedance',
    label: 'seedance',
    models: [
      'doubao-seedance-2-5-260628',
      'doubao-seedance-2-0-fast-260128',
      'doubao-seedance-2-0-mini-260615',
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

function getToolForModel(model) {
  return AI_TOOLS.find(tool => tool.models.includes(model)) || AI_TOOLS[0];
}

export default function GeneratorForm({
  form,
  onChange,
  disabled,
}) {
  const selectedTool = getToolForModel(form.model);

  const chooseTool = tool => {
    onChange({ model: tool.models[0] });
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
            <select value={form.model} onChange={event => onChange({ model: event.target.value })} disabled={disabled}>
              {selectedTool.models.map(model => (
                <option key={model} value={model}>{model}</option>
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
          <div className={styles.currentConfigStrip} aria-label="当前模型配置">
            <Check size={13} />
            <span>{selectedTool.label} · {form.model}</span>
          </div>
        </div>

        <div className={styles.promptLayout}>
          <label className={`${shared.fieldLabel} ${styles.promptField}`}>
            <span>提示词</span>
            <textarea
              value={form.prompt}
              onChange={event => onChange({ prompt: event.target.value })}
              placeholder="例如：一只橘猫在清晨的窗台上伸懒腰，镜头从近景缓慢推向窗外的城市天际线，电影质感。"
              disabled={disabled}
              spellCheck="false"
            />
            <small>{form.prompt.length} / 2000</small>
          </label>

          <div className={styles.parameterPanel}>
            <div className={styles.parameterPanelHeading}>
              <span>精细参数</span>
              <ChevronDown size={15} />
            </div>
            <div className={shared.fieldRow}>
              <label className={shared.fieldLabel}>
                <span>时长</span>
                <select value={form.duration} onChange={event => onChange({ duration: Number(event.target.value) })} disabled={disabled}>
                  <option value={4}>4 秒</option>
                  <option value={5}>5 秒</option>
                  <option value={6}>6 秒</option>
                  <option value={8}>8 秒</option>
                  <option value={10}>10 秒</option>
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>分辨率</span>
                <select value={form.resolution} onChange={event => onChange({ resolution: event.target.value })} disabled={disabled}>
                  <option value="480P">480P</option>
                  <option value="720P">720P</option>
                  <option value="1080P">1080P</option>
                </select>
              </label>
            </div>
            <label className={styles.toggleRow}>
              <span>
                <strong>提示词扩写</strong>
                <small>让模型补全镜头、光照和运动细节</small>
              </span>
              <input
                type="checkbox"
                checked={form.promptExtend}
                onChange={event => onChange({ promptExtend: event.target.checked })}
                disabled={disabled}
              />
              <span className={styles.toggleControl} aria-hidden="true" />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
