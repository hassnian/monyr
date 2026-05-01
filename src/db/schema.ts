import { index, integer, text, pgEnum, pgTable, timestamp, varchar, unique, uuid } from "drizzle-orm/pg-core";

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
    receipt_encryption_pubkey: text("receipt_encryption_pubkey").notNull(),
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

export const paymentMetadata = pgTable(
  "payment_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle_id: uuid("handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    utxo_create_signature: text("utxo_create_signature").notNull(),
    encrypted_payload: text("encrypted_payload").notNull(),
    encrypted_payload_version: integer("encrypted_payload_version").notNull().default(1),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("payment_metadata_utxo_create_signature_unique").on(table.utxo_create_signature),
    index("payment_metadata_handle_id_idx").on(table.handle_id),
  ],
);
