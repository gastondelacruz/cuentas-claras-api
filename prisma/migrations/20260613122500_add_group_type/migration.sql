-- CreateEnum
CREATE TYPE "group_type" AS ENUM ('trip', 'home', 'couple', 'friends', 'event', 'other');

-- AlterTable
ALTER TABLE "groups"
	ADD COLUMN "type" "group_type" NOT NULL DEFAULT 'other';
