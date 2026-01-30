/**
 * Export utilities for plan visualization
 * Supports SVG, PNG, and Markdown export formats
 */

import type { AnalyzedPlan, Suggestion } from '$lib/types/explain';

/**
 * Export the SVG visualization
 */
export function exportSvg(svgElement: SVGSVGElement, filename = 'query-plan.svg'): void {
	// Clone the SVG to avoid modifying the original
	const clone = svgElement.cloneNode(true) as SVGSVGElement;

	// Get computed styles and inline them
	inlineStyles(clone);

	// Serialize
	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(clone);

	// Create blob and download
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	downloadBlob(blob, filename);
}

/**
 * Export the visualization as PNG
 */
export async function exportPng(
	svgElement: SVGSVGElement,
	filename = 'query-plan.png',
	scale = 2
): Promise<void> {
	// Clone and inline styles
	const clone = svgElement.cloneNode(true) as SVGSVGElement;
	inlineStyles(clone);

	// Get dimensions
	const bbox = svgElement.getBBox();
	const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) ?? [0, 0, bbox.width, bbox.height];
	const width = viewBox[2] * scale;
	const height = viewBox[3] * scale;

	// Set explicit dimensions
	clone.setAttribute('width', String(width));
	clone.setAttribute('height', String(height));

	// Serialize SVG
	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(clone);
	const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(svgBlob);

	// Create image and canvas
	const img = new Image();
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		URL.revokeObjectURL(url);
		throw new Error('Failed to get canvas context');
	}

	return new Promise((resolve, reject) => {
		img.onload = () => {
			// Fill white background
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);

			// Draw SVG
			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(url);

			// Export as PNG
			canvas.toBlob((blob) => {
				if (blob) {
					downloadBlob(blob, filename);
					resolve();
				} else {
					reject(new Error('Failed to create PNG blob'));
				}
			}, 'image/png');
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG image'));
		};

		img.src = url;
	});
}

/**
 * Export plan analysis as Markdown report
 */
export function exportMarkdown(plan: AnalyzedPlan, filename = 'query-analysis.md'): void {
	const lines: string[] = [];

	// Header
	lines.push('# PostgreSQL Query Analysis Report');
	lines.push('');
	lines.push(`Generated: ${new Date().toLocaleString()}`);
	lines.push('');

	// Summary
	lines.push('## Summary');
	lines.push('');
	lines.push('| Metric | Value |');
	lines.push('|--------|-------|');

	if (plan.executionTime !== null) {
		lines.push(`| Execution Time | ${plan.executionTime.toFixed(2)} ms |`);
	}
	if (plan.planningTime !== null) {
		lines.push(`| Planning Time | ${plan.planningTime.toFixed(2)} ms |`);
	}
	lines.push(`| Total Time | ${plan.totalTime.toFixed(2)} ms |`);

	if (plan.bufferStats) {
		const hitRate = plan.bufferStats.sharedHit + plan.bufferStats.sharedRead > 0
			? ((plan.bufferStats.sharedHit / (plan.bufferStats.sharedHit + plan.bufferStats.sharedRead)) * 100).toFixed(1)
			: 'N/A';
		lines.push(`| Buffer Hit Rate | ${hitRate}% |`);
	}

	lines.push('');

	// Query (if available)
	if (plan.queryText) {
		lines.push('## Query');
		lines.push('');
		lines.push('```sql');
		lines.push(plan.queryText);
		lines.push('```');
		lines.push('');
	}

	// Suggestions by category
	if (plan.allSuggestions.length > 0) {
		lines.push('## Optimization Suggestions');
		lines.push('');

		const byCategory = groupSuggestionsByCategory(plan.allSuggestions);

		for (const [category, suggestions] of Object.entries(byCategory)) {
			lines.push(`### ${formatCategory(category)}`);
			lines.push('');

			for (const suggestion of suggestions) {
				const icon = suggestion.severity === 'critical' ? '🔴' : suggestion.severity === 'warning' ? '🟡' : 'ℹ️';
				lines.push(`${icon} **${suggestion.title}**`);
				lines.push('');
				lines.push(`> ${suggestion.description}`);
				lines.push('');
			}
		}
	} else {
		lines.push('## Optimization Suggestions');
		lines.push('');
		lines.push('✅ No significant issues found. The query plan looks optimized.');
		lines.push('');
	}

	// Plan tree outline
	lines.push('## Plan Structure');
	lines.push('');
	lines.push('```');
	lines.push(renderPlanTree(plan.root));
	lines.push('```');
	lines.push('');

	// Buffer stats (if available)
	if (plan.bufferStats) {
		lines.push('## Buffer Statistics');
		lines.push('');
		lines.push('| Type | Hit | Read | Dirtied | Written |');
		lines.push('|------|-----|------|---------|---------|');
		lines.push(`| Shared | ${plan.bufferStats.sharedHit} | ${plan.bufferStats.sharedRead} | ${plan.bufferStats.sharedDirtied} | ${plan.bufferStats.sharedWritten} |`);
		if (plan.bufferStats.localHit > 0 || plan.bufferStats.localRead > 0) {
			lines.push(`| Local | ${plan.bufferStats.localHit} | ${plan.bufferStats.localRead} | ${plan.bufferStats.localDirtied} | ${plan.bufferStats.localWritten} |`);
		}
		if (plan.bufferStats.tempRead > 0 || plan.bufferStats.tempWritten > 0) {
			lines.push(`| Temp | N/A | ${plan.bufferStats.tempRead} | N/A | ${plan.bufferStats.tempWritten} |`);
		}
		lines.push('');
	}

	// Footer
	lines.push('---');
	lines.push('');
	lines.push('*Generated by PostgreSQL EXPLAIN Viewer*');

	const content = lines.join('\n');
	const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
	downloadBlob(blob, filename);
}

