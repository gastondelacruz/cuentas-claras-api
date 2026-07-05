import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { EmailVerifiedGuard } from "../auth/infrastructure/security/email-verified.guard";
import mailConfig from "../config/mail.config";
import { MailModule } from "../shared/mail/mail.module";
import { SendGroupInvitationsService } from "./application/services/send-group-invitations.service";
import { AcceptGroupInvitationUseCase } from "./application/use-cases/accept-group-invitation.use-case";
import { ArchiveGroupUseCase } from "./application/use-cases/archive-group.use-case";
import { CreateGroupUseCase } from "./application/use-cases/create-group.use-case";
import { GetGroupBalancesUseCase } from "./application/use-cases/get-group-balances.use-case";
import { GetGroupSettlementsUseCase } from "./application/use-cases/get-group-settlements.use-case";
import { GetGroupDetailUseCase } from "./application/use-cases/get-group-detail.use-case";
import { ListGroupsUseCase } from "./application/use-cases/list-groups.use-case";
import { RecordSettlementPaymentUseCase } from "./application/use-cases/record-settlement-payment.use-case";
import { UpdateGroupUseCase } from "./application/use-cases/update-group.use-case";
import { GroupMemberUserResolver } from "./domain/ports/group-member-user-resolver";
import { GroupInvitationRepository } from "./domain/ports/group-invitation.repository";
import { GroupRepository } from "./domain/ports/group.repository";
import { GroupsController } from "./infrastructure/http/groups.controller";
import { AtLeastOneFieldConstraint } from "./infrastructure/http/validators/at-least-one-field.validator";
import { PrismaGroupMemberUserResolver } from "./infrastructure/persistence/prisma-group-member-user-resolver";
import { PrismaGroupInvitationRepository } from "./infrastructure/persistence/prisma-group-invitation.repository";
import { PrismaGroupRepository } from "./infrastructure/persistence/prisma-group.repository";

@Module({
	imports: [ConfigModule.forFeature(mailConfig), MailModule, AuthModule],
  controllers: [GroupsController],
  providers: [
    SendGroupInvitationsService,
    AcceptGroupInvitationUseCase,
    EmailVerifiedGuard,
    CreateGroupUseCase,
    ListGroupsUseCase,
    GetGroupDetailUseCase,
    UpdateGroupUseCase,
    ArchiveGroupUseCase,
    GetGroupBalancesUseCase,
    GetGroupSettlementsUseCase,
    RecordSettlementPaymentUseCase,
		AtLeastOneFieldConstraint,
		PrismaGroupRepository,
		PrismaGroupMemberUserResolver,
		PrismaGroupInvitationRepository,
		{
			provide: GroupRepository,
			useExisting: PrismaGroupRepository,
		},
		{
			provide: GroupMemberUserResolver,
			useExisting: PrismaGroupMemberUserResolver,
		},
		{
			provide: GroupInvitationRepository,
			useExisting: PrismaGroupInvitationRepository,
		},
	],
})
export class GroupsModule {}
