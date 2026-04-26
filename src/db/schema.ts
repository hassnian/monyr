import { text, pgTable, timestamp, varchar, unique, uuid } from "drizzle-orm/pg-core";

export const handles = pgTable(
  "handles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: varchar("handle", { length: 20 }).notNull().unique(),
    display_name: text("display_name"),
    // owner_pubkey: text("owner_pubkey").notNull(),
    vault_pubkey: text("vault_pubkey").notNull(),
    encrypted_vault_secret: text("encrypted_vault_secret").notNull(),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => [unique("handles_vault_pubkey_unique").on(table.vault_pubkey)],
);
