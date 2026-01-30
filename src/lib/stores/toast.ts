import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 0;

	function show(message: string, type: Toast['type'] = 'success', duration = 2500) {
		const id = nextId++;
		update((toasts) => [...toasts, { id, message, type }]);

		setTimeout(() => {
			dismiss(id);
		}, duration);
	}

	function dismiss(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string) => show(message, 'success'),
		error: (message: string) => show(message, 'error'),
		info: (message: string) => show(message, 'info'),
		dismiss
	};
}

export const toast = createToastStore();
