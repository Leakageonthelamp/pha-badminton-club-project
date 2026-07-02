<script lang="ts">
	import { t } from '$lib/i18n';
	import Cropper from 'svelte-easy-crop';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import {
		AVATAR_OUTPUT_SIZE,
		cropAvatarToFile,
		type CropArea
	} from '$lib/images/cropAvatar';

	let {
		open = false,
		imageSrc,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		imageSrc: string | null;
		onConfirm: (file: File) => void;
		onCancel: () => void;
	} = $props();

	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedAreaPixels = $state<CropArea | null>(null);
	let processing = $state(false);

	const modalOpen = $derived(open && !!imageSrc);

	$effect(() => {
		if (modalOpen) {
			crop = { x: 0, y: 0 };
			zoom = 1;
			croppedAreaPixels = null;
			processing = false;
		}
	});

	function onCropComplete(event: { pixels: CropArea }) {
		croppedAreaPixels = event.pixels;
	}

	async function confirmCrop() {
		if (!imageSrc || !croppedAreaPixels || processing) return;

		processing = true;

		try {
			const file = await cropAvatarToFile(imageSrc, croppedAreaPixels);
			onConfirm(file);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('validation.avatar.cropFailed'));
		} finally {
			processing = false;
		}
	}
</script>

{#if imageSrc}
	<AppModal
		open={modalOpen}
		labelledBy="avatar-crop-title"
		closeLabel={t('common.cancel')}
		onClose={onCancel}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
				<h2 id="avatar-crop-title" class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('avatarCrop.title')}</h2>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
					{t('profile.avatarHint', { size: AVATAR_OUTPUT_SIZE })}
				</p>
			</div>

			<div class="relative h-72 w-full bg-slate-900">
				<Cropper
					image={imageSrc}
					bind:crop
					bind:zoom
					aspect={1}
					cropShape="round"
					minZoom={1}
					maxZoom={3}
					oncropcomplete={onCropComplete}
				/>
			</div>

			<div class="space-y-4 p-4">
				<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">
					Zoom
					<input
						type="range"
						min={1}
						max={3}
						step={0.01}
						bind:value={zoom}
						class="mt-2 w-full accent-brand-700"
					/>
				</label>

				<div class="flex gap-2">
					<SubmitButton
						type="button"
						variant="ghost"
						class="w-auto! flex-1 rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-slate-700 dark:text-slate-300 dark:text-slate-600"
						disabled={processing}
						onclick={onCancel}
					>
						Cancel
					</SubmitButton>
					<SubmitButton
						type="button"
						class="flex-1"
						loading={processing}
						loadingLabel={t('avatarCrop.processing')}
						disabled={!croppedAreaPixels}
						onclick={confirmCrop}
					>
						Use photo
					</SubmitButton>
				</div>
			</div>
		</div>
	</AppModal>
{/if}
