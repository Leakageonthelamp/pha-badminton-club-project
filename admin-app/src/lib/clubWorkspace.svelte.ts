import { browser } from '$app/environment';

export const SELECTED_CLUB_KEY = 'admin:selectedClubId';

export type ClubWorkspaceOption = {
	id: string;
	name: string;
	is_active: boolean;
};

export const clubWorkspaceState = $state({
	selectedClubId: ''
});

export const syncSelectedClub = (clubs: ClubWorkspaceOption[]) => {
	if (!clubs.length) {
		clubWorkspaceState.selectedClubId = '';
		return;
	}

	const ids = clubs.map((club) => club.id);
	if (clubWorkspaceState.selectedClubId && ids.includes(clubWorkspaceState.selectedClubId)) {
		return;
	}

	let nextId = clubs[0].id;
	if (browser) {
		const stored = localStorage.getItem(SELECTED_CLUB_KEY);
		if (stored && ids.includes(stored)) {
			nextId = stored;
		}
	}

	clubWorkspaceState.selectedClubId = nextId;
};

export const selectClub = (clubId: string) => {
	clubWorkspaceState.selectedClubId = clubId;
	if (browser) {
		localStorage.setItem(SELECTED_CLUB_KEY, clubId);
	}
};

export const getActiveClub = (clubs: ClubWorkspaceOption[]) =>
	clubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ?? clubs[0] ?? null;
