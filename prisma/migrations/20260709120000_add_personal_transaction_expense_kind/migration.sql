-- CreateEnum
CREATE TYPE "transaction_expense_kind" AS ENUM ('fixed', 'variable');

-- AlterTable
ALTER TABLE "personal_transactions" ADD COLUMN "expense_kind" "transaction_expense_kind";

-- Keep expense_kind consistent during rolling deploys or rollback windows before any backfill runs.
CREATE FUNCTION "normalize_personal_transaction_expense_kind"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."type" = 'expense' AND NEW."expense_kind" IS NULL THEN
        NEW."expense_kind" := 'variable';
    END IF;

    IF NEW."type" <> 'expense' THEN
        NEW."expense_kind" := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "personal_transactions_expense_kind_normalize"
BEFORE INSERT OR UPDATE OF "type", "expense_kind" ON "personal_transactions"
FOR EACH ROW
EXECUTE FUNCTION "normalize_personal_transaction_expense_kind"();

-- Backfill existing expense transactions as variable after the trigger protects concurrent writes.
UPDATE "personal_transactions"
SET "expense_kind" = 'variable'
WHERE "type" = 'expense' AND "expense_kind" IS NULL;

ALTER TABLE "personal_transactions"
ADD CONSTRAINT "personal_transactions_expense_kind_check"
CHECK (
    ("type" = 'expense' AND "expense_kind" IS NOT NULL)
    OR ("type" <> 'expense' AND "expense_kind" IS NULL)
);
