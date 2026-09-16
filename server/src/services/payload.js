const defaultModel = 'doubao-seedance-2-0-fast-260128';
const defaultDuration = 5;
const defaultResolution = '720p';
const defaultRatio = '16:9';
const defaultExecutionExpiresAfter = 172800;

const HAILUO_23_FAST_MODELS = {
  'minimax-hailuo-2.3-fast/768p/6s': { duration: 6, resolution: '768P' },
  'minimax-hailuo-2.3-fast/768p/10s': { duration: 10, resolution: '768P' },
  'minimax-hailuo-2.3-fast/1080p/6s': { duration: 6, resolution: '1080P' },
};

const resolutionAliases = {
  '480P': '480p',
  '720P': '720p',
  '1080P': '1080p',
  '4K': '4k',
  '768P': '768P',
  '2K': '2K',
};

const allRatios = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'];

function integer(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function optionalInteger(value, min, max) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = integer(value, NaN);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, min), max);
}

function boolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') return !['false', '0', 'off', 'no'].includes(value.toLowerCase());
  return Boolean(value);
}

function resourceUrl(value) {
  const url = String(value || '').trim();
  return /^(https?:\/\/|data:|asset:\/\/)/i.test(url) ? url : '';
}

function callbackUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function splitResources(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[\n,]+/);
  return values.map(resourceUrl).filter(Boolean);
}

function modelFamily(model) {
  const value = String(model || '').toLowerCase();
  if (HAILUO_23_FAST_MODELS[value]) return 'hailuo-2.3-fast';
  if (value === 'minimax-h3') return 'hailuo-h3';
  if (/seedance[-.]?2[-.]?5/.test(value)) return '2.5';
  if (/seedance[-.]?2[-.]?0/.test(value)) return '2.0';
  if (/seedance[-.]?1[-.]?5/.test(value)) return '1.5';
  if (/seedance[-.]?1[-.]?0/.test(value)) return '1.0';
  return '';
}

function modelCapabilities(model) {
  const family = modelFamily(model);
  const value = String(model || '').toLowerCase();

  if (family === 'hailuo-2.3-fast') {
    const spec = HAILUO_23_FAST_MODELS[value];
    return {
      family,
      resolutions: [spec.resolution],
      durationMin: spec.duration,
      durationMax: spec.duration,
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
      supportsPriority: false,
      supportsOmniReferenceTaskType: false,
      supportsReferenceImages: false,
      supportsReferenceVideo: false,
      supportsReferenceAudio: false,
      supportsAudioOnlyReference: false,
      requiresFirstFrameImage: true,
    };
  }

  if (family === 'hailuo-h3') {
    return {
      family,
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
      supportsPriority: false,
      supportsOmniReferenceTaskType: false,
      supportsReferenceImages: false,
      supportsReferenceVideo: false,
      supportsReferenceAudio: false,
      supportsAudioOnlyReference: false,
    };
  }

  if (family === '2.5') {
    return {
      family,
      resolutions: ['480p', '720p', '1080p'],
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
      supportsPriority: true,
      supportsOmniReferenceTaskType: true,
      supportsReferenceImages: true,
      supportsReferenceVideo: true,
      supportsReferenceAudio: true,
      supportsAudioOnlyReference: true,
    };
  }

  if (family === '2.0') {
    const fastOrMini = /fast|mini/.test(value);
    return {
      family,
      resolutions: fastOrMini ? ['480p', '720p'] : ['480p', '720p', '1080p', '4k'],
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
      supportsPriority: true,
      supportsOmniReferenceTaskType: false,
      supportsReferenceImages: true,
      supportsReferenceVideo: true,
      supportsReferenceAudio: true,
      supportsAudioOnlyReference: false,
    };
  }

  if (family === '1.5') {
    return {
      family,
      resolutions: ['480p', '720p', '1080p'],
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
      supportsPriority: false,
      supportsOmniReferenceTaskType: false,
      supportsReferenceImages: false,
      supportsReferenceVideo: false,
      supportsReferenceAudio: false,
      supportsAudioOnlyReference: false,
    };
  }

  if (family === '1.0') {
    return {
      family,
      resolutions: ['480p', '720p', '1080p'],
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
      supportsPriority: false,
      supportsOmniReferenceTaskType: false,
      supportsReferenceImages: false,
      supportsReferenceVideo: false,
      supportsReferenceAudio: false,
      supportsAudioOnlyReference: false,
    };
  }

  return {
    family: '',
    resolutions: ['480p', '720p', '1080p'],
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
    supportsPriority: false,
    supportsOmniReferenceTaskType: false,
    supportsReferenceImages: false,
    supportsReferenceVideo: false,
    supportsReferenceAudio: false,
    supportsAudioOnlyReference: false,
  };
}

