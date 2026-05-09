import { index, integer, jsonb, text, pgEnum, pgTable, timestamp, varchar, unique, uuid } from "drizzle-orm/pg-core";

export const umbraStatusEnum = pgEnum("umbra_status", [
  "inactive",
  "active",
]);

export const paymentContextKindEnum = pgEnum("payment_context_kind", [
  "label",
  "invoice",
  "product",
  "claim_link",
]);

export const paymentContextStatusEnum = pgEnum("payment_context_status", [
  "active",
  "archived",
  "paid",
  "expired",
  "cancelled",
]);

export const claimableUtxoStatusEnum = pgEnum("claimable_utxo_status", [
  "created",
  "claiming",
  "claimed",
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

export const paymentContexts = pgTable(
  "payment_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle_id: uuid("handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    kind: paymentContextKindEnum("kind").notNull(),
    path: varchar("path", { length: 160 }).notNull(),
    title: text("title").notNull(),
    status: paymentContextStatusEnum("status").notNull().default("active"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("payment_contexts_handle_id_path_unique").on(table.handle_id, table.path),
    index("payment_contexts_handle_id_kind_idx").on(table.handle_id, table.kind),
  ],
);

export const claimableUtxos = pgTable(
  "claimable_utxos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    owner_handle_id: uuid("owner_handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    tree_index: integer("tree_index"),
    insertion_index: integer("insertion_index"),
    status: claimableUtxoStatusEnum("status").notNull().default("created"),
    encrypted_claim_payload: text("encrypted_claim_payload"),
    encrypted_claim_payload_version: integer("encrypted_claim_payload_version"),
    claimed_at: timestamp(),
    last_seen_at: timestamp(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("claimable_utxos_tree_insertion_unique").on(table.tree_index, table.insertion_index),
    index("claimable_utxos_owner_handle_id_idx").on(table.owner_handle_id),
    index("claimable_utxos_status_idx").on(table.status),
  ],
);

export const productPurchases = pgTable(
  "product_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    product_context_id: uuid("product_context_id")
      .notNull()
      .references(() => paymentContexts.id, { onDelete: "cascade" }),
    buyer_wallet_lookup: text("buyer_wallet_lookup").notNull(),
    payment_signature: text("payment_signature").notNull(),
    status: paymentContextStatusEnum("status").notNull().default("paid"),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("product_purchases_context_buyer_unique").on(
      table.product_context_id,
      table.buyer_wallet_lookup,
    ),
    unique("product_purchases_payment_signature_unique").on(table.payment_signature),
    index("product_purchases_buyer_wallet_lookup_idx").on(table.buyer_wallet_lookup),
  ],
);

export const outboxReceipts = pgTable(
  "outbox_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    owner_handle_id: uuid("owner_handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    encrypted_payload: text("encrypted_payload").notNull(),
    encrypted_payload_version: integer("encrypted_payload_version").notNull().default(1),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [index("outbox_receipts_owner_handle_id_idx").on(table.owner_handle_id)],
);

export const paymentMetadata = pgTable(
  "payment_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle_id: uuid("handle_id")
      .notNull()
      .references(() => handles.id, { onDelete: "cascade" }),
    context_id: uuid("context_id").references(() => paymentContexts.id, { onDelete: "set null" }),
    utxo_create_signature: text("utxo_create_signature").notNull(),
    encrypted_payload: text("encrypted_payload").notNull(),
    encrypted_payload_version: integer("encrypted_payload_version").notNull().default(1),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique("payment_metadata_utxo_create_signature_unique").on(table.utxo_create_signature),
    index("payment_metadata_handle_id_idx").on(table.handle_id),
    index("payment_metadata_context_id_idx").on(table.context_id),
  ],
);
