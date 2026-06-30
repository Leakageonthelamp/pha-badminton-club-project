<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { portal } from '@repo/ui/actions/portal';

	let {
		value = $bindable(''),
		name,
		disabled = false,
		label = 'Description'
	}: {
		value?: string;
		name: string;
		disabled?: boolean;
		label?: string;
	} = $props();

	let element = $state<HTMLDivElement | null>(null);
	let editor = $state<Editor | null>(null);
	let textColorTriggerEl = $state<HTMLButtonElement | null>(null);
	let highlightTriggerEl = $state<HTMLButtonElement | null>(null);
	let textColorOpen = $state(false);
	let highlightOpen = $state(false);
	let menuTop = $state(0);
	let menuLeft = $state(0);

	const MENU_WIDTH = 176;

	let active = $state({
		bold: false,
		italic: false,
		bulletList: false,
		orderedList: false,
		link: false
	});

	const TEXT_COLORS = [
		{ label: 'Default', value: null },
		{ label: 'Black', value: '#0f172a' },
		{ label: 'Red', value: '#dc2626' },
		{ label: 'Blue', value: '#2563eb' },
		{ label: 'Purple', value: '#7c3aed' },
		{ label: 'Green', value: '#059669' }
	] as const;

	const HIGHLIGHT_COLORS = [
		{ label: 'None', value: null },
		{ label: 'Yellow', value: '#fef08a' },
		{ label: 'Blue', value: '#bfdbfe' },
		{ label: 'Pink', value: '#fecdd3' },
		{ label: 'Green', value: '#bbf7d0' },
		{ label: 'Orange', value: '#fed7aa' }
	] as const;

	const toolbarBtnClass =
		'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-white aria-pressed:text-brand-700 aria-pressed:shadow-sm';
	const toolbarGroupClass =
		'flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white/70 p-0.5';

	const syncActive = (currentEditor: Editor) => {
		active = {
			bold: currentEditor.isActive('bold'),
			italic: currentEditor.isActive('italic'),
			bulletList: currentEditor.isActive('bulletList'),
			orderedList: currentEditor.isActive('orderedList'),
			link: currentEditor.isActive('link')
		};
	};

	const closeMenus = () => {
		textColorOpen = false;
		highlightOpen = false;
	};

	const updateMenuPosition = (trigger: HTMLButtonElement | null) => {
		if (!trigger) return;

		const rect = trigger.getBoundingClientRect();
		let left = rect.left;

		if (left + MENU_WIDTH > window.innerWidth - 8) {
			left = rect.right - MENU_WIDTH;
		}

		menuLeft = Math.max(8, left);
		menuTop = rect.bottom + 4;
	};

	onMount(() => {
		if (!element) return;

		let destroyed = false;
		let cleanupPointerDown: (() => void) | undefined;

		void (async () => {
			const [{ Editor }, { default: StarterKit }, { TextStyle }, { default: Color }, { default: Highlight }] =
				await Promise.all([
					import('@tiptap/core'),
					import('@tiptap/starter-kit'),
					import('@tiptap/extension-text-style'),
					import('@tiptap/extension-color'),
					import('@tiptap/extension-highlight')
				]);

			if (destroyed || !element) return;

			editor = new Editor({
				element,
				extensions: [
					StarterKit.configure({
						link: {
							openOnClick: false,
							autolink: true,
							defaultProtocol: 'https'
						}
					}),
					TextStyle,
					Color,
					Highlight.configure({ multicolor: true })
				],
				content: value,
				editable: !disabled,
				onUpdate: ({ editor: currentEditor }) => {
					value = currentEditor.getHTML();
				},
				onSelectionUpdate: ({ editor: currentEditor }) => syncActive(currentEditor),
				onTransaction: ({ editor: currentEditor }) => syncActive(currentEditor)
			});

			syncActive(editor);

			const onPointerDown = (event: PointerEvent) => {
				const target = event.target;
				if (!(target instanceof Node)) return;
				if (
					target instanceof Element &&
					(target.closest('[data-rich-text-menu]') || target.closest('[data-rich-text-menu-trigger]'))
				) {
					return;
				}
				closeMenus();
			};

			document.addEventListener('pointerdown', onPointerDown);
			cleanupPointerDown = () => document.removeEventListener('pointerdown', onPointerDown);
		})();

		return () => {
			destroyed = true;
			cleanupPointerDown?.();
			editor?.destroy();
			editor = null;
		};
	});

	onDestroy(() => {
		editor?.destroy();
	});

	$effect(() => {
		if (!editor) return;
		editor.setEditable(!disabled);
	});

	$effect(() => {
		if (!textColorOpen && !highlightOpen) return;

		const trigger = textColorOpen ? textColorTriggerEl : highlightTriggerEl;
		updateMenuPosition(trigger);

		const onLayoutChange = () => updateMenuPosition(trigger);
		window.addEventListener('resize', onLayoutChange);
		window.addEventListener('scroll', onLayoutChange, true);

		return () => {
			window.removeEventListener('resize', onLayoutChange);
			window.removeEventListener('scroll', onLayoutChange, true);
		};
	});

	$effect(() => {
		if (!editor) return;

		const current = editor.getHTML();
		if (value === current) return;

		editor.commands.setContent(value, { emitUpdate: false });
	});

	const runCommand = (command: () => void) => {
		if (disabled) return;
		command();
	};

	const setLink = () => {
		closeMenus();
		const previousUrl = editor?.getAttributes('link').href as string | undefined;
		const href = window.prompt('Link URL', previousUrl ?? 'https://');

		if (href === null) return;

		if (href === '') {
			runCommand(() => editor?.chain().focus().extendMarkRange('link').unsetLink().run());
			return;
		}

		runCommand(() => editor?.chain().focus().extendMarkRange('link').setLink({ href }).run());
	};

	const applyTextColor = (color: string | null) => {
		closeMenus();
		if (!color) {
			runCommand(() => editor?.chain().focus().unsetColor().run());
			return;
		}
		runCommand(() => editor?.chain().focus().setColor(color).run());
	};

	const applyHighlight = (color: string | null) => {
		closeMenus();
		if (!color) {
			runCommand(() => editor?.chain().focus().unsetHighlight().run());
			return;
		}
		runCommand(() => editor?.chain().focus().toggleHighlight({ color }).run());
	};

	const toggleTextColorMenu = () => {
		if (disabled) return;
		highlightOpen = false;
		textColorOpen = !textColorOpen;
		if (textColorOpen) updateMenuPosition(textColorTriggerEl);
	};

	const toggleHighlightMenu = () => {
		if (disabled) return;
		textColorOpen = false;
		highlightOpen = !highlightOpen;
		if (highlightOpen) updateMenuPosition(highlightTriggerEl);
	};