function normalizeResolution(value, capabilities) {
  const candidate = String(value || defaultResolution).trim();
  const normalized = resolutionAliases[candidate.toUpperCase()] || candidate.toLowerCase();
  if (capabilities.resolutions.includes(normalized)) return normalized;
  return capabilities.resolutions.includes(defaultResolution)
    ? defaultResolution
    : capabilities.resolutions[0];
}

function normalizeRatio(value, capabilities) {
  const ratio = String(value || defaultRatio).trim();
  if (allRatios.includes(ratio)) {
    if (ratio === 'adaptive' && ['1.0', 'hailuo-h3'].includes(capabilities.family)) {
      return defaultRatio;
    }
    return ratio;
  }
  return defaultRatio;
}

function normalizeDuration(value, capabilities) {
  const requested = integer(value, defaultDuration);
  if (requested === -1 && capabilities.supportsAutoDuration) return -1;
  return Math.min(Math.max(requested, capabilities.durationMin), capabilities.durationMax);
}

function normalizeFrames(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const requested = integer(value, NaN);
  if (!Number.isFinite(requested)) return undefined;
  const clamped = Math.min(Math.max(requested, 29), 289);
  return Math.min(289, 29 + Math.round((clamped - 29) / 4) * 4);
}

function normalizeContentItem(item) {
  if (!item || typeof item !== 'object') return null;

  if (item.type === 'text') {
    const text = String(item.text || '').trim();
    return text ? { type: 'text', text } : null;
  }

  if (item.type === 'image_url') {
    const url = resourceUrl(item.image_url?.url || item.url);
    if (!url) return null;
    const role = ['first_frame', 'last_frame', 'reference_image'].includes(item.role) ? item.role : undefined;
    return {
      type: 'image_url',
      image_url: { url },
      ...(role ? { role } : {}),
    };
  }

  if (item.type === 'video_url') {
    const url = resourceUrl(item.video_url?.url || item.url);
    if (!url) return null;
    return {
      type: 'video_url',
      video_url: { url },
      role: 'reference_video',
    };
  }

  if (item.type === 'audio_url') {
    const url = resourceUrl(item.audio_url?.url || item.url);
    if (!url) return null;
    return {
      type: 'audio_url',
      audio_url: { url },
      role: 'reference_audio',
    };
  }

  if (item.type === 'draft_task') {
    const id = String(item.draft_task?.id || item.id || '').trim();
    return id ? { type: 'draft_task', draft_task: { id } } : null;
  }

  return null;
}

function filterContent(content, capabilities, taskType) {
  let filtered = content.filter(item => {
    if (item.type === 'image_url' && item.role === 'reference_image') {
      return capabilities.supportsReferenceImages;
    }
    if (item.type === 'video_url') return capabilities.supportsReferenceVideo;
    if (item.type === 'audio_url') return capabilities.supportsReferenceAudio;
    if (item.type === 'draft_task') return capabilities.supportsDraft;
    return true;
  });

  if (capabilities.supportsOmniReferenceTaskType && ['edit', 'extend'].includes(taskType)) {
    filtered = filtered.filter(item => item.type === 'text' || item.type === 'video_url');
  } else if (capabilities.supportsOmniReferenceTaskType && taskType === 'reference') {
    filtered = filtered.filter(item => item.type !== 'image_url' || item.role === 'reference_image');
  } else if (filtered.some(item => (
    item.type === 'image_url' && ['first_frame', 'last_frame'].includes(item.role)
  ))) {
    filtered = filtered.filter(item => (
      item.type !== 'video_url'
      && item.type !== 'audio_url'
      && !(item.type === 'image_url' && item.role === 'reference_image')
    ));
  }

  return filtered;
}

