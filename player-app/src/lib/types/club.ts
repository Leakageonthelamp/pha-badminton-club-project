export type ClubPublic = {
	id: string;
	name: string;
	description: string;
	latitude: number | null;
	longitude: number | null;
};

export type ClubAdminPublic = {
	user_id: string;
	display_name: string;
	tag: string;
	avatar_url: string | null;
};

export type ShuttleSpeed = 75 | 76;

export type ClubShuttlePublic = {
	id: string;
	name: string;
	speed: ShuttleSpeed;
	price: number;
	number_per_box: number;
};

export type ClubDetail = {
	club: ClubPublic;
	admins: ClubAdminPublic[];
	shuttles: ClubShuttlePublic[];
};

export const shuttlePricePerEach = (
	shuttle: Pick<ClubShuttlePublic, 'price' | 'number_per_box'>
): number => {
	if (shuttle.number_per_box <= 0) return 0;
	return Math.round((shuttle.price / shuttle.number_per_box) * 100) / 100;
};

export const formatThb = (amount: number): string =>
	new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
