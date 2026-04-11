-- Add new columns with temporary defaults to handle existing rows
ALTER TABLE "OrderItem"
  ADD COLUMN "price"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "discountAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "finalPrice"      DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Migrate existing data: copy unitPrice → price and finalPrice, subtotal stays the same
UPDATE "OrderItem"
SET "price"      = "unitPrice",
    "finalPrice" = "unitPrice";

-- Drop old column
ALTER TABLE "OrderItem" DROP COLUMN "unitPrice";

-- Remove temporary defaults (columns are now required with no default in Prisma schema)
ALTER TABLE "OrderItem"
  ALTER COLUMN "price"      DROP DEFAULT,
  ALTER COLUMN "finalPrice" DROP DEFAULT;
