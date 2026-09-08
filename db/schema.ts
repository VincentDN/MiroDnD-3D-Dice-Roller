import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  created: integer('created').notNull(),
});
export const players = sqliteTable(
  'players',
  {
    id: text('id').primaryKey(),
    room: text('room')
      .notNull()
      .references(() => rooms.id),
    secret: text('secret').notNull(),
    name: text('name').notNull(),
    color: text('color').notNull(),
    seen: integer('seen').notNull(),
  },
  (t) => [index('players_room').on(t.room)],
);
export const rolls = sqliteTable(
  'rolls',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    id: text('id').notNull().unique(),
    room: text('room')
      .notNull()
      .references(() => rooms.id),
    player: text('player').notNull(),
    data: text('data').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('rolls_room_seq').on(t.room, t.seq)],
);
