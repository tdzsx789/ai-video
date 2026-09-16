// Keep provider definitions available while hiding integrations that are not ready.
export const VIDEO_PROVIDER_ENABLED = Object.freeze({
  seedance: true,
  kling: false,
  hailuo: true,
});

export function isVideoProviderEnabled(provider) {
  return VIDEO_PROVIDER_ENABLED[String(provider || '').trim()] !== false;
}
