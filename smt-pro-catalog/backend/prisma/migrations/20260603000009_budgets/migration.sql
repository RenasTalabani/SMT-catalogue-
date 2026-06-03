-- Expense Budgets

CREATE TABLE "Budget" (
  "id"        SERIAL           PRIMARY KEY,
  "category"  TEXT             NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "period"    TEXT             NOT NULL DEFAULT 'MONTHLY',
  "year"      INTEGER          NOT NULL,
  "month"     INTEGER,
  "quarter"   INTEGER,
  "isActive"  BOOLEAN          NOT NULL DEFAULT true,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Budget_category_period_year_month_quarter_key"
    UNIQUE ("category", "period", "year", "month", "quarter")
);

CREATE INDEX "Budget_category_idx" ON "Budget"("category");
CREATE INDEX "Budget_period_idx"   ON "Budget"("period");
CREATE INDEX "Budget_year_idx"     ON "Budget"("year");
CREATE INDEX "Budget_isActive_idx" ON "Budget"("isActive");
