import { Image, Sparkles, WandSparkles } from 'lucide-react';

const STYLE_OPTIONS = [
  { id: 'cinematic', label: '电影感' },
  { id: 'editorial', label: '杂志视觉' },
  { id: 'illustration', label: '插画风' },
  { id: 'product', label: '产品棚拍' },
];

export default function ImageGeneratorForm({
  form,
  onChange,
  onGenerate,
  generating,
}) {
  return (
    <div className="image-workspace">
      <section className="work-section image-brief-section">
        <div className="image-brief-head">
          <div className="image-brief-icon"><Image size={21} /></div>
          <div>
            <div className="section-eyebrow">IMAGE WORKSPACE</div>
            <h2>把想法变成画面</h2>
            <p>输入描述，先从一张视觉草稿开始。</p>
          </div>
          <span className="cost-badge"><Sparkles size={13} /> 12 积分 / 张</span>
        </div>

        <label className="field-label image-prompt-field">
          <span>画面描述</span>
          <textarea
            value={form.prompt}
            onChange={event => onChange({ prompt: event.target.value })}
            placeholder="例如：金色的铲子悬浮在黑曜石台面上，边缘有柔和高光，极简商业摄影。"
            disabled={generating}
            spellCheck="false"
          />
          <small>{form.prompt.length} / 2000</small>
        </label>

        <div className="image-style-row">
          <div>
            <span className="field-caption">视觉风格</span>
            <div className="style-options">
              {STYLE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`style-option ${form.style === option.id ? 'is-selected' : ''}`}
                  onClick={() => onChange({ style: option.id })}
                  disabled={generating}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field-label image-ratio-field">
            <span>画幅</span>
            <select value={form.ratio} onChange={event => onChange({ ratio: event.target.value })} disabled={generating}>
              <option value="1:1">1:1 方形</option>
              <option value="4:3">4:3 横幅</option>
              <option value="16:9">16:9 宽屏</option>
              <option value="9:16">9:16 竖幅</option>
            </select>
          </label>
        </div>

        <div className="image-form-footer">
          <div className="image-form-note">
            <WandSparkles size={15} />
            <span>支持中文描述 · 高清草稿</span>
          </div>
          <button type="button" className="submit-button image-submit-button" onClick={onGenerate} disabled={generating || !form.prompt.trim()}>
            {generating ? <span className="button-loader" /> : <Sparkles size={17} />}
            {generating ? '正在生成…' : '生成图片'}
            <span className="button-cost">12</span>
          </button>
        </div>
      </section>
    </div>
  );
}
