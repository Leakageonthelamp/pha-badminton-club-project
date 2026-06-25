import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_MIN_LENGTH_ERROR = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
export const PASSWORD_UPPERCASE_ERROR = 'Password must include at least one uppercase letter';
export const PASSWORD_SPECIAL_ERROR = 'Password must include at least one special character';

const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export const validateRegisterPassword = (value: string): string | null => {
	if (value.length < PASSWORD_MIN_LENGTH) {
		return PASSWORD_MIN_LENGTH_ERROR;
	}

	if (!HAS_UPPERCASE.test(value)) {
		return PASSWORD_UPPERCASE_ERROR;
	}

	if (!HAS_SPECIAL.test(value)) {
		return PASSWORD_SPECIAL_ERROR;
	}

	return null;
};

export const registerPasswordSchema = z.string().superRefine((value, ctx) => {
	const message = validateRegisterPassword(value);
	if (message) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message
		});
	}
});
