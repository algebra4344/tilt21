# Card Table Core

Game engine for blackjack and Texas Hold'em poker. Powers the tilt21 multiplayer platform.

## Features

- **Blackjack**: Hi-Lo card counting, basic strategy checker, Illustrious 18 deviations, multi-deck support (1/2/6+), simulator mode
- **Texas Hold'em**: Full hand evaluation (royal flush through high card), preflop ranges (open/3-bet/raise), bot AI, 6/9 player support
- **Zero runtime dependencies** — runs in any JS/TS environment (Node, browser, React Native)
- **Multi-core simulation** in Node via worker threads

## Install

```sh
npm install @tilt21/core
```

## Usage

### Blackjack — Simulator

```ts
import { Simulator } from '@tilt21/core';

const settings = {
  hands: 10_000_000,
  playerStrategy: 'basic-strategy-i18-fab4',
  deckCount: 2,
  hitSoft17: true,
  penetration: 0.75,
};

const result = new Simulator(settings).run();
// { amountEarned, handsPlayed, handsWon, handsLost, riskOfRuin, ... }
```

### Blackjack — Game Mode

```ts
import { Game, Event, GameStep } from '@tilt21/core';

const settings = { mode: 'default', deckCount: 2 };
const game = new Game(settings);

game.on(Event.Change, (name, value) => state[name] = value);
game.on(Event.Shuffle, () => console.log('Cards shuffled'));

const step = game.step(input);
```

### Poker — Hand Evaluation

```ts
import { evaluateHands } from '@tilt21/core';

const result = evaluateHands([
  { cards: ['Ah', 'Kd', 'Qc', 'Js', '10s'] },  // Royal flush
  { cards: ['9h', '9d', '9c', '2s', '7h'] },      // Three of a kind
]);
// [{ rank: 'royalFlush', ... }, { rank: 'threeOfAKind', ... }]
```

## Performance

Tested on Apple M2 Max, Node v24.3, default 2-deck H17 settings.

| Cores | Hands | Time | Hands/sec |
|---|---|---|---|
| 1 | 100M | ~53s | ~1.9M |
| 4 | 1B | ~134s | ~7.5M |
| 12 | 1B | ~65s | ~15M |

## License

MIT
