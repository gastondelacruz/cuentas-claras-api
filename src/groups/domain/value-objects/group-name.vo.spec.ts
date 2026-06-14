import { GroupName } from "./group-name.vo";

describe("GroupName", () => {
	it("accepts a valid group name", () => {
		const groupName = new GroupName(" Trip to Bariloche ");

		expect(groupName.getValue()).toBe("Trip to Bariloche");
		expect(groupName.value).toBe("Trip to Bariloche");
	});

	it("rejects empty or whitespace names", () => {
		expect(() => new GroupName("")).toThrow("Group name cannot be empty.");
		expect(() => new GroupName("   ")).toThrow("Group name cannot be empty.");
	});
});
