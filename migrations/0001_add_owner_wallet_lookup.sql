ALTER TABLE "handles" ADD COLUMN "owner_wallet_lookup" text;
UPDATE "handles" SET "owner_wallet_lookup" = '' WHERE "owner_wallet_lookup" IS NULL;
ALTER TABLE "handles" ALTER COLUMN "owner_wallet_lookup" SET NOT NULL;
CREATE INDEX "handles_owner_wallet_lookup_idx" ON "handles" ("owner_wallet_lookup");
