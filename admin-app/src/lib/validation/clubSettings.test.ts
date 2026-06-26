import { describe, expect, it } from 'vitest';
import {
	locationInputSchema,
	promptPayInputSchema,
	shuttleInputSchema
} from './clubSettings';
import { shuttlePricePerEach } from '$lib/types/club';

describe('shuttleInputSchema', () => {
	it('accepts valid shuttle input', () => {
		const result = shuttleInputSchema.safeParse({
			name: 'Yonex AS-30',
			speed: '75',
			original_price: '950',
			price: '850',
			number_per_box: '12'
		});

		expect(result.success).toBe(true);
	});

	it('rejects invalid speed', () => {
		const result = shuttleInputSchema.safeParse({
			name: 'Yonex AS-30',
			speed: '77',
			original_price: '950',
			price: '850',
			number_per_box: '12'
		});

		expect(result.success).toBe(false);
	});
});

describe('promptPayInputSchema', () => {
	it('accepts Thai mobile phone', () => {
		const result = promptPayInputSchema.safeParse({
			clear: false,
			promptpay_type: 'phone',
			promptpay_target: '0812345678'
		});

		expect(result.success).toBe(true);
	});

	it('accepts national ID', () => {
		const result = promptPayInputSchema.safeParse({
			clear: false,
			promptpay_type: 'national_id',
			promptpay_target: '1234567890123'
		});

		expect(result.success).toBe(true);
	});

	it('allows clearing', () => {
		const result = promptPayInputSchema.safeParse({
			clear: true,
			promptpay_target: ''
		});

		expect(result.success).toBe(true);
	});
});

describe('locationInputSchema', () => {
	it('accepts coordinates', () => {
		const result = locationInputSchema.safeParse({
			clear: false,
			latitude: '13.7563',
			longitude: '100.5018'
		});

		expect(result.success).toBe(true);
	});

	it('allows clearing', () => {
		const result = locationInputSchema.safeParse({
			clear: true,
			latitude: '',
			longitude: ''
		});

		expect(result.success).toBe(true);
	});
});

describe('shuttlePricePerEach', () => {
	it('computes per-shuttle price from box price', () => {
		expect(shuttlePricePerEach({ price: 840, number_per_box: 12 })).toBe(70);
	});
});
