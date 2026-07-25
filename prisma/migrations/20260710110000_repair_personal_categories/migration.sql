ALTER TABLE "personal_categories"
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

UPDATE "personal_categories"
SET "color" = '#64748B'
WHERE "color" IS NULL;

ALTER TABLE "personal_categories"
  ALTER COLUMN "color" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "personal_categories_user_id_type_normalized_name_key"
  ON "personal_categories"("user_id", "type", "normalized_name");
CREATE INDEX IF NOT EXISTS "personal_categories_user_id_idx"
  ON "personal_categories"("user_id");

INSERT INTO "personal_categories" (
  "id", "user_id", "name", "normalized_name", "type", "icon", "color", "is_default", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  users."id",
  defaults."name",
  defaults."normalized_name",
  defaults."type",
  defaults."icon",
  defaults."color",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" AS users
CROSS JOIN (
  VALUES
    ('Salud', 'salud', 'expense', 'Heart', '#EF4444'),
    ('Ocio', 'ocio', 'expense', 'Tv', '#22C55E'),
    ('Departamento', 'departamento', 'expense', 'Building2', '#3B82F6'),
    ('Café', 'café', 'expense', 'Coffee', '#F59E0B'),
    ('Educación', 'educación', 'expense', 'BookOpen', '#EC4899'),
    ('Regalos', 'regalos', 'expense', 'Gift', '#8B5CF6'),
    ('Alimentación', 'alimentación', 'expense', 'ShoppingBasket', '#14B8A6'),
    ('Transporte', 'transporte', 'expense', 'Bus', '#06B6D4'),
    ('Otros', 'otros', 'expense', 'MoreHorizontal', '#64748B'),
    ('Servicio', 'servicio', 'expense', 'Wrench', '#84CC16'),
    ('Tarjetas', 'tarjetas', 'expense', 'CreditCard', '#F97316'),
    ('Auto', 'auto', 'expense', 'Car', '#6366F1'),
    ('Ropa', 'ropa', 'expense', 'Shirt', '#D946EF'),
    ('Mascotas', 'mascotas', 'expense', 'PawPrint', '#A855F7'),
    ('Viajes', 'viajes', 'expense', 'Plane', '#0EA5E9'),
    ('Deporte', 'deporte', 'expense', 'Dumbbell', '#F43F5E'),
    ('Hogar', 'hogar', 'expense', 'House', '#475569'),
    ('Salario', 'salario', 'income', 'Banknote', '#22C55E'),
    ('Regalos', 'regalos', 'income', 'Gift', '#F59E0B'),
    ('Intereses', 'intereses', 'income', 'TrendingUp', '#3B82F6'),
    ('Freelance', 'freelance', 'income', 'BriefcaseBusiness', '#8B5CF6'),
    ('Bonos', 'bonos', 'income', 'Gift', '#EC4899'),
    ('Ventas', 'ventas', 'income', 'ShoppingCart', '#14B8A6'),
    ('Inversiones', 'inversiones', 'income', 'TrendingUp', '#06B6D4'),
    ('Propiedades', 'propiedades', 'income', 'Landmark', '#F97316')
) AS defaults("name", "normalized_name", "type", "icon", "color")
ON CONFLICT ("user_id", "type", "normalized_name") DO NOTHING;

UPDATE "personal_categories" AS categories
SET "color" = defaults."color"
FROM (
  VALUES
    ('salud', 'expense', '#EF4444'),
    ('ocio', 'expense', '#22C55E'),
    ('departamento', 'expense', '#3B82F6'),
    ('café', 'expense', '#F59E0B'),
    ('educación', 'expense', '#EC4899'),
    ('regalos', 'expense', '#8B5CF6'),
    ('alimentación', 'expense', '#14B8A6'),
    ('transporte', 'expense', '#06B6D4'),
    ('otros', 'expense', '#64748B'),
    ('servicio', 'expense', '#84CC16'),
    ('tarjetas', 'expense', '#F97316'),
    ('auto', 'expense', '#6366F1'),
    ('ropa', 'expense', '#D946EF'),
    ('mascotas', 'expense', '#A855F7'),
    ('viajes', 'expense', '#0EA5E9'),
    ('deporte', 'expense', '#F43F5E'),
    ('hogar', 'expense', '#475569'),
    ('salario', 'income', '#22C55E'),
    ('regalos', 'income', '#F59E0B'),
    ('intereses', 'income', '#3B82F6'),
    ('freelance', 'income', '#8B5CF6'),
    ('bonos', 'income', '#EC4899'),
    ('ventas', 'income', '#14B8A6'),
    ('inversiones', 'income', '#06B6D4'),
    ('propiedades', 'income', '#F97316')
) AS defaults("normalized_name", "type", "color")
WHERE categories."user_id" IS NOT NULL
  AND categories."is_default" = true
  AND categories."normalized_name" = defaults."normalized_name"
  AND categories."type" = defaults."type"
  AND categories."color" = '#64748B';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personal_categories_user_id_fkey'
      AND conrelid = 'personal_categories'::regclass
  ) THEN
    ALTER TABLE "personal_categories"
      ADD CONSTRAINT "personal_categories_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