function groupSuggestionsByCategory(suggestions: Suggestion[]): Record<string, Suggestion[]> {
	const grouped: Record<string, Suggestion[]> = {};
	for (const suggestion of suggestions) {
		if (!grouped[suggestion.category]) {
			grouped[suggestion.category] = [];
		}
		grouped[suggestion.category].push(suggestion);
	}
	return grouped;
}

function formatCategory(category: string): string {
	const names: Record<string, string> = {
		indexing: 'Indexing',
		statistics: 'Statistics',
		'join-strategy': 'Join Strategy',
		memory: 'Memory',
		filtering: 'Filtering'
	};
	return names[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function renderPlanTree(node: import('$lib/types/explain').AnalyzedPlanNode, indent = 0): string {
	const prefix = '  '.repeat(indent);
	const marker = indent === 0 ? '' : '└─ ';
	let line = `${prefix}${marker}${node['Node Type']}`;

	if (node['Relation Name']) {
		line += ` on ${node['Relation Name']}`;
	}
	if (node['Index Name']) {
		line += ` using ${node['Index Name']}`;
	}
	if (node.selfTimePercent > 1) {
		line += ` (${node.selfTimePercent.toFixed(1)}%)`;
	}
	if (node.isHot) {
		line += ' ⚠️';
	}

	const lines = [line];

	if (node.Plans) {
		for (const child of node.Plans) {
			lines.push(renderPlanTree(child, indent + 1));
		}
	}

	return lines.join('\n');
}

function inlineStyles(element: Element): void {
	const computed = window.getComputedStyle(element);
	const important = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'opacity'];

	for (const prop of important) {
		const value = computed.getPropertyValue(prop);
		if (value) {
			(element as HTMLElement).style.setProperty(prop, value);
		}
	}

	for (const child of element.children) {
		inlineStyles(child);
	}
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Generate LLM-friendly prompt text for plan analysis
 * Optimized for pasting into an LLM chat for further assistance
 */
export function generateLlmPrompt(plan: AnalyzedPlan): string {
	const lines: string[] = [];

	lines.push('I have a PostgreSQL query that needs optimization. Here is the EXPLAIN ANALYZE output and analysis:');
	lines.push('');

	// Query
	if (plan.queryText) {
		lines.push('## SQL Query');
		lines.push('```sql');
		lines.push(plan.queryText);
		lines.push('```');
		lines.push('');
	}

	// Key metrics
	lines.push('## Performance Metrics');
	if (plan.executionTime !== null) {
		lines.push(`- Execution Time: ${plan.executionTime.toFixed(2)} ms`);
	}
	if (plan.planningTime !== null) {
		lines.push(`- Planning Time: ${plan.planningTime.toFixed(2)} ms`);
	}
	lines.push(`- Total Time: ${plan.totalTime.toFixed(2)} ms`);

	if (plan.bufferStats) {
		const totalBlocks = plan.bufferStats.sharedHit + plan.bufferStats.sharedRead;
		if (totalBlocks > 0) {
			const hitRate = ((plan.bufferStats.sharedHit / totalBlocks) * 100).toFixed(1);
			lines.push(`- Buffer Hit Rate: ${hitRate}% (${plan.bufferStats.sharedHit} hits, ${plan.bufferStats.sharedRead} reads)`);
		}
		if (plan.bufferStats.tempRead > 0 || plan.bufferStats.tempWritten > 0) {
			lines.push(`- Temp Blocks: ${plan.bufferStats.tempRead} read, ${plan.bufferStats.tempWritten} written (spilling to disk)`);
		}
	}
	lines.push('');

	// Plan structure with metrics
	lines.push('## Execution Plan');
	lines.push('```');
	lines.push(renderLlmPlanTree(plan.root));
	lines.push('```');
	lines.push('');

	// Identified issues
	if (plan.allSuggestions.length > 0) {
		lines.push('## Identified Issues');
		lines.push('');

		const byCategory = groupSuggestionsByCategory(plan.allSuggestions);

		for (const [category, suggestions] of Object.entries(byCategory)) {
			lines.push(`### ${formatCategory(category)}`);
			for (const suggestion of suggestions) {
				const severity = suggestion.severity === 'critical' ? '[CRITICAL]' :
				                 suggestion.severity === 'warning' ? '[WARNING]' : '[INFO]';
				lines.push(`${severity} ${suggestion.title}`);
				lines.push(`  ${suggestion.description}`);
				lines.push('');
			}
		}
	} else {
		lines.push('## Identified Issues');
		lines.push('No significant issues detected by automated analysis.');
		lines.push('');
	}

	// Hot nodes detail
	const hotNodes = collectHotNodes(plan.root);
	if (hotNodes.length > 0) {
		lines.push('## Hot Nodes (most expensive)');
		for (const node of hotNodes) {
			lines.push(`- ${node['Node Type']}${node['Relation Name'] ? ` on "${node['Relation Name']}"` : ''}`);
			lines.push(`  Time: ${node.selfTime.toFixed(2)} ms (${node.selfTimePercent.toFixed(1)}% of total)`);
			if (node['Actual Rows'] !== undefined && node['Plan Rows'] !== undefined) {
				lines.push(`  Rows: ${node['Actual Rows']} actual vs ${node['Plan Rows']} estimated`);
			}
			if (node.hotReasons.length > 0) {
				lines.push(`  Flags: ${node.hotReasons.join(', ')}`);
			}
			lines.push('');
		}
	}

	lines.push('Please analyze this query plan and suggest specific optimizations. Consider:');
	lines.push('1. Index recommendations (columns, type, partial indexes)');
	lines.push('2. Query restructuring opportunities');
	lines.push('3. Configuration changes (work_mem, etc.)');
	lines.push('4. Any other performance improvements');

	return lines.join('\n');
}

/**
 * Copy LLM-friendly prompt to clipboard
 */
export async function copyLlmPrompt(plan: AnalyzedPlan): Promise<boolean> {
	const prompt = generateLlmPrompt(plan);
	try {
		await navigator.clipboard.writeText(prompt);
		return true;
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		return false;
	}
}

function renderLlmPlanTree(node: import('$lib/types/explain').AnalyzedPlanNode, indent = 0): string {
	const prefix = '  '.repeat(indent);
	const marker = indent === 0 ? '' : '-> ';

	let line = `${prefix}${marker}${node['Node Type']}`;

	if (node['Relation Name']) {
		line += ` on ${node['Relation Name']}`;
	}
	if (node['Index Name']) {
		line += ` using ${node['Index Name']}`;
	}

	// Add key metrics inline
	const metrics: string[] = [];
	if (node.selfTimePercent > 0.1) {
		metrics.push(`${node.selfTimePercent.toFixed(1)}% time`);
	}
	if (node['Actual Rows'] !== undefined) {
		metrics.push(`${node['Actual Rows']} rows`);
	}
	if (node['Actual Loops'] !== undefined && node['Actual Loops'] > 1) {
		metrics.push(`${node['Actual Loops']} loops`);
	}
	if (node.isHot) {
		metrics.push('HOT');
	}

	if (metrics.length > 0) {
		line += ` (${metrics.join(', ')})`;
	}

	const lines = [line];

	// Add filter info for relevant nodes
	if (node['Filter'] && node['Rows Removed by Filter']) {
		lines.push(`${prefix}  Filter: ${node['Filter']}`);
		lines.push(`${prefix}  Rows Removed: ${node['Rows Removed by Filter']}`);
	}

	if (node.Plans) {
		for (const child of node.Plans) {
			lines.push(renderLlmPlanTree(child, indent + 1));
		}
	}

	return lines.join('\n');
}

function collectHotNodes(node: import('$lib/types/explain').AnalyzedPlanNode): import('$lib/types/explain').AnalyzedPlanNode[] {
	const hot: import('$lib/types/explain').AnalyzedPlanNode[] = [];

	if (node.isHot) {
		hot.push(node);
	}

	if (node.Plans) {
		for (const child of node.Plans) {
			hot.push(...collectHotNodes(child));
		}
	}

	// Sort by self-time descending
	return hot.sort((a, b) => b.selfTime - a.selfTime);
}
