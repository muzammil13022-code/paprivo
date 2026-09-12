import { pgTable, serial, varchar, text, timestamp, primaryKey, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSubjects = pgTable(
  "user_subjects",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectKey: varchar("subject_key", { length: 40 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.subjectKey] })],
);

export const paperProgress = pgTable(
  "paper_progress",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paperId: varchar("paper_id", { length: 80 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("done"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.paperId] }), index("progress_user_idx").on(t.userId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paperId: varchar("paper_id", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.paperId] }), index("bookmarks_user_idx").on(t.userId)],
);
