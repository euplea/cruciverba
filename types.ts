
export enum Difficulty {
  EASY = 'facile',
  MEDIUM = 'medio',
  HARD = 'difficile'
}

export type Topic = 'Musica Italiana' | 'Hits Internazionali' | 'Storia' | 'Geografia' | 'Cronaca Recente' | 'Cultura Generale' | 'Custom';

export interface RawEntry {
  word: string;
  clue: string;
  hint?: string;
}

export interface PlacedEntry extends RawEntry {
  x: number;
  y: number;
  direction: 'H' | 'V';
  number: number;
}

export interface GridCell {
  char: string | null;
  isBlack: boolean;
  number?: number;
  userInput: string;
  solutionVisible: boolean;
  isCorrect?: boolean;
}

export interface CrosswordData {
  grid: GridCell[][];
  entries: PlacedEntry[];
  size: number;
  topic: string;
  difficulty: Difficulty;
}

export interface PrintConfig {
  format: 'A4' | 'A3';
  showSolution: boolean;
}
