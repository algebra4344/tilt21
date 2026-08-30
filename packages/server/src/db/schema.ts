import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  real,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  chips: integer('chips').notNull().default(10000),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  handsWon: integer('hands_won').notNull().default(0),
  handsLost: integer('hands_lost').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gameRooms = pgTable('game_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  hostUserId: uuid('host_user_id')
    .notNull()
    .references(() => users.id),
  deckCount: integer('deck_count').notNull().default(2),
  minBet: integer('min_bet').notNull().default(100),
  maxBet: integer('max_bet').notNull().default(10000),
  maxPlayers: integer('max_players').notNull().default(6),
  isPrivate: boolean('is_private').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('waiting'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gameRoomPlayers = pgTable('game_room_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => gameRooms.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  seatPosition: integer('seat_position').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const handResults = pgTable('hand_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => gameRooms.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  handIndex: integer('hand_index').notNull(),
  bet: integer('bet').notNull(),
  result: varchar('result', { length: 20 }).notNull(),
  payout: real('payout').notNull(),
  runningCount: integer('running_count'),
  trueCount: real('true_count'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
