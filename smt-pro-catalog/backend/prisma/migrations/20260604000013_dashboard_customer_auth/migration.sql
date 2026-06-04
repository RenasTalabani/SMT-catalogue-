-- Add linkedCustomerId to User (links customer-role users to their Customer record)

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "linkedCustomerId" INTEGER UNIQUE;

ALTER TABLE "User"
  ADD CONSTRAINT IF NOT EXISTS "User_linkedCustomerId_fkey"
  FOREIGN KEY ("linkedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "User_linkedCustomerId_idx" ON "User"("linkedCustomerId");
