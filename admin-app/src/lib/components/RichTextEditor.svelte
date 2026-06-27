<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

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

	onMount(() => {
		if (!element) return;

		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					link: {
						openOnClick: false,
						autolink: true,
						defaultProtocol: 'https'
					}
				})
			],
			content: value,
			editable: !disabled,
			onUpdate: ({ editor: currentEditor }) => {
				value = currentEditor.getHTML();
			}
		});

		return () => {
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

	const runCommand = (command: () => void) => {
		if (disabled) return;
		command();
	};
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-2">
		<span class="text-sm font-medium text-slate-700">{label}</span>
		<div class="flex flex-wrap gap-1">
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				disabled={disabled}
				onclick={() => runCommand(() => editor?.chain().focus().toggleBold().run())}
			>
				Bold
			</button>
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				disabled={disabled}
				onclick={() => runCommand(() => editor?.chain().focus().toggleItalic().run())}
			>
				Italic
			</button>
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				disabled={disabled}
				onclick={() => runCommand(() => editor?.chain().focus().toggleBulletList().run())}
			>
				Bullets
			</button>
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				disabled={disabled}
				onclick={() => runCommand(() => editor?.chain().focus().toggleOrderedList().run())}
			>
				Numbered
			</button>
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				disabled={disabled}
				onclick={() => {
					const href = window.prompt('Link URL');
					if (!href) return;
					runCommand(() =>
						editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
					);
				}}
			>
				Link
			</button>
		</div>
	</div>

	<div
		bind:this={element}
		class="min-h-32 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 [&_.ProseMirror]:min-h-24 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-2"
	></div>

	<input type="hidden" {name} {value} />
</div>
