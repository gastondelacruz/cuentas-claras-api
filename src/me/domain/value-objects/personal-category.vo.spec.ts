import {
	DEFAULT_PERSONAL_CATEGORIES,
	PERSONAL_CATEGORY_ICONS,
	getPersonalCategory,
	normalizeCategoryName,
} from "./personal-category.vo";

describe("personal categories", () => {
	it("normalizes trimmed, collapsed, case-insensitive Unicode names", () => {
		expect(normalizeCategoryName("  Café   ")).toBe("café");
		expect(normalizeCategoryName("REGALOS")).toBe("regalos");
	});

	it("defines the approved built-in categories and icon keys", () => {
		expect(getPersonalCategory("expense", "Salud")).toMatchObject({
			name: "Salud",
			type: "expense",
			icon: "Heart",
			color: "#EF4444",
		});
		expect(DEFAULT_PERSONAL_CATEGORIES).toHaveLength(25);
		expect(PERSONAL_CATEGORY_ICONS).toEqual([
			"Heart",
			"Tv",
			"Building2",
			"Coffee",
			"BookOpen",
			"Gift",
			"Bus",
			"MoreHorizontal",
			"Wrench",
			"CreditCard",
			"Car",
			"Shirt",
			"ShoppingBasket",
			"Banknote",
			"TrendingUp",
			"BriefcaseBusiness",
			"Dumbbell",
			"House",
			"Landmark",
			"Laptop",
			"Plane",
			"WalletCards",
			"CardSim",
			"Utensils",
			"ShoppingCart",
			"Gamepad2",
			"GraduationCap",
			"PiggyBank",
			"Stethoscope",
			"Baby",
		]);
		expect(getPersonalCategory("expense", "Mascotas")).toMatchObject({
			icon: "PawPrint",
			color: "#A855F7",
		});
	});
});