</script>

<div class="space-y-2">
	<span class="text-sm font-medium text-slate-700">{label}</span>

	<div
		class="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20"
	>
		<div
			class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2"
			role="toolbar"
			aria-label="{label} formatting"
		>
			<div class={toolbarGroupClass}>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Bold"
					aria-label="Bold"
					aria-pressed={active.bold}
					onclick={() => runCommand(() => editor?.chain().focus().toggleBold().run())}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path
							d="M8 11h4.5a2.5 2.5 0 0 0 0-5H8v5zm0 2v5h5.5a3.5 3.5 0 0 0 0-7H8z"
						/>
					</svg>
				</button>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Italic"
					aria-label="Italic"
					aria-pressed={active.italic}
					onclick={() => runCommand(() => editor?.chain().focus().toggleItalic().run())}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M10 4h8v2h-3l-4 12h3v2H6v-2h3l4-12h-3V4z" />
					</svg>
				</button>
			</div>

			<div class={toolbarGroupClass}>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Bullet list"
					aria-label="Bullet list"
					aria-pressed={active.bulletList}
					onclick={() => runCommand(() => editor?.chain().focus().toggleBulletList().run())}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path stroke-linecap="round" d="M9 6h12M9 12h12M9 18h12" />
						<circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
						<circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
						<circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
					</svg>
				</button>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Numbered list"
					aria-label="Numbered list"
					aria-pressed={active.orderedList}
					onclick={() => runCommand(() => editor?.chain().focus().toggleOrderedList().run())}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path stroke-linecap="round" d="M10 6h11M10 12h11M10 18h11" />
						<text x="2" y="8" fill="currentColor" stroke="none" font-size="7" font-weight="600">1</text>
						<text x="2" y="14" fill="currentColor" stroke="none" font-size="7" font-weight="600">2</text>
						<text x="2" y="20" fill="currentColor" stroke="none" font-size="7" font-weight="600">3</text>
					</svg>
				</button>
			</div>

			<div class={toolbarGroupClass}>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Add link"
					aria-label="Add link"
					aria-pressed={active.link}
					onclick={setLink}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
						/>
					</svg>
				</button>
				<button
					type="button"
					class={toolbarBtnClass}
					{disabled}
					title="Remove link"
					aria-label="Remove link"
					onclick={() => runCommand(() => editor?.chain().focus().unsetLink().run())}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path stroke-linecap="round" d="M9 9l6 6M15 9l-6 6" />
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
						/>
					</svg>
				</button>
			</div>

			<div class={toolbarGroupClass}>
				<button
					bind:this={textColorTriggerEl}
					type="button"
					class="{toolbarBtnClass} w-auto gap-1 px-2"
					data-rich-text-menu-trigger
					{disabled}
					title="Text color"
					aria-label="Text color"
					aria-expanded={textColorOpen}
					onclick={toggleTextColorMenu}
				>
					<span class="text-sm font-bold leading-none text-slate-800">A</span>
					<span class="h-1 w-4 rounded-full bg-slate-800"></span>
				</button>

				<button
					bind:this={highlightTriggerEl}
					type="button"
					class="{toolbarBtnClass} w-auto gap-1 px-2"
					data-rich-text-menu-trigger
					{disabled}
					title="Highlight"
					aria-label="Highlight"
					aria-expanded={highlightOpen}
					onclick={toggleHighlightMenu}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 20h9M4 13l8.5-8.5a2.1 2.1 0 0 1 3 3L7 16l-3 1 1-4z"
						/>
					</svg>
					<span class="h-1 w-4 rounded-full bg-yellow-200"></span>
				</button>
			</div>
		</div>

		<div
			bind:this={element}
			class="min-h-32 px-4 py-3 text-base [&_.ProseMirror]:min-h-24 [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-brand-700 [&_.ProseMirror_a]:underline [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5"
		></div>
	</div>

	<input type="hidden" {name} {value} />
