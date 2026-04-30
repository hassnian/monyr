ALTER TABLE "handles" ALTER COLUMN "umbra_status" DROP DEFAULT;

CREATE TYPE "umbra_status_next" AS ENUM ('inactive', 'active');

ALTER TABLE "handles"
  ALTER COLUMN "umbra_status" TYPE "umbra_status_next"
  USING CASE
    WHEN "umbra_status" = 'active' THEN 'active'::"umbra_status_next"
    ELSE 'inactive'::"umbra_status_next"
  END;

DROP TYPE "umbra_status";
ALTER TYPE "umbra_status_next" RENAME TO "umbra_status";

ALTER TABLE "handles" ALTER COLUMN "umbra_status" SET DEFAULT 'inactive';
