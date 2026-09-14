const defaultModel = 'doubao-seedance-2-0-fast-260128';
const defaultDuration = 5;
const defaultResolution = '720p';
const defaultRatio = '16:9';
const defaultExecutionExpiresAfter = 172800;

const resolutionAliases = {
  '480P': '480p',
  '720P': '720p',
  '1080P': '1080p',
  '4K': '4k',
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
  if (/seedance[-.]?2[-.]?5/.test(value)) return '2.5';
  if (/seedance[-.]?2[-.]?0/.test(value)) return '2.0';
  if (/seedance[-.]?1[-.]?5/.test(value)) return '1.5';
  if (/seedance[-.]?1[-.]?0/.test(value)) return '1.0';
  return '';
}

function modelCapabilities(model) {
  const family = modelFamily(model);
  const value = String(model || '').toLowerCase();

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
    if (ratio === 'adaptive' && capabilities.family === '1.0') return defaultRatio;
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

function normalizeContent(input, prompt) {
  const providedContent = Array.isArray(input.content)
    ? input.content.map(normalizeContentItem).filter(Boolean)
    : [];
  if (providedContent.length) return providedContent;

  const content = [];
  if (prompt) content.push({ type: 'text', text: prompt });

  splitResources(input.firstFrameUrl || input.first_frame_url)
    .forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'first_frame' }));
  splitResources(input.lastFrameUrl || input.last_frame_url)
    .forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'last_frame' }));
  splitResources(input.referenceImageUrls || input.reference_image_urls || input.referenceImageUrl || input.reference_image_url)
    .forEach(url => content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' }));
  splitResources(input.referenceVideoUrls || input.reference_video_urls || input.referenceVideoUrl || input.reference_video_url)
    .forEach(url => content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' }));
  splitResources(input.referenceAudioUrls || input.reference_audio_urls || input.referenceAudioUrl || input.reference_audio_url)
    .forEach(url => content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' }));

  const draftTaskId = String(input.draftTaskId || input.draft_task_id || '').trim();
  if (draftTaskId) {
    content.push({ type: 'draft_task', draft_task: { id: draftTaskId } });
  }

  return content;
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

export function normalizeVideoPayload(input = {}) {
  const prompt = String(input.prompt || input.text || '').trim();
  if (!prompt && !Array.isArray(input.content)) throw new Error('请先填写提示词。');

  const model = String(input.model || defaultModel).trim();
  const capabilities = modelCapabilities(model);
  if (!capabilities.family) return legacyPayload(input, prompt);

  const duration = normalizeDuration(input.duration, capabilities);
  const frames = normalizeFrames(input.frames);
  const ratio = normalizeRatio(input.ratio, capabilities);
  const resolution = normalizeResolution(
    input.resolution || input.metadata?.parameters?.resolution,
    capabilities,
  );
  const promptExtend = boolean(input.promptExtend ?? input.prompt_extend, true);
  const generateAudio = boolean(input.generateAudio ?? input.generate_audio, true);
  const watermark = boolean(input.watermark, false);
  const returnLastFrame = boolean(input.returnLastFrame ?? input.return_last_frame, false);
  const draft = boolean(input.draft, false);
  const serviceTier = input.serviceTier === 'flex' || input.service_tier === 'flex' ? 'flex' : 'default';
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
  const content = normalizeContent(input, prompt);

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
