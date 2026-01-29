<script lang="ts">
	import { tokenizeSql, type SqlToken } from '$lib/utils/sql-highlighter';

	interface Props {
		sql: string;
	}

	let { sql }: Props = $props();

	const tokens = $derived(tokenizeSql(sql));
</script>

<pre class="code-block text-[10px] max-h-20 overflow-auto whitespace-pre-wrap">{#each tokens as token}<span class="sql-{token.type}">{token.value}</span>{/each}</pre>

<style>
	.sql-keyword {
		color: var(--sql-keyword, #7c3aed);
		font-weight: 600;
	}

	.sql-string {
		color: var(--sql-string, #059669);
	}

	.sql-number {
		color: var(--sql-number, #0891b2);
	}

	.sql-comment {
		color: var(--sql-comment, #9ca3af);
		font-style: italic;
	}

	.sql-operator {
		color: var(--sql-operator, #dc2626);
	}

	.sql-identifier {
		color: var(--sql-identifier, inherit);
	}

	.sql-text {
		color: inherit;
	}

	:global(.dark) .sql-keyword {
		--sql-keyword: #a78bfa;
	}

	:global(.dark) .sql-string {
		--sql-string: #34d399;
	}

	:global(.dark) .sql-number {
		--sql-number: #22d3ee;
	}

	:global(.dark) .sql-comment {
		--sql-comment: #6b7280;
	}

	:global(.dark) .sql-operator {
		--sql-operator: #f87171;
	}
</style>
