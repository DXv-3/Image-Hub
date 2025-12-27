export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export type ResultType = 'image' | 'video' | 'text';

export interface GenerationResult {
  type: ResultType;
  content: string; // URL for image/video, text for analysis
  error: string | null;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface PromptHistoryItem {
  id: string;
  text: string;
  timestamp: number;
}

export enum AppMode {
  COMPOSITE = 'COMPOSITE',
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ANIMATE = 'ANIMATE',
  ANALYZE = 'ANALYZE',
  CULINARY = 'CULINARY',
  REASON = 'REASON',
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';
