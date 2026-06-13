import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions,
	ValidatorConstraint,
	type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "atLeastOneField", async: false })
export class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
	validate(_: unknown, validationArguments: ValidationArguments): boolean {
		const object = validationArguments.object as Record<string, unknown>;

		return ["name", "description", "type", "currency", "members"].some(
			(key) => object[key] !== undefined,
		);
	}

	defaultMessage(): string {
		return "At least one field must be provided.";
	}
}

export function AtLeastOneField(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName,
			options: validationOptions,
			constraints: [],
			validator: AtLeastOneFieldConstraint,
		});
	};
}
