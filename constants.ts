import { ActionType, MusicTrack } from './types';

// Icons using SVG paths
export const ICONS = {
  UPLOAD: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  ENHANCE: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  RESTORE: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  SHARPEN: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  COLORIZE: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  BW: "M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z M16 8L2 22 M17.5 15H9",
  REMOVE_GLARE: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  REMOVE_SHADOWS: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  REPAIR_DAMAGES: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  BRIGHTNESS: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707",
  SATURATION: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343",
  ANIMATE: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  DOWNLOAD: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  CLOSE: "M6 18L18 6M6 6l12 12",
  MUSIC: "M9 19V6l12-3v13M9 10l12-3",
  PROFESSIONAL_MALE: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M12 14c-1.5 0-3 .5-3 2h6c0-1.5-1.5-2-3-2z",
  PROFESSIONAL_FEMALE: "M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.418 0 8 1.79 8 4v2H4v-2c0-2.21 3.582-4 8-4z",
  PASTEL_BG: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
};

export const ACTION_PROMPTS: Record<ActionType, string> = {
  [ActionType.ENHANCE]: "Enhance this image significantly. Improve lighting, resolution, and overall quality while maintaining the original subject and composition. Output a high-quality version of the input.",
  [ActionType.RESTORE]: "Restore this image. Remove noise, blur, and general degradation. Fix faces and details while keeping the original look intact. Output a clean, high-quality version.",
  [ActionType.REPAIR_DAMAGES]: "Repair this photo by removing white spots, dust particles, paper scratches, creases, and tears. Smooth out the texture where the damage was, ensuring the underlying details are reconstructed perfectly.",
  [ActionType.SHARPEN]: "Sharpen this image. Increase edge definition and clarity without adding artifacts. Make the details pop.",
  [ActionType.COLORIZE]: "Colorize this image. If it is black and white, add natural and realistic colors. If it is already colored, correct the color balance to look professional and vibrant.",
  [ActionType.BLACK_AND_WHITE]: "Convert this image to artistic black and white. Ensure high contrast and dramatic lighting where appropriate, suitable for professional photography.",
  [ActionType.REMOVE_GLARE]: "Remove glare, flash reflections, and white glossy paper artifacts from this photo. The image is likely a scan or a photo. Reconstruct the underlying details obscured by the light reflection.",
  [ActionType.REMOVE_SHADOWS]: "Remove cast shadows from this image. Even out the lighting to eliminate harsh shadows caused by objects or subjects, making the lighting look soft and uniform while preserving details.",
  [ActionType.INCREASE_BRIGHTNESS]: "Increase the brightness of this image. Fix underexposed areas and make the lighting look natural and balanced, without washing out the highlights.",
  [ActionType.INCREASE_SATURATION]: "Increase the vibrancy and saturation of this image. Make the colors look rich and lively, but keep skin tones natural. Fix dull or washed-out colors.",
  [ActionType.ANIMATE]: "Apply cinematic camera motion to this image. Add subtle depth and movement to the environment and background. Make the scene feel alive and dynamic. 5 seconds duration. Keep it realistic.",
  [ActionType.PROFESSIONAL_HEADSHOT_MALE]: "Transform this selfie into a high-end professional LinkedIn headshot for a man. 1) Replace current clothing with a professional navy or charcoal business suit, white shirt, and silk tie (or modern smart casual blazer). 2) Change the background to a blurred modern office setting or neutral professional gradient. 3) Correct the camera angle to be eye-level. 4) Apply studio-quality lighting. Maintain facial identity 100%.",
  [ActionType.PROFESSIONAL_HEADSHOT_FEMALE]: "Transform this selfie into a high-end professional LinkedIn headshot for a woman. 1) Replace current clothing with a professional executive blazer, elegant business blouse, or structured dress. 2) Change the background to a blurred modern office setting or soft neutral gradient. 3) Correct the camera angle to be eye-level. 4) Apply studio-quality lighting. Maintain facial identity 100%.",
  [ActionType.PASTEL_BACKGROUND]: "Remove the current background and replace it with a clean, solid, soft pastel color. Choose from: cream (maize), soft off-white, or very light pearl gray. Ensure the subject is perfectly isolated/cut out and the edges are smooth. The lighting on the subject should blend naturally with the new light background."
};

// Using public domain / creative commons samples for demo purposes
export const MUSIC_OPTIONS: MusicTrack[] = [
  { id: 'nostalgic', name: 'Nostalgic Piano', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3' },
  { id: 'cinematic', name: 'Cinematic Swell', url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5174092b7c.mp3' },
  { id: 'happy', name: 'Upbeat Happy', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
  { id: 'lofi', name: 'Lo-Fi Chill', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'classical', name: 'Soft Strings', url: 'https://cdn.pixabay.com/download/audio/2022/09/17/audio_24849647d3.mp3' }
];