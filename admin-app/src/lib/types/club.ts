export type PromptPayType = 'phone' | 'national_id';

export type Club = {
	id: string;
	name: string;
	description: string;
	max_active_sessions: number;
	max_admins: number;
	is_active: boolean;
	owner_id: string;
	promptpay_type: PromptPayType | null;
	promptpay_target: string | null;
	latitude: number | null;
	longitude: number | null;
	created_at: string;
	updated_at: string;
};

export type ShuttleSpeed = 75 | 76;

export type ClubShuttle = {
	id: string;
	club_id: string;
	name: string;
	speed: ShuttleSpeed;
	original_price: number;
	price: number;
	number_per_box: number;
	created_at: string;
	updated_at: string;
};

export type ClubAdminRow = {
	club_id: string;
	user_id: string;
	assigned_by: string | null;
	created_at: string;
};

export type ClubAdminProfile = {
	user_id: string;
	display_name: string;
	tag: string;
	email: string | null;
	app_role: string;
};

export const shuttlePricePerEach = (
	shuttle: Pick<ClubShuttle, 'price' | 'number_per_box'>
): number => (shuttle.number_per_box > 0 ? shuttle.price / shuttle.number_per_box : 0);

export const formatThb = (amount: number): string =>
	new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