</div>

{#if textColorOpen}
	<div use:portal>
		<div
			class="fixed z-[110] w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
			style:top="{menuTop}px"
			style:left="{menuLeft}px"
			data-rich-text-menu
			role="menu"
		>
			<p class="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				Text color
			</p>
			<div class="grid grid-cols-3 gap-1.5">
				{#each TEXT_COLORS as swatch (swatch.label)}
					<button
						type="button"
						role="menuitem"
						class="flex h-8 items-center justify-center rounded-lg border border-slate-200 text-xs transition hover:ring-2 hover:ring-brand-500/30 {swatch.value ===
						null
							? 'bg-white text-slate-500'
							: ''}"
						style:background-color={swatch.value ?? undefined}
						title={swatch.label}
						aria-label={swatch.label}
						onclick={() => applyTextColor(swatch.value)}
					>
						{#if swatch.value === null}
							<span class="text-[10px] font-medium">Auto</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

{#if highlightOpen}
	<div use:portal>
		<div
			class="fixed z-[110] w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
			style:top="{menuTop}px"
			style:left="{menuLeft}px"
			data-rich-text-menu
			role="menu"
		>
			<p class="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				Highlight
			</p>
			<div class="grid grid-cols-3 gap-1.5">
				{#each HIGHLIGHT_COLORS as swatch (swatch.label)}
					<button
						type="button"
						role="menuitem"
						class="flex h-8 items-center justify-center rounded-lg border border-slate-200 text-xs transition hover:ring-2 hover:ring-brand-500/30 {swatch.value ===
						null
							? 'bg-white text-slate-500'
							: ''}"
						style:background-color={swatch.value ?? undefined}
						title={swatch.label}
						aria-label={swatch.label}
						onclick={() => applyHighlight(swatch.value)}
					>
						{#if swatch.value === null}
							<span class="text-[10px] font-medium">None</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
