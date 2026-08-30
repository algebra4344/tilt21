import Game, { settings } from './game';
import { Event } from './event-emitter';
import Simulator from './simulator';
import PlayerInputReader from './browser/player-input-reader';
import {
  GameStep,
  GameMode,
  Move,
  PlayerStrategy,
  BlackjackPayout,
  HandWinner,
} from './types';
import type { GameSettings } from './game';

export * from './poker';

export {
  Game,
  Event,
  Simulator,
  PlayerInputReader,
  GameStep,
  GameMode,
  Move,
  PlayerStrategy,
  BlackjackPayout,
  HandWinner,
  settings as gameSettings,
};
export type { GameSettings };
