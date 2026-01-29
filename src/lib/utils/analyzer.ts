import type {
	ExplainPlanNode,
	ExplainOutput,
	AnalyzedPlanNode,
	AnalyzedPlan,
	HotReason,
	Suggestion,
	BufferStats,
	WalStats
} from '$lib/types/explain';
import { HOT_NODE_THRESHOLDS } from '$lib/constants/thresholds';
import { generateSuggestions } from './suggestions';

let nodeIdCounter = 0;

/**
 * Result of analyzing a single node, including accumulated suggestions from subtree.
 * This allows single-pass traversal instead of separate collection pass.
 */
interface AnalyzeNodeResult {
	node: AnalyzedPlanNode;
	suggestions: Suggestion[];
}

export function analyzePlan(
	explainOutput: ExplainOutput,
	hasAnalyzeData: boolean
): AnalyzedPlan {
	nodeIdCounter = 0;

	const totalTime = explainOutput.Plan['Actual Total Time'] ?? 0;

	// Single-pass analysis: collect suggestions and build node index during traversal
	// ISOMORPHISM PROOF: Suggestions are deterministic based on node properties.
	// DFS traversal order is preserved (parent after children, children in array order).
	// Accumulating during traversal vs post-traversal collection yields identical arrays.
	const nodeIndex = new Map<string, AnalyzedPlanNode>();
	const result = analyzeNode(explainOutput.Plan, totalTime, 0, nodeIndex);
	const root = result.node;
	const allSuggestions = result.suggestions;

	// Calculate total buffer stats from root node
	const bufferStats = collectBufferStats(root);
	const hasBufferData = bufferStats !== null && (
		bufferStats.sharedHit > 0 ||
		bufferStats.sharedRead > 0 ||
		bufferStats.tempRead > 0 ||
		bufferStats.tempWritten > 0
	);

	// Collect WAL stats
	const walStats = collectWalStats(root);
	const hasWalData = walStats !== null && (
		walStats.records > 0 ||
		walStats.bytes > 0
	);

	// Planning buffers
	let planningBuffers: BufferStats | null = null;
	if (explainOutput.Planning) {
		planningBuffers = {
			sharedHit: explainOutput.Planning['Shared Hit Blocks'] ?? 0,
			sharedRead: explainOutput.Planning['Shared Read Blocks'] ?? 0,
			sharedDirtied: explainOutput.Planning['Shared Dirtied Blocks'] ?? 0,
			sharedWritten: explainOutput.Planning['Shared Written Blocks'] ?? 0,
			localHit: 0,
			localRead: 0,
			localDirtied: 0,
			localWritten: 0,
			tempRead: 0,
			tempWritten: 0
		};
	}

	// Settings
	const settings = explainOutput.Settings ?? {};
	const hasSettingsData = Object.keys(settings).length > 0;

	return {
		root,
		totalTime,
		planningTime: explainOutput['Planning Time'] ?? null,
		executionTime: explainOutput['Execution Time'] ?? null,
		hasAnalyzeData,
		hasBufferData,
		hasWalData,
		hasSettingsData,
		queryText: explainOutput['Query Text'] ?? null,
		bufferStats,
		planningBuffers,
		walStats,
		triggers: explainOutput.Triggers ?? [],
		settings,
		allSuggestions,
		nodeIndex
	};
}

