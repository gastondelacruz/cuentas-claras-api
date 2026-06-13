import { GroupEntity } from "./group-entity";
import { GroupMemberEntity } from "./group-member-entity";

describe("GroupEntity", () => {
	it("exposes a defensive copy of members", () => {
		const group = createGroup([
			new GroupMemberEntity({
				id: "member-1",
				displayName: "Ana",
				email: "ana@example.com",
			}),
		]);

		group.members.push(
			new GroupMemberEntity({
				id: "member-2",
				displayName: "Bob",
				email: "bob@example.com",
			}),
		);

		expect(group.members).toHaveLength(1);
	});

	it("rejects duplicate member emails", () => {
		const group = createGroup([
			new GroupMemberEntity({
				id: "member-1",
				displayName: "Ana",
				email: "ana@example.com",
			}),
		]);

		expect(() =>
			group.addMember(
				new GroupMemberEntity({
					id: "member-2",
					displayName: "Another Ana",
					email: "ANA@example.com",
				}),
			),
		).toThrow("Group members cannot share the same email.");
	});

	it("allows members without email", () => {
		const group = createGroup();

		group.addMember(
			new GroupMemberEntity({
				id: "member-1",
				displayName: "Ana",
			}),
		);
		group.addMember(
			new GroupMemberEntity({
				id: "member-2",
				displayName: "Bob",
			}),
		);

		expect(group.members).toHaveLength(2);
	});

	it("preserves current user membership when replacing invited members", () => {
		const group = createGroup([
			new GroupMemberEntity({
				id: "member-current",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
				userId: "user-1",
			}),
			new GroupMemberEntity({
				id: "member-invited",
				displayName: "Ana",
				email: "ana@example.com",
			}),
		]);

		const replacedGroup = group.replaceInvitedMembers(
			[
				new GroupMemberEntity({
					id: "member-new",
					displayName: "Bob",
					email: "bob@example.com",
				}),
			],
			"user-1",
		);

		expect(replacedGroup.members).toHaveLength(2);
		expect(replacedGroup.members[0].isCurrentUser("user-1")).toBe(true);
		expect(replacedGroup.members[1].displayName).toBe("Bob");
	});
});

function createGroup(members: GroupMemberEntity[] = []): GroupEntity {
	return new GroupEntity({
		id: "group-1",
		name: "Trip",
		description: null,
		type: "trip",
		currency: "ARS",
		members,
	});
}
