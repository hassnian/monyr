CREATE TYPE "umbra_status" AS ENUM ('inactive', 'activating', 'active', 'failed');
ALTER TABLE "handles" ADD COLUMN "umbra_status" "umbra_status" DEFAULT 'inactive' NOT NULL;
