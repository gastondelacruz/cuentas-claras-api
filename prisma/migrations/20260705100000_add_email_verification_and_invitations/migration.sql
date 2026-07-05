ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_digest" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_invitation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_member_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_digest" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_invitation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_token_digest_key" ON "email_verification_tokens"("token_digest");
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

CREATE UNIQUE INDEX "group_invitation_tokens_token_digest_key" ON "group_invitation_tokens"("token_digest");
CREATE INDEX "group_invitation_tokens_group_member_id_idx" ON "group_invitation_tokens"("group_member_id");
CREATE INDEX "group_invitation_tokens_email_idx" ON "group_invitation_tokens"("email");
CREATE INDEX "group_invitation_tokens_expires_at_idx" ON "group_invitation_tokens"("expires_at");

ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_invitation_tokens" ADD CONSTRAINT "group_invitation_tokens_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
