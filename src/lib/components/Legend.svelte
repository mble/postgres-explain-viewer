<script lang="ts">
	import { COLOR_SCALE, SELF_TIME_COLOR_THRESHOLDS } from '$lib/constants/thresholds';
</script>

<div class="flex items-center gap-3 text-[11px]">
	<span class="font-medium text-[var(--text-secondary)]">Performance:</span>
	<div class="flex items-center gap-2.5">
		<div class="flex items-center gap-1.5 group" data-tooltip="Low impact">
			<span class="w-3 h-3 rounded-sm shadow-sm ring-1 ring-black/5" style="background-color: {COLOR_SCALE.cold}"></span>
			<span class="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">&lt;{SELF_TIME_COLOR_THRESHOLDS.warm}%</span>
		</div>
		<div class="flex items-center gap-1.5 group" data-tooltip="Moderate">
			<span class="w-3 h-3 rounded-sm shadow-sm ring-1 ring-black/5" style="background-color: {COLOR_SCALE.warm}"></span>
			<span class="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">{SELF_TIME_COLOR_THRESHOLDS.warm}-{SELF_TIME_COLOR_THRESHOLDS.hot}%</span>
		</div>
		<div class="flex items-center gap-1.5 group" data-tooltip="High impact">
			<span class="w-3 h-3 rounded-sm shadow-sm ring-1 ring-black/5" style="background-color: {COLOR_SCALE.hot}"></span>
			<span class="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">{SELF_TIME_COLOR_THRESHOLDS.hot}-{SELF_TIME_COLOR_THRESHOLDS.critical}%</span>
		</div>
		<div class="flex items-center gap-1.5 group" data-tooltip="Critical">
			<span class="w-3 h-3 rounded-sm shadow-sm ring-1 ring-black/5" style="background-color: {COLOR_SCALE.critical}"></span>
			<span class="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">&gt;{SELF_TIME_COLOR_THRESHOLDS.critical}%</span>
		</div>
	</div>
</div>
