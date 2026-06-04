-- Product Reviews & Ratings

CREATE TABLE "ProductReview" (
  "id"           SERIAL       PRIMARY KEY,
  "productId"    INTEGER      NOT NULL,
  "userId"       INTEGER      NOT NULL,
  "rating"       INTEGER      NOT NULL,
  "title"        TEXT,
  "body"         TEXT,
  "isApproved"   BOOLEAN      NOT NULL DEFAULT false,
  "isVerified"   BOOLEAN      NOT NULL DEFAULT false,
  "helpfulCount" INTEGER      NOT NULL DEFAULT 0,
  "reportCount"  INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductReview_productId_userId_key" UNIQUE ("productId", "userId"),
  CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE RESTRICT
);

CREATE INDEX "ProductReview_productId_idx"  ON "ProductReview"("productId");
CREATE INDEX "ProductReview_userId_idx"     ON "ProductReview"("userId");
CREATE INDEX "ProductReview_isApproved_idx" ON "ProductReview"("isApproved");
CREATE INDEX "ProductReview_rating_idx"     ON "ProductReview"("rating");
CREATE INDEX "ProductReview_createdAt_idx"  ON "ProductReview"("createdAt");
