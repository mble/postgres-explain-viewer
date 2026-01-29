<script lang="ts">
	import { onMount } from 'svelte';
	// Tree-shaken D3 imports - only import what we need (~60KB vs ~500KB)
	import { select } from 'd3-selection';
	import { hierarchy, tree } from 'd3-hierarchy';
	import { linkHorizontal } from 'd3-shape';
	import { zoom as d3zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
	import type { Selection, BaseType } from 'd3-selection';
	import type { HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy';
	import type { ZoomBehavior, ZoomTransform } from 'd3-zoom';
	import { analyzedPlan, selectedNodeId, selectNode } from '$lib/stores/plan';
	import { theme } from '$lib/stores/theme';
	import { transformToTree, type TreeNode } from '$lib/utils/tree-transform';
	import { SELF_TIME_COLOR_THRESHOLDS, COLOR_SCALE, NODE_TEXT_COLORS } from '$lib/constants/thresholds';
	import type { AnalyzedPlanNode } from '$lib/types/explain';

	let container: HTMLDivElement;
	let svg: Selection<SVGSVGElement, unknown, null, undefined>;
	let g: Selection<SVGGElement, unknown, null, undefined>;
	let zoom: ZoomBehavior<SVGSVGElement, unknown>;
	let nodePositions: Map<string, { x: number; y: number }> = new Map();

	// Larger card dimensions
	const nodeWidth = 260;
	const nodeHeight = 100;
	const headerHeight = 24;
	const margin = { top: 20, right: 140, bottom: 20, left: 140 };

	function getNodeColor(selfTimePercent: number): string {
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.critical) return COLOR_SCALE.critical;
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.hot) return COLOR_SCALE.hot;
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.warm) return COLOR_SCALE.warm;
		return COLOR_SCALE.cold;
	}

	function getHeaderColor(selfTimePercent: number, isDark: boolean): string {
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.critical) return '#b91c1c'; // red-700
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.hot) return '#dc2626'; // red-600
		if (selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.warm) return '#ca8a04'; // yellow-600
		return isDark ? '#374151' : '#e5e7eb'; // gray-700 / gray-200
	}

	function getThemeColors(isDark: boolean) {
		return {
			linkStroke: isDark ? '#4b5563' : '#cbd5e1',
			nodeStroke: isDark ? '#4b5563' : '#d1d5db',
			nodeStrokeHot: '#ef4444',
			nodeStrokeSelected: '#2563eb',
			nodeBg: isDark ? '#1f2937' : '#ffffff',
			textPrimary: isDark ? '#f3f4f6' : '#1f2937',
			textSecondary: isDark ? '#9ca3af' : '#6b7280',
			textMuted: isDark ? '#6b7280' : '#9ca3af',
			divider: isDark ? '#374151' : '#e5e7eb'
		};
	}

	function formatNumber(n: number): string {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return n.toLocaleString();
	}

	function formatTime(ms: number): string {
		if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
		if (ms >= 1) return ms.toFixed(1) + 'ms';
		return ms.toFixed(2) + 'ms';
	}

	function findMostProblematicNode(root: AnalyzedPlanNode): string | null {
		let worstNodeId: string | null = null;
		let worstScore = 0;

		function traverse(node: AnalyzedPlanNode): void {
			// Score based on self-time percentage and hot reasons
			let score = node.selfTimePercent;
			if (node.isHot) score += 10;
			score += node.hotReasons.length * 5;

			if (score > worstScore) {
				worstScore = score;
				worstNodeId = node.id;
			}

			if (node.Plans) {
				for (const child of node.Plans) {
					traverse(child);
				}
			}
		}

		traverse(root);
		return worstNodeId;
	}

	// Track if we've done initial zoom to avoid resetting on resize/theme changes
	let hasInitialZoom = false;
	let currentTransform: ZoomTransform | null = null;

	function renderTree(plan: typeof $analyzedPlan, isDark: boolean = false, initialRender: boolean = false) {
		if (!plan || !container) return;

		const colors = getThemeColors(isDark);
		const treeData = transformToTree(plan.root);
		const width = container.clientWidth;
		const height = container.clientHeight;

		// Save current transform before re-render (for resize/theme changes)
		if (svg !== undefined && zoom !== undefined && hasInitialZoom) {
			currentTransform = zoomTransform(svg.node()!);
		}

		// Clear previous content
		select(container).selectAll('*').remove();

		svg = select(container)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${width} ${height}`);

		g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Create tree layout with larger spacing
		const treeLayout = tree<TreeNode>()
			.nodeSize([nodeHeight + 30, nodeWidth + 60]);

		const root = hierarchy(treeData);
		const treeRoot = treeLayout(root);

		// Calculate bounds
		let minY = Infinity, maxY = -Infinity;
		treeRoot.each(d => {
			if (d.x < minY) minY = d.x;
			if (d.x > maxY) maxY = d.x;
		});

		// Adjust vertical position to center
		const treeHeight = maxY - minY;
		const offsetY = (height - margin.top - margin.bottom - treeHeight) / 2 - minY;

		// Draw links
		g.selectAll('.link')
			.data(treeRoot.links())
			.enter()
			.append('path')
			.attr('class', 'link')
			.attr('fill', 'none')
			.attr('stroke', colors.linkStroke)
			.attr('stroke-width', 2)
			.attr('d', linkHorizontal<HierarchyPointLink<TreeNode>, HierarchyPointNode<TreeNode>>()
				.x(d => d.y)
				.y(d => d.x + offsetY)
			);

		// Store node positions for centering
		nodePositions = new Map();
		treeRoot.descendants().forEach(d => {
			nodePositions.set(d.data.id, { x: d.y, y: d.x + offsetY });
		});

		// Create node groups
		const nodes = g.selectAll('.node')
			.data(treeRoot.descendants())
			.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', d => `translate(${d.y},${d.x + offsetY})`)
			.style('cursor', 'pointer')
			.on('click', (event, d) => {
				event.stopPropagation();
				selectNode(d.data.id);
			});

		// Draw card shadow
		nodes.append('rect')
			.attr('x', -nodeWidth / 2 + 2)
			.attr('y', -nodeHeight / 2 + 2)
			.attr('width', nodeWidth)
			.attr('height', nodeHeight)
			.attr('rx', 8)
			.attr('ry', 8)
			.attr('fill', isDark ? '#000000' : '#00000020')
			.attr('opacity', 0.1);

		// Draw main card background
		nodes.append('rect')
			.attr('class', 'card-bg')
			.attr('x', -nodeWidth / 2)
			.attr('y', -nodeHeight / 2)
			.attr('width', nodeWidth)
			.attr('height', nodeHeight)
			.attr('rx', 8)
			.attr('ry', 8)
			.attr('fill', colors.nodeBg)
			.attr('stroke', d => d.data.data.isHot ? colors.nodeStrokeHot : colors.nodeStroke)
			.attr('stroke-width', d => d.data.data.isHot ? 2 : 1);

		// Draw header bar
		nodes.append('rect')
			.attr('x', -nodeWidth / 2)
			.attr('y', -nodeHeight / 2)
			.attr('width', nodeWidth)
			.attr('height', headerHeight)
			.attr('rx', 8)
			.attr('ry', 8)
			.attr('fill', d => getHeaderColor(d.data.data.selfTimePercent, isDark));

		// Cover bottom corners of header
		nodes.append('rect')
			.attr('x', -nodeWidth / 2)
			.attr('y', -nodeHeight / 2 + headerHeight - 8)
			.attr('width', nodeWidth)
			.attr('height', 8)
			.attr('fill', d => getHeaderColor(d.data.data.selfTimePercent, isDark));

		// Draw node type in header
		nodes.append('text')
			.attr('x', -nodeWidth / 2 + 10)
			.attr('y', -nodeHeight / 2 + 16)
			.attr('font-size', '11px')
			.attr('font-weight', '600')
			.attr('fill', d => {
				const pct = d.data.data.selfTimePercent;
				if (pct >= SELF_TIME_COLOR_THRESHOLDS.warm) return '#ffffff';
				return isDark ? '#f3f4f6' : '#374151';
			})
			.text(d => d.data.data['Node Type']);

		// Draw percentage badge in header (right side)
		nodes.each(function(d) {
			const pct = d.data.data.selfTimePercent;
			if (pct > 0.1) {
				const node = select(this);
				const badgeText = `${pct.toFixed(1)}%`;

				node.append('text')
					.attr('x', nodeWidth / 2 - 10)
					.attr('y', -nodeHeight / 2 + 16)
					.attr('text-anchor', 'end')
					.attr('font-size', '10px')
					.attr('font-weight', '700')
					.attr('fill', pct >= SELF_TIME_COLOR_THRESHOLDS.warm ? '#ffffff' : (isDark ? '#d1d5db' : '#6b7280'))
					.text(badgeText);
			}
		});

		// Draw relation/table name
		nodes.append('text')
			.attr('x', -nodeWidth / 2 + 10)
			.attr('y', -nodeHeight / 2 + headerHeight + 16)
			.attr('font-size', '12px')
			.attr('font-weight', '500')
			.attr('fill', colors.textPrimary)
			.text((d): string => {
				const node = d.data.data;
				if (node['Relation Name']) return node['Relation Name'];
				if (node['Index Name']) return node['Index Name'];
				if (node['CTE Name']) return `CTE: ${node['CTE Name']}`;
				if (node['Function Name']) return String(node['Function Name']);
				if (node['Join Type']) return `${node['Join Type']} Join`;
				return '';
			});

		// Draw metrics row
		const metricsY = -nodeHeight / 2 + headerHeight + 36;

		// Rows metric
		nodes.each(function(d) {
			const node = select(this);
			const data = d.data.data;
			let xOffset = -nodeWidth / 2 + 10;

			// Actual Rows
			if (data['Actual Rows'] !== undefined) {
				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY)
					.attr('font-size', '9px')
					.attr('fill', colors.textMuted)
					.text('rows');

				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY + 12)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.attr('font-family', 'ui-monospace, monospace')
					.attr('fill', colors.textPrimary)
					.text(formatNumber(data['Actual Rows']));

				xOffset += 65;
			}

			// Self Time
			if (data.selfTime > 0) {
				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY)
					.attr('font-size', '9px')
					.attr('fill', colors.textMuted)
					.text('time');

				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY + 12)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.attr('font-family', 'ui-monospace, monospace')
					.attr('fill', data.selfTimePercent >= SELF_TIME_COLOR_THRESHOLDS.hot ? '#dc2626' : colors.textPrimary)
					.text(formatTime(data.selfTime));

				xOffset += 65;
			}

			// Loops (if > 1)
			if (data['Actual Loops'] && data['Actual Loops'] > 1) {
				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY)
					.attr('font-size', '9px')
					.attr('fill', colors.textMuted)
					.text('loops');

				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY + 12)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.attr('font-family', 'ui-monospace, monospace')
					.attr('fill', colors.textPrimary)
					.text(formatNumber(data['Actual Loops']));

				xOffset += 55;
			}

			// Buffers indicator
			const hasBuffers = data['Shared Read Blocks'] && data['Shared Read Blocks'] > 0;
			if (hasBuffers) {
				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY)
					.attr('font-size', '9px')
					.attr('fill', colors.textMuted)
					.text('read');

				node.append('text')
					.attr('x', xOffset)
					.attr('y', metricsY + 12)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.attr('font-family', 'ui-monospace, monospace')
					.attr('fill', colors.textPrimary)
					.text(formatNumber(data['Shared Read Blocks'] ?? 0));
			}
		});

		// Draw warning indicators for hot nodes
		nodes.each(function(d) {
			if (d.data.data.isHot) {
				const node = select(this);
				node.append('circle')
					.attr('cx', nodeWidth / 2 - 12)
					.attr('cy', -nodeHeight / 2 + headerHeight + 16)
					.attr('r', 6)
					.attr('fill', '#ef4444');

				node.append('text')
					.attr('x', nodeWidth / 2 - 12)
					.attr('y', -nodeHeight / 2 + headerHeight + 20)
					.attr('text-anchor', 'middle')
					.attr('font-size', '10px')
					.attr('font-weight', '700')
					.attr('fill', '#ffffff')
					.text('!');
			}
		});

		// Setup zoom
		zoom = d3zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.2, 3])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
			});

		svg.call(zoom);

		// Restore previous transform if we already had a zoom (resize/theme change)
		if (currentTransform && hasInitialZoom) {
			svg.call(zoom.transform, currentTransform);
			return;
		}

		// Initial zoom - center on most problematic node or fit to view
		if (initialRender && !hasInitialZoom) {
			const worstNodeId = findMostProblematicNode(plan.root);
			if (worstNodeId) {
				const pos = nodePositions.get(worstNodeId);
				if (pos) {
					const targetScale = 1.0;
					const translateX = width / 2 - pos.x * targetScale;
					const translateY = height / 2 - pos.y * targetScale;

					svg.call(
						zoom.transform,
						zoomIdentity.translate(translateX, translateY).scale(targetScale)
					);
					hasInitialZoom = true;
					return;
				}
			}
		}

		// Fallback: fit entire tree in view
		const bounds = g.node()?.getBBox();
		if (bounds) {
			const fullWidth = bounds.width + margin.left + margin.right;
			const fullHeight = bounds.height + margin.top + margin.bottom;
			const scale = Math.min(
				width / fullWidth,
				height / fullHeight,
				1
			) * 0.85;
			const translateX = (width - bounds.width * scale) / 2 - bounds.x * scale;
			const translateY = (height - bounds.height * scale) / 2 - bounds.y * scale;

			svg.call(
				zoom.transform,
				zoomIdentity.translate(translateX, translateY).scale(scale)
			);
			hasInitialZoom = true;
		}
	}

	function centerOnNode(nodeId: string) {
		if (!svg || !zoom || !container) return;

		const pos = nodePositions.get(nodeId);
		if (!pos) return;

		const width = container.clientWidth;
		const height = container.clientHeight;

		// Zoom to a comfortable scale for viewing the node
		const targetScale = 1.0;

		// Calculate translation to center the node
		const translateX = width / 2 - pos.x * targetScale;
		const translateY = height / 2 - pos.y * targetScale;

		svg.transition()
			.duration(400)
			.call(
				zoom.transform,
				zoomIdentity.translate(translateX, translateY).scale(targetScale)
			);
	}

	function updateSelection(nodeId: string | null, isDark: boolean = false) {
		if (!g) return;

		const colors = getThemeColors(isDark);

		g.selectAll('.node .card-bg')
			.attr('stroke', (d: any) => {
				if (d.data.id === nodeId) return colors.nodeStrokeSelected;
				return d.data.data.isHot ? colors.nodeStrokeHot : colors.nodeStroke;
			})
			.attr('stroke-width', (d: any) => {
				if (d.data.id === nodeId) return 3;
				return d.data.data.isHot ? 2 : 1;
			});

		// Center on the selected node
		if (nodeId) {
			centerOnNode(nodeId);
		}
	}

	onMount(() => {
		let currentTheme = 'light';
		let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
		let lastWidth = 0;
		let lastHeight = 0;

		const unsubTheme = theme.subscribe(t => {
			currentTheme = t;
			if ($analyzedPlan) {
				renderTree($analyzedPlan, t === 'dark');
			}
		});

		const unsubPlan = analyzedPlan.subscribe(plan => {
			if (plan) {
				// Reset zoom tracking for new plan
				hasInitialZoom = false;
				currentTransform = null;
				setTimeout(() => renderTree(plan, currentTheme === 'dark', true), 0);
			}
		});

		const unsubSelection = selectedNodeId.subscribe(nodeId => {
			updateSelection(nodeId, currentTheme === 'dark');
		});

		// Debounced resize handler - only re-render on significant size changes
		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;

			const { width, height } = entry.contentRect;

			// Only re-render if size changed significantly (more than 50px)
			const widthDiff = Math.abs(width - lastWidth);
			const heightDiff = Math.abs(height - lastHeight);

			if (widthDiff < 50 && heightDiff < 50 && lastWidth > 0) {
				return;
			}

			lastWidth = width;
			lastHeight = height;

			// Debounce the render call
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}

			resizeTimeout = setTimeout(() => {
				if ($analyzedPlan) {
					renderTree($analyzedPlan, currentTheme === 'dark');
				}
			}, 150);
		});
		resizeObserver.observe(container);

		return () => {
			unsubTheme();
			unsubPlan();
			unsubSelection();
			resizeObserver.disconnect();
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={container}
	class="w-full h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
	onclick={() => selectNode(null)}
	onkeydown={(e) => e.key === 'Escape' && selectNode(null)}
	role="application"
	aria-label="Query plan visualization"
	tabindex="-1"
></div>
