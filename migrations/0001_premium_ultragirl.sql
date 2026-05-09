CREATE TABLE "outbox_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_handle_id" uuid NOT NULL,
	"encrypted_payload" text NOT NULL,
	"encrypted_payload_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outbox_receipts" ADD CONSTRAINT "outbox_receipts_owner_handle_id_handles_id_fk" FOREIGN KEY ("owner_handle_id") REFERENCES "public"."handles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_receipts_owner_handle_id_idx" ON "outbox_receipts" USING btree ("owner_handle_id");