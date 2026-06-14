export class Amount {
	private readonly cents: number;

	constructor(value: number) {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error("Amount must be a finite number.");
		}

		const cents = Math.round(value * 100);

		if (cents <= 0) {
			throw new Error("Amount must be greater than 0.");
		}

		this.cents = cents;
	}

	getValue(): number {
		return this.cents / 100;
	}

	getCents(): number {
		return this.cents;
	}
}
