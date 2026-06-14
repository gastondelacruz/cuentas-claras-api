export class GroupName {
	readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();

		if (normalizedValue.length === 0) {
			throw new Error("Group name cannot be empty.");
		}

		this.value = normalizedValue;
	}

	getValue(): string {
		return this.value;
	}
}
