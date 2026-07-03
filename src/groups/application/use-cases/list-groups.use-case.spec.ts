import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import type { GroupWithLedger } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { ListGroupsUseCase } from "./list-groups.use-case";

describe("ListGroupsUseCase", () => {
	let useCase: ListGroupsUseCase;
	let repository: {
		listByUserWithLedgers: ReturnType<typeof vi.fn>;
	};

	const now = new Date("2026-06-12T10:00:00.000Z");
	const later = new Date("2026-06-13T10:00:00.000Z");

	const tripGroup = new GroupEntity({
		id: "group-1",
		name: "Viaje A Europa",
		description: null,
		type: "trip",
		currency: "ARS",
		createdAt: now,
		updatedAt: now,
	});

	const homeGroup = new GroupEntity({
		id: "group-2",
		name: "Nuevo Grupo",
		description: null,
		type: "home",
		currency: "ARS",
		createdAt: later,
		updatedAt: later,
	});

	beforeEach(async () => {
		repository = {
			listByUserWithLedgers: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ListGroupsUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(ListGroupsUseCase);
	});

	it("returns each group with the signed balance of the authenticated user", async () => {
		const entries: GroupWithLedger[] = [
			{
				group: tripGroup,
				currentUserMemberId: "trip-current-user",
				ledger: {
					members: [
						{ memberId: "trip-current-user", displayName: "Gaston" },
						{ memberId: "trip-other", displayName: "cami.iriso" },
					],
					splits: [
						{ memberId: "trip-other", netAmount: 250670, currency: "ARS" },
						{ memberId: "trip-current-user", netAmount: -250670, currency: "ARS" },
					],
					settlements: [],
				},
			},
			{
				group: homeGroup,
				currentUserMemberId: "home-current-user",
				ledger: {
					members: [
						{ memberId: "home-current-user", displayName: "Gaston" },
						{ memberId: "home-other", displayName: "test" },
					],
					splits: [
						{ memberId: "home-current-user", netAmount: 500, currency: "ARS" },
						{ memberId: "home-other", netAmount: -500, currency: "ARS" },
					],
					settlements: [],
				},
			},
		];
		repository.listByUserWithLedgers.mockResolvedValue(entries);

		const result = await useCase.execute("user-1");

		expect(repository.listByUserWithLedgers).toHaveBeenCalledWith("user-1");
		expect(result).toEqual([
			{ group: tripGroup, currentUserBalance: -250670 },
			{ group: homeGroup, currentUserBalance: 500 },
		]);
	});

	it("returns a zero balance when the authenticated user is settled", async () => {
		const entries: GroupWithLedger[] = [
			{
				group: tripGroup,
				currentUserMemberId: "trip-current-user",
				ledger: {
					members: [{ memberId: "trip-current-user", displayName: "Gaston" }],
					splits: [],
					settlements: [],
				},
			},
		];
		repository.listByUserWithLedgers.mockResolvedValue(entries);

		await expect(useCase.execute("user-1")).resolves.toEqual([
			{ group: tripGroup, currentUserBalance: 0 },
		]);
	});

	it("returns an empty array when the user has no groups", async () => {
		repository.listByUserWithLedgers.mockResolvedValue([]);

		await expect(useCase.execute("user-1")).resolves.toEqual([]);
	});
});