function analyzeNode(
	node: ExplainPlanNode,
	totalTime: number,
	depth: number,
	nodeIndex: Map<string, AnalyzedPlanNode>
): AnalyzeNodeResult {
	const id = `node-${nodeIdCounter++}`;

	// Analyze children first, accumulating their suggestions
	let analyzedChildren: AnalyzedPlanNode[] | undefined;
	const accumulatedSuggestions: Suggestion[] = [];

	if (node.Plans) {
		analyzedChildren = [];
		for (const child of node.Plans) {
			const childResult = analyzeNode(child, totalTime, depth + 1, nodeIndex);
			analyzedChildren.push(childResult.node);
			// Accumulate child suggestions (preserves DFS order)
			accumulatedSuggestions.push(...childResult.suggestions);
		}
	}

	// Calculate self-time
	const nodeTime = node['Actual Total Time'] ?? 0;
	const nodeLoops = node['Actual Loops'] ?? 1;
	const totalNodeTime = nodeTime * nodeLoops;

	let childrenTime = 0;
	if (analyzedChildren) {
		for (const child of analyzedChildren) {
			const childLoops = child['Actual Loops'] ?? 1;
			const childTime = child['Actual Total Time'] ?? 0;
			childrenTime += childTime * childLoops;
		}
	}

	const selfTime = Math.max(0, totalNodeTime - childrenTime);
	const selfTimePercent = totalTime > 0 ? (selfTime / totalTime) * 100 : 0;

	// Calculate estimation factor
	const actualRows = node['Actual Rows'];
	const planRows = node['Plan Rows'];
	let estimationFactor: number | null = null;
	if (actualRows !== undefined && planRows !== undefined && planRows > 0) {
		estimationFactor = actualRows / planRows;
	}

	// Determine if node is "hot" and why
	const hotReasons = detectHotReasons(node, selfTimePercent, estimationFactor);
	const isHot = hotReasons.length > 0;

	const analyzedNode: AnalyzedPlanNode = {
		...node,
		id,
		selfTime,
		selfTimePercent,
		isHot,
		hotReasons,
		estimationFactor,
		suggestions: [],
		depth,
		Plans: analyzedChildren
	};

	// Generate suggestions based on analysis
	analyzedNode.suggestions = generateSuggestions(analyzedNode);

	// Add to node index for O(1) lookup
	// ISOMORPHISM PROOF: Node IDs are unique (counter-based). Map.get(id) returns
	// the exact same object reference as DFS traversal would find. Observable behavior identical.
	nodeIndex.set(id, analyzedNode);

	// Add this node's suggestions AFTER children's (DFS post-order for suggestions)
	// This maintains the same order as the previous collectSuggestions() which did:
	// [...node.suggestions, ...child1Suggestions, ...child2Suggestions, ...]
	// Actually, looking at old code: it was [...node.suggestions] then pushed children
	// So order was: node, then children recursively. Let's match that:
	const allNodeSuggestions = [...analyzedNode.suggestions, ...accumulatedSuggestions];

	return { node: analyzedNode, suggestions: allNodeSuggestions };
}

function detectHotReasons(
	node: ExplainPlanNode,
	selfTimePercent: number,
	estimationFactor: number | null
): HotReason[] {
	const reasons: HotReason[] = [];

	// High self-time
	if (selfTimePercent >= HOT_NODE_THRESHOLDS.selfTimePercent) {
		reasons.push('high-self-time');
	}

	// Large estimation error
	if (estimationFactor !== null) {
		if (
			estimationFactor >= HOT_NODE_THRESHOLDS.estimationErrorFactor ||
			estimationFactor <= 1 / HOT_NODE_THRESHOLDS.estimationErrorFactor
		) {
			reasons.push('estimation-error');
		}
	}

	// Disk sort
	if (node['Sort Space Type'] === 'Disk') {
		reasons.push('disk-sort');
	}

	// Sequential scan on large table
	if (node['Node Type'] === 'Seq Scan') {
		const actualRows = node['Actual Rows'] ?? 0;
		if (actualRows >= HOT_NODE_THRESHOLDS.largeTableRows) {
			reasons.push('seq-scan-large');
		}
	}

	// High filter removal
	const rowsRemoved = node['Rows Removed by Filter'];
	const actualRows = node['Actual Rows'];
	if (rowsRemoved !== undefined && actualRows !== undefined && actualRows > 0) {
		const removalPercent = (rowsRemoved / (rowsRemoved + actualRows)) * 100;
		if (removalPercent >= HOT_NODE_THRESHOLDS.highFilterRemovalPercent) {
			reasons.push('high-filter-removal');
		}
	}

	return reasons;
}

// REMOVED: collectSuggestions() - suggestions are now collected during analyzeNode() traversal
// This eliminates a redundant O(N) tree traversal.
// The suggestion order is preserved: parent suggestions first, then children in array order (DFS pre-order).

function collectBufferStats(node: AnalyzedPlanNode): BufferStats | null {
	const stats: BufferStats = {
		sharedHit: node['Shared Hit Blocks'] ?? 0,
		sharedRead: node['Shared Read Blocks'] ?? 0,
		sharedDirtied: node['Shared Dirtied Blocks'] ?? 0,
		sharedWritten: node['Shared Written Blocks'] ?? 0,
		localHit: node['Local Hit Blocks'] ?? 0,
		localRead: node['Local Read Blocks'] ?? 0,
		localDirtied: node['Local Dirtied Blocks'] ?? 0,
		localWritten: node['Local Written Blocks'] ?? 0,
		tempRead: node['Temp Read Blocks'] ?? 0,
		tempWritten: node['Temp Written Blocks'] ?? 0
	};

	// Note: Buffer stats in EXPLAIN are cumulative at each node level
	// The root node contains the total for the entire plan

	const hasAnyBufferData = Object.values(stats).some(v => v > 0);
	return hasAnyBufferData ? stats : null;
}

function collectWalStats(node: AnalyzedPlanNode): WalStats | null {
	const stats: WalStats = {
		records: node['WAL Records'] ?? 0,
		fpi: node['WAL FPI'] ?? 0,
		bytes: node['WAL Bytes'] ?? 0
	};

	const hasAnyWalData = Object.values(stats).some(v => v > 0);
	return hasAnyWalData ? stats : null;
}
