-- AddColumn: token_digest on refresh_tokens
-- Existing dev rows are seeded with their UUID as a placeholder digest so the
-- NOT NULL + UNIQUE constraint can be applied without a backfill script.

ALTER TABLE "refresh_tokens" ADD COLUMN "token_digest" TEXT;

-- Backfill existing dev rows with their primary-key UUID (unique per row).
UPDATE "refresh_tokens" SET "token_digest" = "id" WHERE "token_digest" IS NULL;

-- Enforce NOT NULL and UNIQUE now that every row has a value.
ALTER TABLE "refresh_tokens" ALTER COLUMN "token_digest" SET NOT NULL;
CREATE UNIQUE INDEX "refresh_tokens_token_digest_key" ON "refresh_tokens"("token_digest");
