CREATE TYPE "payment_rail" AS ENUM ('quick', 'private');

CREATE TABLE "payment_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "handle_id" uuid NOT NULL,
  "rail" "payment_rail" NOT NULL,
  "mint" text NOT NULL,
  "receipt_signature" text NOT NULL,
  "queue_signature" text,
  "callback_signature" text,
  "callback_status" text,
  "callback_elapsed_ms" integer,
  "rent_claim_signature" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_receipts_receipt_signature_unique" UNIQUE("receipt_signature"),
  CONSTRAINT "payment_receipts_handle_id_handles_id_fk"
    FOREIGN KEY ("handle_id") REFERENCES "handles"("id") ON DELETE cascade
);

CREATE INDEX "payment_receipts_handle_id_idx" ON "payment_receipts" ("handle_id");
