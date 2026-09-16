const RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'];

const HAILUO_23_FAST_MODELS = {
  'minimax-hailuo-2.3-fast/768p/6s': { duration: 6, resolution: '768P' },
  'minimax-hailuo-2.3-fast/768p/10s': { duration: 10, resolution: '768P' },
  'minimax-hailuo-2.3-fast/1080p/6s': { duration: 6, resolution: '1080P' },
};

const CAPABILITIES = {
  'hailuo-2.3-fast': {
    family: 'hailuo-2.3-fast',
    resolutions: [],
    durationOptions: [],
    durationMin: 6,
    durationMax: 10,
    supportsAutoDuration: false,
    supportsPromptOptimizer: true,
    supportsFastPretreatment: true,
    supportsRatio: false,
    supportsFrames: false,
    supportsAudio: false,
    supportsOutputFormat: false,
    supportsSeed: false,
    supportsCameraFixed: false,
    supportsReturnLastFrame: false,
    supportsDraft: false,
    supportsFlex: false,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: false,
    supportsReferenceVideo: false,
    supportsReferenceAudio: false,
    supportsAudioOnlyReference: false,
  },
  'hailuo-h3': {
    family: 'hailuo-h3',
    resolutions: ['768P', '2K'],
    durationMin: 4,
    durationMax: 15,
    supportsAutoDuration: false,
    supportsFrames: false,
    supportsAudio: false,
    supportsOutputFormat: false,
    supportsSeed: false,
    supportsCameraFixed: false,
    supportsReturnLastFrame: false,
    supportsDraft: false,
    supportsFlex: false,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: false,
    supportsReferenceVideo: false,
    supportsReferenceAudio: false,
    supportsAudioOnlyReference: false,
  },
  '2.5': {
    family: '2.5',
    resolutions: ['480P', '720P', '1080P'],
    durationMin: 4,
    durationMax: 30,
    supportsAutoDuration: true,
    supportsFrames: false,
    supportsAudio: true,
    supportsOutputFormat: true,
    supportsSeed: false,
    supportsCameraFixed: false,
    supportsReturnLastFrame: true,
    supportsDraft: false,
    supportsFlex: false,
    supportsOmniReferenceTaskType: true,
    supportsReferenceImages: true,
    supportsReferenceVideo: true,
    supportsReferenceAudio: true,
    supportsAudioOnlyReference: true,
  },
  '2.0': {
    family: '2.0',
    resolutions: ['480P', '720P', '1080P', '4K'],
    durationMin: 4,
    durationMax: 15,
    supportsAutoDuration: true,
    supportsFrames: false,
    supportsAudio: true,
    supportsOutputFormat: false,
    supportsSeed: false,
    supportsCameraFixed: false,
    supportsReturnLastFrame: true,
    supportsDraft: false,
    supportsFlex: false,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: true,
    supportsReferenceVideo: true,
    supportsReferenceAudio: true,
    supportsAudioOnlyReference: false,
  },
  '1.5': {
    family: '1.5',
    resolutions: ['480P', '720P', '1080P'],
    durationMin: 4,
    durationMax: 12,
    supportsAutoDuration: true,
    supportsFrames: false,
    supportsAudio: true,
    supportsOutputFormat: false,
    supportsSeed: true,
    supportsCameraFixed: true,
    supportsReturnLastFrame: true,
    supportsDraft: true,
    supportsFlex: true,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: false,
    supportsReferenceVideo: false,
    supportsReferenceAudio: false,
    supportsAudioOnlyReference: false,
  },
  '1.0': {
    family: '1.0',
    resolutions: ['480P', '720P', '1080P'],
    durationMin: 2,
    durationMax: 12,
    supportsAutoDuration: false,
    supportsFrames: true,
    supportsAudio: false,
    supportsOutputFormat: false,
    supportsSeed: true,
    supportsCameraFixed: true,
    supportsReturnLastFrame: true,
    supportsDraft: false,
    supportsFlex: true,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: false,
    supportsReferenceVideo: false,
    supportsReferenceAudio: false,
    supportsAudioOnlyReference: false,
  },
};

const FALLBACK_CAPABILITIES = {
  family: '',
  resolutions: ['480P', '720P', '1080P'],
  durationMin: 1,
  durationMax: 30,
  supportsAutoDuration: false,
  supportsFrames: false,
  supportsAudio: false,
  supportsOutputFormat: false,
  supportsSeed: false,
  supportsCameraFixed: false,
  supportsReturnLastFrame: false,
  supportsDraft: false,
  supportsFlex: false,
  supportsOmniReferenceTaskType: false,
  supportsReferenceImages: false,
  supportsReferenceVideo: false,
  supportsReferenceAudio: false,
  supportsAudioOnlyReference: false,
};

