import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function isValidTheme(value: string | null): value is Theme {
	return value === 'light' || value === 'dark';
}

function createThemeStore() {
	const stored = browser ? localStorage.getItem('theme') : null;
	const initialTheme = isValidTheme(stored)
		? stored
		: browser && window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';

	const { subscribe, set, update } = writable<Theme>(initialTheme);

	return {
		subscribe,
		toggle: () => {
			update((current) => {
				const next = current === 'light' ? 'dark' : 'light';
				if (browser) {
					localStorage.setItem('theme', next);
					document.documentElement.classList.toggle('dark', next === 'dark');
				}
				return next;
			});
		},
		set: (theme: Theme) => {
			if (browser) {
				localStorage.setItem('theme', theme);
				document.documentElement.classList.toggle('dark', theme === 'dark');
			}
			set(theme);
		},
		init: () => {
			if (browser) {
				const stored = localStorage.getItem('theme');
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				const theme = isValidTheme(stored) ? stored : (prefersDark ? 'dark' : 'light');
				document.documentElement.classList.toggle('dark', theme === 'dark');
				set(theme);
			}
		}
	};
}

export const theme = createThemeStore();
