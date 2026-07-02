import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	TRANSACTION_PERIODS,
	type TransactionPeriod,
} from "../../domain/value-objects/transaction-period.vo";

type ResolveDateRangeInput = {
	period?: TransactionPeriod;
	dateFrom?: Date;
	dateTo?: Date;
};

export type DateRange = {
	gte: Date;
	lt: Date;
};

export function resolveDateRange(
	input: ResolveDateRangeInput,
	now: Date,
): DateRange | null {
	if (input.dateFrom && input.dateTo) {
		return {
			gte: input.dateFrom,
			lt: input.dateTo,
		};
	}

	if (!input.period) {
		return null;
	}

	const period = input.period;

	if (!TRANSACTION_PERIODS.includes(period)) {
		throw new BusinessException(
			"PERSONAL_TX_INVALID_PERIOD",
			`Invalid period: ${period}.`,
			400,
		);
	}

	return calculateRange(period, now);
}

function calculateRange(period: TransactionPeriod, now: Date): DateRange {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const date = now.getUTCDate();
	const dayOfWeek = now.getUTCDay();

	switch (period) {
		case "day": {
			const gte = Date.UTC(year, month, date);
			const lt = Date.UTC(year, month, date + 1);
			return { gte: new Date(gte), lt: new Date(lt) };
		}
		case "week": {
			const mondayOffset = (dayOfWeek + 6) % 7;
			const mondayDate = date - mondayOffset;
			const gte = Date.UTC(year, month, mondayDate);
			const lt = Date.UTC(year, month, mondayDate + 7);
			return { gte: new Date(gte), lt: new Date(lt) };
		}
		case "month": {
			const gte = Date.UTC(year, month, 1);
			const lt = Date.UTC(year, month + 1, 1);
			return { gte: new Date(gte), lt: new Date(lt) };
		}
		case "year": {
			const gte = Date.UTC(year, 0, 1);
			const lt = Date.UTC(year + 1, 0, 1);
			return { gte: new Date(gte), lt: new Date(lt) };
		}
	}
}
