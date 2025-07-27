export enum GameState {
  Start,
  Loading,
  Playing,
  Won,
  Lost,
  Error,
}

export interface Question {
  question: string;
  correctAnswer: string;
  incorrectAnswer: string;
}
