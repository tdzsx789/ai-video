// The current upstream account returns HTTP 402 for Gemini image generation.
export const IMAGE_PROVIDER_ENABLED = Object.freeze({
  'gpt-image': true,
  'gemini-nano-banana': false,
});

export function isImageProviderEnabled(provider) {
  return IMAGE_PROVIDER_ENABLED[String(provider || '').trim()] !== false;
}
