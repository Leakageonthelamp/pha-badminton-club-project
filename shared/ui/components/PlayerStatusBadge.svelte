<script lang="ts">
	import {
		playerLiveStatusBadgeClass,
		playerLiveStatusLabel,
		type PlayerLiveStatus
	} from '../sessionStatus';

	let { status }: { status: PlayerLiveStatus } = $props();
</script>

<span
	class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 {playerLiveStatusBadgeClass(
		status
	)}"
>
	{playerLiveStatusLabel(status)}
</span>
