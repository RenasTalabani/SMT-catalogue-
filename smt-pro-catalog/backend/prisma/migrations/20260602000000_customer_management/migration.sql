-- CreateTable: Customer
CREATE TABLE "Customer" (
    "id"        SERIAL NOT NULL,
    "name"      TEXT NOT NULL,
    "phone"     TEXT,
    "email"     TEXT,
    "address"   TEXT,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on Customer.email
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- Indexes on Customer
CREATE INDEX "Customer_name_idx"      ON "Customer"("name");
CREATE INDEX "Customer_phone_idx"     ON "Customer"("phone");
CREATE INDEX "Customer_email_idx"     ON "Customer"("email");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- AddColumn: Order.customerId
ALTER TABLE "Order" ADD COLUMN "customerId" INTEGER;

-- Index on Order.customerId
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- ForeignKey: Order.customerId -> Customer.id
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
