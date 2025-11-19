export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface LanguageConfig {
  language: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  topic: string;
}

export interface AudioVisualizerState {
  inputLevel: number;
  outputLevel: number;
}
