CREATE TABLE "personal_categories" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "color" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "personal_categories_user_id_type_normalized_name_key" ON "personal_categories"("user_id", "type", "normalized_name");
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
UPDATE "personal_categories"
SET "color" = CASE
  WHEN "type" = 'expense' AND "normalized_name" = 'salud' THEN '#EF4444'
  WHEN "type" = 'expense' AND "normalized_name" = 'ocio' THEN '#22C55E'
  WHEN "type" = 'expense' AND "normalized_name" = 'departamento' THEN '#3B82F6'
  WHEN "type" = 'expense' AND "normalized_name" = 'café' THEN '#F59E0B'
  WHEN "type" = 'expense' AND "normalized_name" = 'educación' THEN '#EC4899'
  WHEN "type" = 'expense' AND "normalized_name" = 'regalos' THEN '#8B5CF6'
  WHEN "type" = 'expense' AND "normalized_name" = 'alimentación' THEN '#14B8A6'
  WHEN "type" = 'expense' AND "normalized_name" = 'transporte' THEN '#06B6D4'
  WHEN "type" = 'expense' AND "normalized_name" = 'otros' THEN '#64748B'
  WHEN "type" = 'expense' AND "normalized_name" = 'servicio' THEN '#84CC16'
  WHEN "type" = 'expense' AND "normalized_name" = 'tarjetas' THEN '#F97316'
  WHEN "type" = 'expense' AND "normalized_name" = 'auto' THEN '#6366F1'
  WHEN "type" = 'expense' AND "normalized_name" = 'ropa' THEN '#D946EF'
  WHEN "type" = 'expense' AND "normalized_name" = 'mascotas' THEN '#A855F7'
  WHEN "type" = 'expense' AND "normalized_name" = 'viajes' THEN '#0EA5E9'
  WHEN "type" = 'expense' AND "normalized_name" = 'deporte' THEN '#F43F5E'
  WHEN "type" = 'expense' AND "normalized_name" = 'hogar' THEN '#475569'
  WHEN "type" = 'income' AND "normalized_name" = 'salario' THEN '#22C55E'
  WHEN "type" = 'income' AND "normalized_name" = 'regalos' THEN '#F59E0B'
  WHEN "type" = 'income' AND "normalized_name" = 'intereses' THEN '#3B82F6'
  WHEN "type" = 'income' AND "normalized_name" = 'freelance' THEN '#8B5CF6'
  WHEN "type" = 'income' AND "normalized_name" = 'bonos' THEN '#EC4899'
  WHEN "type" = 'income' AND "normalized_name" = 'ventas' THEN '#14B8A6'
  WHEN "type" = 'income' AND "normalized_name" = 'inversiones' THEN '#06B6D4'
  WHEN "type" = 'income' AND "normalized_name" = 'propiedades' THEN '#F97316'
  ELSE '#64748B'
END
WHERE "color" IS NULL;
ALTER TABLE "personal_categories" ALTER COLUMN "color" SET NOT NULL;
CREATE INDEX "personal_categories_user_id_idx" ON "personal_categories"("user_id");
ALTER TABLE "personal_categories" ADD CONSTRAINT "personal_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
