-- Webhooks

CREATE TABLE "Webhook" (
  "id"        SERIAL       PRIMARY KEY,
  "name"      TEXT         NOT NULL,
  "url"       TEXT         NOT NULL,
  "secret"    TEXT         NOT NULL,
  "events"    TEXT         NOT NULL,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "headers"   JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WebhookDelivery" (
  "id"           SERIAL       PRIMARY KEY,
  "webhookId"    INTEGER      NOT NULL,
  "event"        TEXT         NOT NULL,
  "payload"      JSONB        NOT NULL,
  "status"       TEXT         NOT NULL DEFAULT 'PENDING',
  "responseCode" INTEGER,
  "responseBody" TEXT,
  "durationMs"   INTEGER,
  "attempt"      INTEGER      NOT NULL DEFAULT 1,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE
);

CREATE INDEX "Webhook_isActive_idx"          ON "Webhook"("isActive");
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX "WebhookDelivery_event_idx"     ON "WebhookDelivery"("event");
CREATE INDEX "WebhookDelivery_status_idx"    ON "WebhookDelivery"("status");
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CRM Customer Notes

CREATE TABLE "CustomerNote" (
  "id"         SERIAL       PRIMARY KEY,
  "customerId" INTEGER      NOT NULL,
  "createdBy"  INTEGER      NOT NULL,
  "type"       TEXT         NOT NULL DEFAULT 'NOTE',
  "content"    TEXT         NOT NULL,
  "followUpAt" TIMESTAMP(3),
  "isResolved" BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomerNote_createdBy_fkey"  FOREIGN KEY ("createdBy")  REFERENCES "User"("id")     ON DELETE RESTRICT
);

CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");
CREATE INDEX "CustomerNote_createdBy_idx"  ON "CustomerNote"("createdBy");
CREATE INDEX "CustomerNote_type_idx"       ON "CustomerNote"("type");
CREATE INDEX "CustomerNote_followUpAt_idx" ON "CustomerNote"("followUpAt");
CREATE INDEX "CustomerNote_isResolved_idx" ON "CustomerNote"("isResolved");
CREATE INDEX "CustomerNote_createdAt_idx"  ON "CustomerNote"("createdAt");
