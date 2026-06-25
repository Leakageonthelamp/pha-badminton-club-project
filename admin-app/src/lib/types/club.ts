export type Club = {
	id: string;
	name: string;
	description: string;
	max_active_sessions: number;
	owner_id: string;
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
