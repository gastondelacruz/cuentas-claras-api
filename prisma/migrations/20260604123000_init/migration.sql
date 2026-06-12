-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "split_type" AS ENUM ('equal', 'custom');

-- CreateTable
CREATE TABLE "users" (
	"id" UUID NOT NULL,
	"name" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"avatar_url" TEXT,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
	"id" UUID NOT NULL,
	"owner_user_id" UUID NOT NULL,
	"name" TEXT NOT NULL,
	"description" TEXT,
	"currency" TEXT NOT NULL,
	"archived_at" TIMESTAMP(3),
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
	"id" UUID NOT NULL,
	"group_id" UUID NOT NULL,
	"user_id" UUID,
	"display_name" TEXT NOT NULL,
	"email" TEXT,
	"removed_at" TIMESTAMP(3),
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
	"id" UUID NOT NULL,
	"group_id" UUID NOT NULL,
	"title" TEXT NOT NULL,
	"amount" DECIMAL(12,2) NOT NULL,
	"currency" TEXT NOT NULL,
	"paid_by_member_id" UUID NOT NULL,
	"split_type" "split_type" NOT NULL,
	"category" TEXT,
	"notes" TEXT,
	"expense_date" TIMESTAMP(3) NOT NULL,
	"deleted_at" TIMESTAMP(3),
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_splits" (
	"id" UUID NOT NULL,
	"expense_id" UUID NOT NULL,
	"member_id" UUID NOT NULL,
	"owed_amount" DECIMAL(12,2) NOT NULL,
	"paid_amount" DECIMAL(12,2) NOT NULL,
	"net_amount" DECIMAL(12,2) NOT NULL,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_payments" (
	"id" UUID NOT NULL,
	"group_id" UUID NOT NULL,
	"from_member_id" UUID NOT NULL,
	"to_member_id" UUID NOT NULL,
	"amount" DECIMAL(12,2) NOT NULL,
	"currency" TEXT NOT NULL,
	"paid_at" TIMESTAMP(3) NOT NULL,
	"notes" TEXT,
	"deleted_at" TIMESTAMP(3),
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "settlement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "groups_owner_user_id_idx" ON "groups"("owner_user_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE INDEX "expenses_group_id_idx" ON "expenses"("group_id");

-- CreateIndex
CREATE INDEX "expenses_paid_by_member_id_idx" ON "expenses"("paid_by_member_id");

-- CreateIndex
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "expense_splits_member_id_idx" ON "expense_splits"("member_id");

-- CreateIndex
CREATE INDEX "settlement_payments_group_id_idx" ON "settlement_payments"("group_id");

-- CreateIndex
CREATE INDEX "settlement_payments_from_member_id_idx" ON "settlement_payments"("from_member_id");

-- CreateIndex
CREATE INDEX "settlement_payments_to_member_id_idx" ON "settlement_payments"("to_member_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_member_id_fkey" FOREIGN KEY ("paid_by_member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
