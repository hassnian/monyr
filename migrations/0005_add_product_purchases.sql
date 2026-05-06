CREATE TABLE IF NOT EXISTS "product_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_context_id" uuid NOT NULL,
	"buyer_wallet_lookup" text NOT NULL,
	"payment_signature" text NOT NULL,
	"status" "payment_context_status" DEFAULT 'paid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_purchases" ADD CONSTRAINT "product_purchases_product_context_id_payment_contexts_id_fk" FOREIGN KEY ("product_context_id") REFERENCES "public"."payment_contexts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_purchases_context_buyer_unique" ON "product_purchases" USING btree ("product_context_id","buyer_wallet_lookup");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_purchases_payment_signature_unique" ON "product_purchases" USING btree ("payment_signature");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_purchases_buyer_wallet_lookup_idx" ON "product_purchases" USING btree ("buyer_wallet_lookup");
