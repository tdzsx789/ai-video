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
  const isSeedance = selectedTool.id === 'seedance';

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
            <div className={styles.parameterGrid}>
              <label className={shared.fieldLabel}>
                <span>时长</span>
                <select
                  value={form.duration ?? 5}
                  onChange={event => onChange({ duration: Number(event.target.value) })}
                  disabled={disabled || Boolean(form.frames)}
                >
                  {isSeedance ? <option value={-1}>自动（模型决定）</option> : null}
                  <option value={4}>4 秒</option>
                  <option value={5}>5 秒</option>
                  <option value={6}>6 秒</option>
                  <option value={8}>8 秒</option>
                  <option value={10}>10 秒</option>
                  <option value={12}>12 秒</option>
                  <option value={15}>15 秒</option>
                  <option value={30}>30 秒</option>
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>分辨率</span>
                <select value={form.resolution || '720P'} onChange={event => onChange({ resolution: event.target.value })} disabled={disabled}>
                  <option value="480P">480p</option>
                  <option value="720P">720p</option>
                  <option value="1080P">1080p</option>
                  <option value="4K">4k</option>
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>画幅比例</span>
                <select value={form.ratio || '16:9'} onChange={event => onChange({ ratio: event.target.value })} disabled={disabled}>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="9:16">9:16</option>
                  <option value="21:9">21:9</option>
                </select>
              </label>
              <label className={shared.fieldLabel}>
                <span>帧数（可选）</span>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  value={form.frames ?? ''}
                  onChange={event => onChange({ frames: event.target.value })}
                  placeholder="填写后优先使用帧数"
                  disabled={disabled}
                />
              </label>
            </div>

            {isSeedance ? (
              <div className={styles.officialOptions}>
                <div className={styles.parameterGroupHeading}>
                  <span>生成控制</span>
                  <small>Seedance</small>
                </div>
                <div className={styles.toggleGrid}>
                  <label className={styles.toggleRow}>
                    <span>
                      <strong>生成音频</strong>
                      <small>同步生成视频声音</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.generateAudio ?? true}
                      onChange={event => onChange({ generateAudio: event.target.checked })}
                      disabled={disabled}
                    />
                    <span className={styles.toggleControl} aria-hidden="true" />
                  </label>
                  <label className={styles.toggleRow}>
                    <span>
                      <strong>添加水印</strong>
                      <small>在成片中保留平台水印</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.watermark)}
                      onChange={event => onChange({ watermark: event.target.checked })}
                      disabled={disabled}
                    />
                    <span className={styles.toggleControl} aria-hidden="true" />
                  </label>
                  <label className={styles.toggleRow}>
                    <span>
                      <strong>返回尾帧</strong>
                      <small>任务结果附带最后一帧图片</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.returnLastFrame)}
                      onChange={event => onChange({ returnLastFrame: event.target.checked })}
                      disabled={disabled}
                    />
                    <span className={styles.toggleControl} aria-hidden="true" />
                  </label>
                  <label className={styles.toggleRow}>
                    <span>
                      <strong>提示词扩写</strong>
                      <small>让模型补全镜头、光照和运动细节</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.promptExtend ?? true}
                      onChange={event => onChange({ promptExtend: event.target.checked })}
                      disabled={disabled}
                    />
                    <span className={styles.toggleControl} aria-hidden="true" />
                  </label>
                </div>

                <div className={styles.parameterGroupHeading}>
                  <span>参考素材</span>
                  <small>可选 URL</small>
                </div>
                <div className={styles.referenceGrid}>
                  <label className={shared.fieldLabel}>
                    <span>图片地址</span>
                    <input
                      type="url"
                      value={form.referenceImageUrl || ''}
                      onChange={event => onChange({ referenceImageUrl: event.target.value })}
                      placeholder="https://…"
                      disabled={disabled}
                    />
                  </label>
                  <label className={shared.fieldLabel}>
                    <span>视频地址</span>
                    <input
                      type="url"
                      value={form.referenceVideoUrl || ''}
                      onChange={event => onChange({ referenceVideoUrl: event.target.value })}
                      placeholder="https://…"
                      disabled={disabled}
                    />
                  </label>
                  <label className={shared.fieldLabel}>
                    <span>音频地址</span>
                    <input
                      type="url"
                      value={form.referenceAudioUrl || ''}
                      onChange={event => onChange({ referenceAudioUrl: event.target.value })}
                      placeholder="https://…"
                      disabled={disabled}
                    />
                  </label>
                </div>

                <div className={styles.parameterGroupHeading}>
                  <span>高级参数</span>
                  <small>官方任务配置</small>
                </div>
                <div className={styles.advancedGrid}>
                  <label className={shared.fieldLabel}>
                    <span>随机种子</span>
                    <input
                      type="number"
                      min="0"
                      max="2147483647"
                      step="1"
                      value={form.seed ?? ''}
                      onChange={event => onChange({ seed: event.target.value })}
                      placeholder="随机"
                      disabled={disabled}
                    />
                  </label>
                  <label className={shared.fieldLabel}>
                    <span>任务有效期（秒）</span>
                    <input
                      type="number"
                      min="3600"
                      max="259200"
                      step="3600"
                      value={form.executionExpiresAfter ?? 172800}
                      onChange={event => onChange({ executionExpiresAfter: Number(event.target.value) })}
                      disabled={disabled}
                    />
                  </label>
                  <label className={`${shared.fieldLabel} ${styles.callbackField}`}>
                    <span>回调地址</span>
                    <input
                      type="url"
                      value={form.callbackUrl || ''}
                      onChange={event => onChange({ callbackUrl: event.target.value })}
                      placeholder="可选：https://…"
                      disabled={disabled}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className={styles.toggleRow}>
                <span>
                  <strong>提示词扩写</strong>
                  <small>让模型补全镜头、光照和运动细节</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.promptExtend ?? true}
                  onChange={event => onChange({ promptExtend: event.target.checked })}
                  disabled={disabled}
                />
                <span className={styles.toggleControl} aria-hidden="true" />
              </label>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
