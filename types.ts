export enum ActionType {
  ENHANCE = 'ENHANCE',
  RESTORE = 'RESTORE',
  SHARPEN = 'SHARPEN',
  COLORIZE = 'COLORIZE',
  BLACK_AND_WHITE = 'BLACK_AND_WHITE',
  REMOVE_GLARE = 'REMOVE_GLARE',
  REMOVE_SHADOWS = 'REMOVE_SHADOWS',
  REPAIR_DAMAGES = 'REPAIR_DAMAGES',
  INCREASE_BRIGHTNESS = 'INCREASE_BRIGHTNESS',
  INCREASE_SATURATION = 'INCREASE_SATURATION',
  ANIMATE = 'ANIMATE',
  PROFESSIONAL_HEADSHOT_MALE = 'PROFESSIONAL_HEADSHOT_MALE',
  PROFESSIONAL_HEADSHOT_FEMALE = 'PROFESSIONAL_HEADSHOT_FEMALE',
  PASTEL_BACKGROUND = 'PASTEL_BACKGROUND'
}

export enum ExportFormat {
  ORIGINAL = 'original',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp'
}

export interface ProcessingState {
  isLoading: boolean;
  statusMessage: string;
  progress?: number; // 0-100
}

export interface EditedResult {
  type: 'image' | 'video';
  dataUrl: string; // Base64 or Blob URL
  mimeType: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string; // URL to mp3 file
}