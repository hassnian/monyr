import { index, integer, pgEnum, text, pgTable, timestamp, varchar, unique, uuid } from "drizzle-orm/pg-core";

export const umbraStatusEnum = pgEnum("umbra_status", [
  "inactive",
  "active",
]);

export const paymentRailEnum = pgEnum("payment_rail", [
  "quick",
  "private",
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

export const paymentReceipts = pgTable(
  "payment_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle_id: uuid("handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    rail: paymentRailEnum("rail").notNull(),
    mint: text("mint").notNull(),
    receipt_signature: text("receipt_signature").notNull(),
    queue_signature: text("queue_signature"),
    callback_signature: text("callback_signature"),
    callback_status: text("callback_status"),
    callback_elapsed_ms: integer("callback_elapsed_ms"),
    rent_claim_signature: text("rent_claim_signature"),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("payment_receipts_receipt_signature_unique").on(table.receipt_signature),
    index("payment_receipts_handle_id_idx").on(table.handle_id),
  ],
);