function getModelFamily(model) {
  const value = String(model || '').toLowerCase();
  if (HAILUO_23_FAST_MODELS[value]) return 'hailuo-2.3-fast';
  if (value === 'minimax-h3') return 'hailuo-h3';
  if (/seedance[-.]?2[-.]?5/.test(value)) return '2.5';
  if (/seedance[-.]?2[-.]?0/.test(value)) return '2.0';
  if (/seedance[-.]?1[-.]?5/.test(value)) return '1.5';
  if (/seedance[-.]?1[-.]?0/.test(value)) return '1.0';
  return '';
}

export function getSeedanceCapabilities(model) {
  const family = getModelFamily(model);
  const capabilities = CAPABILITIES[family] || FALLBACK_CAPABILITIES;

  if (family === 'hailuo-2.3-fast') {
    const spec = HAILUO_23_FAST_MODELS[String(model || '').toLowerCase()];
    return {
      ...capabilities,
      resolutions: [spec.resolution],
      durationOptions: [spec.duration],
      durationMin: spec.duration,
      durationMax: spec.duration,
    };
  }

  if (family === '2.0' && /fast|mini/.test(String(model || '').toLowerCase())) {
    return { ...capabilities, resolutions: ['480P', '720P'] };
  }

  return capabilities;
}

export function isSeedanceModel(model) {
  return Boolean(getModelFamily(model));
}

export function getDurationOptions(capabilities) {
  if (Array.isArray(capabilities.durationOptions)) return capabilities.durationOptions;
  const options = [];
  if (capabilities.supportsAutoDuration) options.push(-1);
  for (let value = capabilities.durationMin; value <= capabilities.durationMax; value += 1) {
    options.push(value);
  }
  return options;
}

export function getRatioOptions(capabilities) {
  if (capabilities.supportsRatio === false) return [];
  return RATIOS.filter(
    ratio => ratio !== 'adaptive' || !['1.0', 'hailuo-h3'].includes(capabilities.family),
  );
}

export function normalizeModelForm(form, model) {
  const capabilities = getSeedanceCapabilities(model);
  const next = { model };

  if (!capabilities.family) {
    next.omniReferenceTaskType = 'auto';
    return next;
  }

  const currentResolution = String(form.resolution || '').toUpperCase();
  if (!capabilities.resolutions.includes(currentResolution)) {
    next.resolution = capabilities.resolutions.includes('720P')
      ? '720P'
      : capabilities.resolutions[0];
  }

  const currentDuration = Number(form.duration);
  const durationOptions = getDurationOptions(capabilities);
  if (durationOptions.length) {
    if (!durationOptions.includes(currentDuration)) next.duration = durationOptions[0];
  } else if (
    currentDuration !== -1
    && (!Number.isFinite(currentDuration)
      || currentDuration < capabilities.durationMin
      || currentDuration > capabilities.durationMax)
  ) {
    next.duration = Number.isFinite(currentDuration)
      ? Math.min(Math.max(currentDuration, capabilities.durationMin), capabilities.durationMax)
      : Math.min(Math.max(5, capabilities.durationMin), capabilities.durationMax);
  } else if (currentDuration === -1 && !capabilities.supportsAutoDuration) {
    next.duration = Math.min(Math.max(5, capabilities.durationMin), capabilities.durationMax);
  }

  if (!capabilities.supportsFrames) next.frames = '';
  if (!capabilities.supportsAudio) next.generateAudio = false;
  if (capabilities.supportsPromptOptimizer) {
    next.promptOptimizer = form.promptOptimizer ?? form.promptExtend ?? true;
  } else {
    next.promptOptimizer = true;
  }
  if (!capabilities.supportsFastPretreatment) next.fastPretreatment = false;
  if (!capabilities.supportsOutputFormat) next.outputFormat = 'mp4';
  if (!capabilities.supportsSeed) next.seed = '';
  if (!capabilities.supportsCameraFixed) next.cameraFixed = false;
  if (!capabilities.supportsDraft) next.draft = false;
  if (!capabilities.supportsOmniReferenceTaskType) next.omniReferenceTaskType = 'auto';

  const ratio = String(form.ratio || '16:9');
  if (!getRatioOptions(capabilities).includes(ratio)) {
    next.ratio = ['1.0', 'hailuo-h3'].includes(capabilities.family) ? '16:9' : 'adaptive';
  }

  return next;
}
