const MODEL_LABELS = {
  'doubao-seedance-2-5-260628': 'seedance 2.5',
  'doubao-seedance-2-0-fast-260128': 'seedance 2.0-fast',
  'doubao-seedance-2-0-mini-260615': 'seedance 2.0-mini',
  'kling-v2-6/std/10': '可灵 2.6 标准版',
  'kling-v2-6-video': '可灵 2.6',
  'kling-v2-6/pro/10': '可灵 2.6 专业版',
  'kling-v2-6-video-pro': '可灵 2.6 专业版',
  'MiniMax-Hailuo-2.3-Fast/768p/6s': '海螺 2.3 Fast · 768p · 6 秒',
  'MiniMax-Hailuo-2.3-Fast/768p/10s': '海螺 2.3 Fast · 768p · 10 秒',
  'MiniMax-Hailuo-2.3-Fast/1080p/6s': '海螺 2.3 Fast · 1080p · 6 秒',
};

export function getModelLabel(model) {
  const value = String(model || '').trim();
  return MODEL_LABELS[value] || value || '未选择';
}
