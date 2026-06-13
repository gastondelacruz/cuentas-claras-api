export class Currency {
	readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();

		if (!/^[A-Z]{3}$/.test(normalizedValue)) {
			throw new Error("Currency must be a 3-letter uppercase code.");
		}

		this.value = normalizedValue;
	}

	getValue(): string {
		return this.value;
	}
}
