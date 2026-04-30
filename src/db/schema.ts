import { index, pgEnum, text, pgTable, timestamp, varchar, unique, uuid } from "drizzle-orm/pg-core";

export const umbraStatusEnum = pgEnum("umbra_status", [
  "inactive",
  "active",
]);

export const handles = pgTable(
  "handles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: varchar("handle", { length: 20 }).notNull().unique(),
    display_name: text("display_name"),
    vault_pubkey: text("vault_pubkey").notNull(),
    encrypted_vault_secret: text("encrypted_vault_secret").notNull(),
    owner_wallet_lookup: text("owner_wallet_lookup").notNull(),
    umbra_status: umbraStatusEnum("umbra_status").notNull().default("inactive"),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("handles_vault_pubkey_unique").on(table.vault_pubkey),
    index("handles_owner_wallet_lookup_idx").on(table.owner_wallet_lookup),
  ],
);
