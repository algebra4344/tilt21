import { expect } from 'chai';

import type { PokerCard, SeatState, TableState } from '../../src/poker/types';
import {
  CATEGORY_NAMES,
  advanceStreet,
  applyAction,
  awardPots,
  evaluateHand,
  firstToAct,
  getCallAmount,
  getRaiseCommitted,
  handString,
  nextToAct,
} from '../../src/poker/engine';

const card = (rank: string, suit: PokerCard['suit'], id?: string): PokerCard => ({
  id: id ?? `${rank}${suit}`,
  suit,
  rank,
  showingFace: false,
});

const seat = (seatIndex: number, overrides: Partial<SeatState> = {}): SeatState => ({
  seatIndex,
  position: seatIndex === 0 ? 'BTN' : seatIndex === 1 ? 'SB' : 'BB',
  name: `P${seatIndex}`,
  holeCards: [card('A', 's'), card('K', 'h')],
  stack: 10000,
  totalCommitted: 0,
  folded: false,
  isHuman: false,
  isDealer: false,
  isActive: false,
  playerId: null,
  ...overrides,
});

const table = (seats: SeatState[], overrides: Partial<TableState> = {}): TableState => ({
  seats,
  board: [],
  street: 'preflop',
  pot: 0,
  currentBet: 0,
  minRaise: 0,
  streetBets: new Array(seats.length).fill(0),
  acted: new Array(seats.length).fill(false),
  dealerIndex: 0,
  activePlayerIndex: -1,
  bigBlind: 100,
  smallBlind: 50,
  handComplete: false,
  winnerIndex: null,
  ...overrides,
});

