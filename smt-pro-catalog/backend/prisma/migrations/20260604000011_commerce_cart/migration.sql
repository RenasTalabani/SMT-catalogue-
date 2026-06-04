-- Banners

CREATE TABLE "Banner" (
  "id"         SERIAL       PRIMARY KEY,
  "title"      TEXT         NOT NULL,
  "subtitle"   TEXT,
  "imageUrl"   TEXT         NOT NULL,
  "linkUrl"    TEXT,
  "type"       TEXT         NOT NULL DEFAULT 'HERO',
  "isActive"   BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "validFrom"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Banner_isActive_idx"   ON "Banner"("isActive");
CREATE INDEX "Banner_type_idx"       ON "Banner"("type");
CREATE INDEX "Banner_sortOrder_idx"  ON "Banner"("sortOrder");
CREATE INDEX "Banner_validFrom_idx"  ON "Banner"("validFrom");
CREATE INDEX "Banner_validUntil_idx" ON "Banner"("validUntil");

-- Wishlist

CREATE TABLE "Wishlist" (
  "id"        SERIAL       PRIMARY KEY,
  "userId"    INTEGER      NOT NULL,
  "productId" INTEGER      NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Wishlist_userId_productId_key" UNIQUE ("userId", "productId"),
  CONSTRAINT "Wishlist_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE,
  CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX "Wishlist_userId_idx"    ON "Wishlist"("userId");
CREATE INDEX "Wishlist_productId_idx" ON "Wishlist"("productId");

-- Recently Viewed

CREATE TABLE "RecentlyViewed" (
  "id"        SERIAL       PRIMARY KEY,
  "userId"    INTEGER      NOT NULL,
  "productId" INTEGER      NOT NULL,
  "viewedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RecentlyViewed_userId_productId_key" UNIQUE ("userId", "productId"),
  CONSTRAINT "RecentlyViewed_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE,
  CONSTRAINT "RecentlyViewed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX "RecentlyViewed_userId_idx"    ON "RecentlyViewed"("userId");
CREATE INDEX "RecentlyViewed_productId_idx" ON "RecentlyViewed"("productId");
CREATE INDEX "RecentlyViewed_viewedAt_idx"  ON "RecentlyViewed"("viewedAt");

-- Shopping Cart

CREATE TABLE "Cart" (
  "id"        SERIAL       PRIMARY KEY,
  "userId"    INTEGER      NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "CartItem" (
  "id"        SERIAL   PRIMARY KEY,
  "cartId"    INTEGER  NOT NULL,
  "productId" INTEGER  NOT NULL,
  "variantId" INTEGER,
  "quantity"  INTEGER  NOT NULL DEFAULT 1,
  "addedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CartItem_cartId_productId_variantId_key" UNIQUE ("cartId", "productId", "variantId"),
  CONSTRAINT "CartItem_cartId_fkey"    FOREIGN KEY ("cartId")    REFERENCES "Cart"("id")           ON DELETE CASCADE,
  CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id")        ON DELETE RESTRICT,
  CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL
);

CREATE INDEX "Cart_userId_idx"       ON "Cart"("userId");
CREATE INDEX "CartItem_cartId_idx"   ON "CartItem"("cartId");
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");
