CREATE TYPE "public"."claimable_utxo_status" AS ENUM('created', 'claiming', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."payment_context_kind" AS ENUM('label', 'invoice', 'product', 'claim_link');--> statement-breakpoint
CREATE TYPE "public"."payment_context_status" AS ENUM('active', 'archived', 'paid', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."umbra_status" AS ENUM('inactive', 'active');--> statement-breakpoint
CREATE TABLE "claimable_utxos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_handle_id" uuid NOT NULL,
	"create_signature" text,
	"queue_signature" text,
	"callback_signature" text,
	"tree_index" integer,
	"insertion_index" integer,
	"status" "claimable_utxo_status" DEFAULT 'created' NOT NULL,
	"encrypted_claim_payload" text,
	"encrypted_claim_payload_version" integer,
	"claimed_at" timestamp,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claimable_utxos_create_signature_unique" UNIQUE("create_signature"),
	CONSTRAINT "claimable_utxos_queue_signature_unique" UNIQUE("queue_signature"),
	CONSTRAINT "claimable_utxos_callback_signature_unique" UNIQUE("callback_signature"),
	CONSTRAINT "claimable_utxos_tree_insertion_unique" UNIQUE("tree_index","insertion_index")
);
--> statement-breakpoint
CREATE TABLE "payment_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_id" uuid NOT NULL,
	"kind" "payment_context_kind" NOT NULL,
	"path" varchar(160) NOT NULL,
	"title" text NOT NULL,
	"status" "payment_context_status" DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_contexts_handle_id_path_unique" UNIQUE("handle_id","path")
);
--> statement-breakpoint
CREATE TABLE "payment_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_id" uuid NOT NULL,
	"context_id" uuid,
	"utxo_create_signature" text NOT NULL,
	"encrypted_payload" text NOT NULL,
	"encrypted_payload_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_metadata_utxo_create_signature_unique" UNIQUE("utxo_create_signature")
);
--> statement-breakpoint
ALTER TABLE "handles" ADD COLUMN "receipt_encryption_pubkey" text NOT NULL;--> statement-breakpoint
ALTER TABLE "handles" ADD COLUMN "owner_wallet_lookup" text NOT NULL;--> statement-breakpoint
ALTER TABLE "handles" ADD COLUMN "umbra_status" "umbra_status" DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
ALTER TABLE "claimable_utxos" ADD CONSTRAINT "claimable_utxos_owner_handle_id_handles_id_fk" FOREIGN KEY ("owner_handle_id") REFERENCES "public"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_contexts" ADD CONSTRAINT "payment_contexts_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "public"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_metadata" ADD CONSTRAINT "payment_metadata_handle_id_handles_id_fk" FOREIGN KEY ("handle_id") REFERENCES "public"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_metadata" ADD CONSTRAINT "payment_metadata_context_id_payment_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."payment_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claimable_utxos_owner_handle_id_idx" ON "claimable_utxos" USING btree ("owner_handle_id");--> statement-breakpoint
CREATE INDEX "claimable_utxos_status_idx" ON "claimable_utxos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_contexts_handle_id_kind_idx" ON "payment_contexts" USING btree ("handle_id","kind");--> statement-breakpoint
CREATE INDEX "payment_metadata_handle_id_idx" ON "payment_metadata" USING btree ("handle_id");--> statement-breakpoint
CREATE INDEX "payment_metadata_context_id_idx" ON "payment_metadata" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "handles_owner_wallet_lookup_idx" ON "handles" USING btree ("owner_wallet_lookup");