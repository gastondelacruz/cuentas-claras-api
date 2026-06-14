export class Email {
	readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim().toLowerCase();

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
			throw new Error("Email must be valid.");
		}

		this.value = normalizedValue;
	}

	getValue(): string {
		return this.value;
	}
}
