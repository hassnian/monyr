import { text, pgTable, timestamp, varchar, unique } from "drizzle-orm/pg-core";

export const handles = pgTable(
  "handles",
  {
    handle: varchar().notNull().unique(),
    display_name: text("display_name"),
    owner_pubkey: text("owner_pubkey"),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [unique("handles_owner_pubkey_unique").on(table.owner_pubkey)],
);
