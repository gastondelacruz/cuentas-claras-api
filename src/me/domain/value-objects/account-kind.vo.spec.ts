import { ACCOUNT_KINDS } from "./account-kind.vo";

describe("ACCOUNT_KINDS", () => {
	it("contains the supported account kind values", () => {
		expect(ACCOUNT_KINDS).toEqual(["cash", "bank", "credit"]);
	});
});
