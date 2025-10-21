export interface Track {
  id: string;
  title?: string;
  audioFile: File | null;
  imageFile: File | null;
}

export interface Preset {
  name: string;
  width: number;
  height: number;
  fps: number;
}

export const PRESETS: Preset[] = [
  { name: '1920x1080 @ 30fps (Landscape)', width: 1920, height: 1080, fps: 30 },
  { name: '1080x1080 @ 30fps (Square)', width: 1080, height: 1080, fps: 30 },
  { name: '1080x1920 @ 30fps (Portrait)', width: 1080, height: 1920, fps: 30 },
];