describe('poker engine', function () {
  describe('handString', function () {
    it('formats pairs, suited and offsuit hands', function () {
      expect(handString([card('A', 's'), card('A', 'h')])).to.equal('AA');
      expect(handString([card('A', 's'), card('K', 's')])).to.equal('AKs');
      expect(handString([card('K', 'h'), card('A', 'd')])).to.equal('AKo');
    });
  });

  describe('applyAction', function () {
    it('commits a full raise and reopens betting with a new minRaise', function () {
      const t = table([seat(0), seat(1), seat(2)], { currentBet: 100, minRaise: 200 });
      const next = applyAction(t, 0, 'raise', 300);
      expect(next.streetBets[0]).to.equal(300);
      expect(next.seats[0].stack).to.equal(9700);
      expect(next.currentBet).to.equal(300);
      expect(next.minRaise).to.equal(500);
    });

    it('does not reopen betting on a short all-in below min raise', function () {
      const t = table([seat(0, { stack: 150 }), seat(1), seat(2)], {
        currentBet: 100,
        minRaise: 200,
      });
      const next = applyAction(t, 0, 'raise', 150);
      expect(next.streetBets[0]).to.equal(150);
      expect(next.seats[0].stack).to.equal(0);
      expect(next.currentBet).to.equal(100);
    });

    it('completes the hand when a fold leaves one player', function () {
      const t = table([seat(0), seat(1), seat(2, { folded: true })], {
        currentBet: 100,
      });
      const next = applyAction(t, 1, 'fold', 0);
      expect(next.handComplete).to.equal(true);
      expect(next.winnerIndex).to.equal(0);
    });

    it('clamps committed chips to the seat stack', function () {
      const t = table([seat(0, { stack: 80 }), seat(1), seat(2)], { currentBet: 100 });
      const next = applyAction(t, 0, 'call', 100);
      expect(next.streetBets[0]).to.equal(80);
      expect(next.seats[0].stack).to.equal(0);
    });
  });

  describe('getCallAmount / getRaiseCommitted', function () {
    it('returns exact call amounts and clamps raises to legal bounds', function () {
      const t = table([seat(0, { stack: 450 }), seat(1), seat(2)], {
        currentBet: 200,
        minRaise: 400,
        streetBets: [50, 50, 50],
      });
      expect(getCallAmount(t, 0)).to.equal(150);
      expect(getRaiseCommitted(t, 0, 400)).to.equal(350); // legal min raise to 400
      expect(getRaiseCommitted(t, 0, 900)).to.equal(450); // capped at all-in (50 + 450)
    });
  });

  describe('nextToAct', function () {
    it('gives the big blind its option after limps, then closes the street', function () {
      // dealerIndex 0 -> seats are BTN/SB/BB; preflop action starts on the BTN.
      const t = table([seat(0), seat(1), seat(2)], {
        currentBet: 100,
        streetBets: [0, 50, 100],
        activePlayerIndex: -1,
      });
      expect(firstToAct('preflop', 0, 3)).to.equal(0);

      let state = applyAction(t, 0, 'call', 100); // BTN limps
      expect(nextToAct(state)).to.equal(1);
      state = applyAction(state, 1, 'call', 50); // SB completes
      expect(state.streetBets).to.deep.equal([100, 100, 100]);
      expect(nextToAct(state)).to.equal(2); // BB still has its option
      state = applyAction(state, 2, 'call', 0); // BB checks
      expect(nextToAct(state)).to.equal(-1); // street complete
    });

    it('skips folded and all-in seats', function () {
      const t = table(
        [
          seat(0),
          seat(1, { folded: true }),
          seat(2, { stack: 0 }),
        ],
        { currentBet: 200, streetBets: [0, 200, 200], acted: [false, true, true] },
      );
      expect(nextToAct(t)).to.equal(0);
    });
  });

  describe('advanceStreet', function () {
    it('deals a burned flop, resets street state and sets postflop order', function () {
      const deck = ['2c', '3c', '4c', '5c', '6c'].map((id) =>
        card(id[0].toUpperCase(), 'c', id),
      );
      const deckLen = deck.length;
      const t = table([seat(0), seat(1), seat(2)], {
        currentBet: 100,
        minRaise: 200,
        pot: 300,
        streetBets: [100, 100, 100],
        acted: [true, true, true],
      });
      const { state: next, dealt } = advanceStreet(t, deck);

      expect(next.street).to.equal('flop');
      expect(dealt).to.have.lengthOf(3);
      expect(next.board).to.have.lengthOf(3);
      expect(deck).to.have.lengthOf(deckLen - 4); // burn + 3
      dealt.forEach((c) => expect(c.showingFace).to.equal(true));
      expect(next.streetBets).to.deep.equal([0, 0, 0]);
      expect(next.acted).to.deep.equal([false, false, false]);
      expect(next.currentBet).to.equal(0);
      expect(next.minRaise).to.equal(0);
      expect(next.activePlayerIndex).to.equal(firstToAct('flop', 0, 3) - 1);
      expect(next.activePlayerIndex).to.equal(0); // SB first postflop
      expect(next.pot).to.equal(300); // pot unchanged
    });

    it('deals one turn card then one river card', function () {
      const deck = ['2c', '3c', '4c', '5c', '6c', '7c', '8c'].map((id) =>
        card(id[0].toUpperCase(), 'c', id),
      );
      const flop = ['2d', '3d', '4d'].map((id) => card(id[0].toUpperCase(), 'd', id));
      let state = table([seat(0), seat(1), seat(2)], { street: 'flop', board: flop });
      state = advanceStreet(state, deck).state;
      expect(state.street).to.equal('turn');
      expect(state.board).to.have.lengthOf(4);
      state = advanceStreet(state, deck).state;
      expect(state.street).to.equal('river');
      expect(state.board).to.have.lengthOf(5);
      // River is terminal: no change, no cards
      const before = deck.length;
      const result = advanceStreet(state, deck);
      expect(result.state).to.equal(state);
      expect(result.dealt).to.have.lengthOf(0);
      expect(deck).to.have.lengthOf(before);
    });
  });

  describe('awardPots', function () {
    it('refunds uncalled bets to the bettor', function () {
      const t = table([
        seat(0, { totalCommitted: 500 }),
        seat(1, { totalCommitted: 100, folded: true }),
        seat(2, { totalCommitted: 200, folded: true }),
      ]);
      const { awards } = awardPots(t);
      expect(awards.get(0)).to.equal(800); // entire pot returns to seat 0
      expect(awards.get(1)).to.equal(undefined);
      expect(awards.get(2)).to.equal(undefined);
    });

    it('builds side pots across all-in levels by hand strength', function () {
      const board = [card('A', 'd'), card('K', 'd'), card('Q', 'd'), card('J', 'd'), card('T', 'd')];
      const t = table(
        [
          // Both non-folded players hold the royal flush -> chop every level.
          seat(0, { totalCommitted: 1000, holeCards: [card('9', 'd'), card('8', 'd')] }),
          seat(1, { totalCommitted: 300, folded: true }),
          seat(2, { totalCommitted: 1000, holeCards: [card('7', 'd'), card('6', 'd')] }),
        ],
        { board },
      );
      const { awards } = awardPots(t);
      expect(awards.get(0)! + awards.get(2)!).to.equal(2300);
      expect(awards.get(0)).to.equal(1150);
      expect(awards.get(2)).to.equal(1150);
      expect(awards.has(1)).to.equal(false);
    });

    it('gives an uneven chopped pot remainder to the first listed winner', function () {
      const board = [card('A', 'd'), card('K', 'h'), card('Q', 'c'), card('2', 's'), card('3', 'd')];
      const hole = [card('A', 's'), card('2', 'h')]; // pair of aces w/ A2345-ish kicker
      const t = table([
        seat(0, { totalCommitted: 101, holeCards: [...hole] }),
        seat(1, { totalCommitted: 101, holeCards: [card('A', 'c'), card('2', 'd')] }),
        seat(2, { totalCommitted: 101, holeCards: [card('A', 'h'), card('2', 'c')] }),
      ], { board });
      const { awards } = awardPots(t);
      const total = (awards.get(0) ?? 0) + (awards.get(1) ?? 0) + (awards.get(2) ?? 0);
      expect(total).to.equal(303);
      expect(Math.max(...[...awards.values()]) - Math.min(...[...awards.values()])).to.be.at.most(1);
    });
  });

  describe('evaluateHand', function () {
    it('ranks hand categories correctly', function () {
      const royal = ['A', 'K', 'Q', 'J', 'T'].map((r) => card(r, 's'));
      const quads = [card('9', 's'), card('9', 'h'), card('9', 'd'), card('9', 'c'), card('2', 's')];
      const wheel = [card('A', 's'), card('2', 'h'), card('3', 'd'), card('4', 'c'), card('5', 's')];
      expect(evaluateHand(royal).cat).to.equal(9);
      expect(CATEGORY_NAMES[evaluateHand(royal).cat]).to.equal('Royal flush');
      expect(evaluateHand(quads).cat).to.equal(7);
      expect(evaluateHand(wheel).cat).to.equal(4); // wheel counts as a straight
      expect(evaluateHand(royal).score).to.be.greaterThan(evaluateHand(quads).score);
    });
  });
});

