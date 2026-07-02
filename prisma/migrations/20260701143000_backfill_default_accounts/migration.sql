-- Backfill a default account for existing users that do not have one.
INSERT INTO "accounts" (
	"id",
	"user_id",
	"name",
	"currency",
	"kind",
	"is_default",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	u."id",
	'Cuenta principal',
	'ARS',
	'cash',
	TRUE,
	NOW(),
	NOW()
FROM "users" u
WHERE NOT EXISTS (
	SELECT 1
	FROM "accounts" a
	WHERE a."user_id" = u."id"
		AND a."is_default" = TRUE
		AND a."archived_at" IS NULL
);