function normalizeContent(input, prompt, capabilities, taskType) {
  const providedContent = Array.isArray(input.content)
    ? input.content.map(normalizeContentItem).filter(Boolean)
    : [];
  if (providedContent.length) return filterContent(providedContent, capabilities, taskType);

  const content = [];
  if (prompt) content.push({ type: 'text', text: prompt });

  const firstFrameUrls = splitResources(input.firstFrameUrl || input.first_frame_url);
  const lastFrameUrls = splitResources(input.lastFrameUrl || input.last_frame_url);
  const referenceImageUrls = splitResources(
    input.referenceImageUrls
      || input.reference_image_urls
      || input.referenceImageUrl
      || input.reference_image_url,
  );
  const referenceVideoUrls = splitResources(
    input.referenceVideoUrls
      || input.reference_video_urls
      || input.referenceVideoUrl
      || input.reference_video_url,
  );
  const referenceAudioUrls = splitResources(
    input.referenceAudioUrls
      || input.reference_audio_urls
      || input.referenceAudioUrl
      || input.reference_audio_url,
  );

  if (!capabilities.supportsOmniReferenceTaskType || taskType === 'auto') {
    firstFrameUrls.forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'first_frame' }));
    lastFrameUrls.forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'last_frame' }));
  }
  if (!capabilities.supportsOmniReferenceTaskType || taskType === 'auto' || taskType === 'reference') {
    referenceImageUrls.forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' }));
  }
  if (!capabilities.supportsOmniReferenceTaskType || ['auto', 'reference', 'edit', 'extend'].includes(taskType)) {
    referenceVideoUrls.forEach(url => content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' }));
  }
  if (!capabilities.supportsOmniReferenceTaskType || taskType === 'auto' || taskType === 'reference') {
    referenceAudioUrls.forEach(url => content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' }));
  }

  const draftTaskId = String(input.draftTaskId || input.draft_task_id || '').trim();
  if (draftTaskId) {
    content.push({ type: 'draft_task', draft_task: { id: draftTaskId } });
  }

  return filterContent(content, capabilities, taskType);
}

function normalizeSafetyIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 64);
}

function normalizeSeed(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = integer(value, NaN);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, -1), 2_147_483_647);
}

function legacyPayload(input, prompt) {
  const duration = Math.min(Math.max(integer(input.duration, defaultDuration), 1), 30);
  const resolution = String(input.resolution || '720P').trim();
  const promptExtend = boolean(input.promptExtend ?? input.prompt_extend, true);

  return {
    model: String(input.model || defaultModel).trim(),
    prompt,
    duration,
    metadata: {
      parameters: {
        resolution,
        prompt_extend: promptExtend,
      },
    },
  };
}

function hailuoPayload(input, prompt, capabilities) {
  const content = normalizeContent(input, prompt, capabilities, 'auto');

  if (capabilities.family === 'hailuo-2.3-fast') {
    const firstFrame = content.find(item => item.type === 'image_url' && item.role === 'first_frame');
    if (!firstFrame) {
      throw new Error('海螺 2.3 Fast 是参考图生视频，请先添加首帧图片。');
    }

    const firstFrameContent = content.filter(item => (
      item.type === 'text'
      || (item.type === 'image_url' && item.role === 'first_frame')
    ));
    const promptOptimizer = boolean(input.promptOptimizer ?? input.prompt_optimizer, true);
    const fastPretreatment = boolean(input.fastPretreatment ?? input.fast_pretreatment, false);
    const aigcWatermark = boolean(
      input.aigcWatermark ?? input.aigc_watermark ?? input.watermark,
      false,
    );

    return {
      model: String(input.model || defaultModel).trim(),
      content: firstFrameContent,
      resolution: capabilities.resolutions[0],
      duration: capabilities.durationMin,
      prompt_optimizer: promptOptimizer,
      fast_pretreatment: fastPretreatment,
      aigc_watermark: aigcWatermark,
    };
  }

  if (!content.length || !content.some(item => item.type === 'text')) {
    throw new Error('海螺 H3 目前需要填写文本提示词。');
  }

  const resolution = normalizeResolution(
    input.resolution || input.metadata?.parameters?.resolution,
    capabilities,
  );
  const duration = normalizeDuration(input.duration, capabilities);
  const ratio = normalizeRatio(input.ratio, capabilities);

  return {
    model: String(input.model || defaultModel).trim(),
    content,
    resolution,
    duration,
    ratio,
  };
}

