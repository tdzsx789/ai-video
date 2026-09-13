import { Check, ChevronDown, Image, Sparkles } from 'lucide-react';
import SectionHeading from '../../components/SectionHeading.jsx';
import { PRESETS } from './presets.js';

export default function GeneratorForm({
  form,
  onChange,
  selectedPreset,
  onPresetChange,
  disabled,
  onModeChange,
}) {
  return (
    <div className="studio-form">
      <section className="work-section" id="studio">
        <SectionHeading
          step="01"
          eyebrow="SERVICE TYPE"
          title="选择生成方式"
          description="先确定视频输入形式，后续可以在同一条任务链路中继续调试。"
        />

        <div className="service-grid">
          <button type="button" className="service-card is-selected" disabled={disabled}>
            <div className="service-card-top">
              <div className="service-icon service-icon-green"><Sparkles size={21} /></div>
              <div className="service-card-title">
                <strong>文生视频</strong>
                <span>TEXT TO VIDEO</span>
              </div>
              <Check className="service-check" size={20} />
            </div>
            <p>从一段自然语言描述生成动态镜头。</p>
            <div className="service-chip-row">
              <span>Seedance 2.0</span>
              <span>中文提示词</span>
              <span>自动扩写</span>
            </div>
          </button>

          <button type="button" className="service-card" onClick={() => onModeChange?.('image')} disabled={disabled}>
            <div className="service-card-top">
              <div className="service-icon service-icon-muted"><Image size={21} /></div>
              <div className="service-card-title">
                <strong>参考图生视频</strong>
                <span>IMAGE TO VIDEO</span>
              </div>
              <span className="coming-soon">切换工作台</span>
            </div>
            <p>上传一张参考图，控制画面运动和镜头方向。</p>
            <div className="service-chip-row">
              <span>首帧控制</span>
              <span>动作参考</span>
            </div>
          </button>
        </div>
      </section>

      <section className="work-section">
        <SectionHeading
          step="02"
          eyebrow="PICK A PRESET"
          title="选择输出规格"
          description="预设只会调整本次任务的参数，模型仍固定为当前已开通的 Seedance 模型。"
        />

        <div className="preset-grid">
          {PRESETS.map(preset => (
            <button
              type="button"
              key={preset.id}
              className={`preset-card ${selectedPreset === preset.id ? 'is-selected' : ''}`}
              onClick={() => onPresetChange(preset)}
              disabled={disabled}
            >
              {preset.recommended ? <span className="recommended-badge">推荐</span> : null}
              <div className="preset-card-top">
                <span className="preset-tag">{preset.tag}</span>
                <span className="preset-value">{preset.value}</span>
              </div>
              <div className="preset-title">{preset.title}</div>
              <p>{preset.description}</p>
              <div className={`preset-action ${selectedPreset === preset.id ? 'is-selected' : ''}`}>
                {selectedPreset === preset.id ? <Check size={16} /> : null}
                {selectedPreset === preset.id ? '已选择' : '选择'}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="work-section prompt-section">
        <SectionHeading
          step="03"
          eyebrow="PROMPT & PARAMETERS"
          title="描述你的镜头"
          description="用具体的主体、动作、环境和镜头语言描述你想生成的画面。"
        />

        <div className="prompt-layout">
          <label className="field-label prompt-field">
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

          <div className="parameter-panel">
            <div className="parameter-panel-heading">
              <span>精细参数</span>
              <ChevronDown size={15} />
            </div>
            <label className="field-label">
              <span>模型名称</span>
              <input value={form.model} onChange={event => onChange({ model: event.target.value })} disabled={disabled} />
            </label>
            <div className="field-row">
              <label className="field-label">
                <span>时长</span>
                <select value={form.duration} onChange={event => onChange({ duration: Number(event.target.value) })} disabled={disabled}>
                  <option value={4}>4 秒</option>
                  <option value={5}>5 秒</option>
                  <option value={6}>6 秒</option>
                  <option value={8}>8 秒</option>
                  <option value={10}>10 秒</option>
                </select>
              </label>
              <label className="field-label">
                <span>分辨率</span>
                <select value={form.resolution} onChange={event => onChange({ resolution: event.target.value })} disabled={disabled}>
                  <option value="480P">480P</option>
                  <option value="720P">720P</option>
                  <option value="1080P">1080P</option>
                </select>
              </label>
            </div>
            <label className="toggle-row">
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
              <span className="toggle-control" aria-hidden="true" />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
