export const HOT_NODE_THRESHOLDS = {
	selfTimePercent: 15,
	estimationErrorFactor: 10,
	largeTableRows: 10000,
	highFilterRemovalPercent: 50
} as const;

export const COLOR_SCALE = {
	cold: '#f3f4f6',
	warm: '#fde047',
	hot: '#f87171',
	critical: '#dc2626'
} as const;

export const NODE_TEXT_COLORS = {
	primary: '#111827',
	secondary: '#4b5563',
	onCritical: '#ffffff',
	highlight: '#991b1b'
} as const;

export const SELF_TIME_COLOR_THRESHOLDS = {
	warm: 5,
	hot: 15,
	critical: 30
} as const;