describe('buildTableFromSeats', function () {
  const { createDeck, buildTableFromSeats } = require('../../src/poker/engine');

  it('deals to named seats and posts blinds only for stacked players', function () {
    const deck = createDeck();
    const t = buildTableFromSeats(
      0,
      [
        { name: 'Host', playerId: 'host-1', stack: 2000 },
        { name: 'Friend', playerId: 'guest-2', stack: 1500 },
        { name: 'Busted', playerId: null, stack: 0 },
      ],
      50,
      100,
      deck,
    );
    expect(t.seats.map((s) => s.position)).to.deep.equal(['BTN', 'SB', 'BB']);
    expect(t.seats[2].folded).to.equal(true); // busted player sits out
    expect(t.seats[2].holeCards).to.have.lengthOf(2);
    expect(t.seats[1].streetBets ?? t.streetBets[1]).to.equal(50); // SB posted
    expect(t.streetBets[1]).to.equal(50);
    expect(t.streetBets[0]).to.equal(0);
    expect(t.currentBet).to.equal(100);
    expect(t.seats[0].playerId).to.equal('host-1');
    expect(t.seats.every((s) => s.isHuman === false)).to.equal(true);
    expect(deck.length).to.equal(52 - 6);
  });
});

describe('awardByRanking', function () {
  const { awardByRanking, awardPots } = require('../../src/poker/engine');
  const board = [card('A', 'd'), card('K', 'h'), card('Q', 'c'), card('2', 's'), card('3', 'd')];

  it('gives the whole pot (incl. folded dead money) to the champion', function () {
    const t = table([
      seat(0, { totalCommitted: 100 }),
      seat(1, { totalCommitted: 100 }),
      seat(2, { totalCommitted: 100, folded: true }),
    ], { board });
    const { awards } = awardByRanking(t, [[1]]);
    expect(awards.get(1)).to.equal(300);
    expect(awards.has(0)).to.equal(false);
  });

  it('chops evenly when two seats share first place', function () {
    const t = table([
      seat(0, { totalCommitted: 101 }),
      seat(1, { totalCommitted: 101 }),
    ], { board });
    const { awards } = awardByRanking(t, [[1, 0]]);
    expect(awards.get(0)).to.equal(101);
    expect(awards.get(1)).to.equal(101);
  });

  it('handles side pots: short stack cannot win deeper chips', function () {
    // Seat 0 all-in for 300; seats 1 & 2 committed 900 each; seat 1 is champion.
    const t = table([
      seat(0, { totalCommitted: 300 }),
      seat(1, { totalCommitted: 900 }),
      seat(2, { totalCommitted: 900 }),
    ], { board });
    const { awards } = awardByRanking(t, [[1]]);
    expect(awards.get(1)).to.equal(2100);
    expect(awards.get(2)).to.equal(undefined);
    expect(awards.get(0)).to.equal(undefined);
  });

  it('awards a side pot to the runner-up placement', function () {
    const t = table([
      seat(0, { totalCommitted: 500 }),
      seat(1, { totalCommitted: 1000 }),
      seat(2, { totalCommitted: 1000 }),
    ], { board });
    const { awards } = awardByRanking(t, [[2], [0]]);
    // Level 500: all three contend -> champion seat 2 takes 1500.
    // Level 1000: seats 1&2 contend -> champion still seat 2 takes 1000.
    expect(awards.get(2)).to.equal(2500);
    expect(awards.has(0)).to.equal(false);
    expect(awards.has(1)).to.equal(false);

    // Runner-up shape: champion folds out of contention is impossible, so
    // instead rank seat 1 second and make seat 2 absent from deeper level.
    const t2 = table([
      seat(0, { totalCommitted: 500 }),
      seat(1, { totalCommitted: 1000 }),
      seat(2, { totalCommitted: 500 }),
    ], { board });
    const r2 = awardByRanking(t2, [[0], [2]]);
    // Level 500: contenders 0/1/2 -> seat 0 takes 1500.
    // Level 1000: only seat 1 committed deeper -> its unmatched 500 refunds.
    expect(r2.awards.get(0)).to.equal(1500);
    expect(r2.awards.get(1)).to.equal(500);
  });

  it('keeps an odd three-way chop within one chip of even', function () {
    const t = table([
      seat(0, { totalCommitted: 34 }),
      seat(1, { totalCommitted: 34 }),
      seat(2, { totalCommitted: 33 }),
    ], { board });
    const { awards } = awardByRanking(t, [[0, 1, 2]]);
    const total = [...awards.values()].reduce((a, b) => a + b, 0);
    expect(total).to.equal(101);
    expect(Math.max(...[...awards.values()]) - Math.min(...[...awards.values()])).to.be.at.most(1);
  });

  it('matches awardPots when placements agree with hand strength', function () {
    const royalBoard = [card('A', 'd'), card('K', 'd'), card('Q', 'd'), card('J', 'd'), card('T', 'd')];
    const t = table([
      seat(0, { totalCommitted: 400, holeCards: [card('9', 'd'), card('8', 'd')] }),
      seat(1, { totalCommitted: 400, folded: true }),
      seat(2, { totalCommitted: 400, holeCards: [card('7', 'd'), card('6', 'd')] }),
    ], { board: royalBoard });
    const byHand = awardPots(t).awards;
    const byRank = awardByRanking(t, [[0, 2]]).awards;
    expect(byRank.get(0)).to.equal(byHand.get(0));
    expect(byRank.get(2)).to.equal(byHand.get(2));
  });
});