export function normalizeVideoPayload(input = {}) {
  const prompt = String(input.prompt || input.text || '').trim();
  const model = String(input.model || defaultModel).trim();
  const capabilities = modelCapabilities(model);
  const hasStructuredContent = Array.isArray(input.content) && input.content.length > 0;
  const hasResourceInput = [
    input.firstFrameUrl,
    input.first_frame_url,
    input.lastFrameUrl,
    input.last_frame_url,
    input.referenceImageUrls,
    input.reference_image_urls,
    input.referenceImageUrl,
    input.reference_image_url,
    input.referenceVideoUrls,
    input.reference_video_urls,
    input.referenceVideoUrl,
    input.reference_video_url,
    input.referenceAudioUrls,
    input.reference_audio_urls,
    input.referenceAudioUrl,
    input.reference_audio_url,
    input.draftTaskId,
    input.draft_task_id,
  ].some(value => Array.isArray(value) ? value.length > 0 : String(value || '').trim());

  if (!prompt && !hasStructuredContent && (!capabilities.family || !hasResourceInput)) {
    throw new Error('请先填写提示词。');
  }
  if (!capabilities.family) return legacyPayload(input, prompt);
  if (['hailuo-2.3-fast', 'hailuo-h3'].includes(capabilities.family)) {
    return hailuoPayload(input, prompt, capabilities);
  }

  let duration = normalizeDuration(input.duration, capabilities);
  const frames = normalizeFrames(input.frames);
  let ratio = normalizeRatio(input.ratio, capabilities);
  let resolution = normalizeResolution(
    input.resolution || input.metadata?.parameters?.resolution,
    capabilities,
  );
  const promptExtend = boolean(input.promptExtend ?? input.prompt_extend, true);
  const generateAudio = boolean(input.generateAudio ?? input.generate_audio, true);
  const watermark = boolean(input.watermark, false);
  let returnLastFrame = boolean(input.returnLastFrame ?? input.return_last_frame, false);
  let draft = boolean(input.draft, false);
  let serviceTier = input.serviceTier === 'flex' || input.service_tier === 'flex' ? 'flex' : 'default';
  const outputFormat = input.outputFormat === 'mov' || input.output_format === 'mov' ? 'mov' : 'mp4';
  const omniReferenceTaskType = ['auto', 'reference', 'edit', 'extend'].includes(
    input.omniReferenceTaskType || input.omni_reference_task_type,
  )
    ? (input.omniReferenceTaskType || input.omni_reference_task_type)
    : 'auto';
  const callback = callbackUrl(input.callbackUrl || input.callback_url);
  const executionExpiresAfter = Math.min(
    Math.max(
      integer(input.executionExpiresAfter ?? input.execution_expires_after, defaultExecutionExpiresAfter),
      3600,
    ),
    259200,
  );
  const priority = Math.min(Math.max(integer(input.priority, 0), 0), 9);
  const seed = normalizeSeed(input.seed);
  const safetyIdentifier = normalizeSafetyIdentifier(input.safetyIdentifier || input.safety_identifier);
  const content = normalizeContent(input, prompt, capabilities, omniReferenceTaskType);

  const hasFirstFrame = content.some(item => item.type === 'image_url' && item.role === 'first_frame');
  const hasLastFrame = content.some(item => item.type === 'image_url' && item.role === 'last_frame');
  const hasReferenceVideo = content.some(item => item.type === 'video_url');
  const hasReferenceAudio = content.some(item => item.type === 'audio_url');
  const hasVisualReference = content.some(item => (
    item.type === 'image_url' || item.type === 'video_url'
  ));
  const hasReferenceAsset = content.some(item => (
    item.type === 'image_url'
    || item.type === 'video_url'
    || item.type === 'audio_url'
  ));

  if (!content.length) throw new Error('请填写提示词或添加创作素材。');
  if (hasLastFrame && !hasFirstFrame) throw new Error('尾帧图片需要同时提供首帧图片。');
  if (hasReferenceAudio && !hasVisualReference && !capabilities.supportsAudioOnlyReference) {
    throw new Error('当前 Seedance 版本的参考音频需要同时提供参考图片或参考视频。');
  }
  if (capabilities.supportsOmniReferenceTaskType && omniReferenceTaskType === 'reference' && !hasReferenceAsset) {
    throw new Error('基于素材创作需要至少添加一项图片、视频或音频素材。');
  }
  if (capabilities.supportsOmniReferenceTaskType && ['edit', 'extend'].includes(omniReferenceTaskType) && !hasReferenceVideo) {
    throw new Error('视频编辑或延展需要添加参考视频。');
  }

  if (capabilities.supportsOmniReferenceTaskType && ['edit', 'extend'].includes(omniReferenceTaskType)) {
    ratio = 'adaptive';
  }
  if (capabilities.supportsOmniReferenceTaskType && omniReferenceTaskType === 'edit') {
    duration = -1;
  }
  if (capabilities.supportsDraft && draft) {
    resolution = '480p';
    returnLastFrame = false;
    serviceTier = 'default';
  }

  const payload = {
    model,
    prompt,
    content,
    resolution,
    ratio,
    watermark,
    return_last_frame: capabilities.supportsReturnLastFrame ? returnLastFrame : false,
    execution_expires_after: executionExpiresAfter,
    callback_url: callback || undefined,
    safety_identifier: safetyIdentifier || undefined,
    metadata: {
      parameters: {
        resolution: resolution.toUpperCase(),
        ratio,
        prompt_extend: promptExtend,
        generate_audio: capabilities.supportsAudio ? generateAudio : false,
        watermark,
        return_last_frame: capabilities.supportsReturnLastFrame ? returnLastFrame : false,
        execution_expires_after: executionExpiresAfter,
      },
    },
  };

  if (frames !== undefined && capabilities.supportsFrames) {
    payload.frames = frames;
    payload.metadata.parameters.frames = frames;
  } else {
    payload.duration = duration;
    payload.metadata.parameters.duration = duration;
  }

  if (capabilities.supportsAudio) {
    payload.generate_audio = generateAudio;
  }
  if (capabilities.supportsOutputFormat) {
    payload.output_format = outputFormat;
    payload.metadata.parameters.output_format = outputFormat;
  }
  if (capabilities.supportsSeed && seed !== undefined) {
    payload.seed = seed;
    payload.metadata.parameters.seed = seed;
  }
  if (capabilities.supportsCameraFixed) {
    payload.camera_fixed = boolean(input.cameraFixed ?? input.camera_fixed, false);
    payload.metadata.parameters.camera_fixed = payload.camera_fixed;
  }
  if (capabilities.supportsDraft) {
    payload.draft = draft;
    payload.metadata.parameters.draft = draft;
  }
  if (capabilities.supportsFlex) {
    payload.service_tier = serviceTier;
    payload.metadata.parameters.service_tier = serviceTier;
  } else {
    payload.service_tier = 'default';
    payload.metadata.parameters.service_tier = 'default';
  }
  if (capabilities.supportsPriority) {
    payload.priority = priority;
    payload.metadata.parameters.priority = priority;
  }
  if (capabilities.supportsOmniReferenceTaskType) {
    payload.omni_reference_task_type = omniReferenceTaskType;
    payload.metadata.parameters.omni_reference_task_type = omniReferenceTaskType;
  }
  if (callback) payload.metadata.parameters.callback_url = callback;
  if (safetyIdentifier) payload.metadata.parameters.safety_identifier = safetyIdentifier;

  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
}
