export interface ExplainPlanNode {
	'Node Type': string;
	'Relation Name'?: string;
	'Schema'?: string;
	'Alias'?: string;
	'Startup Cost'?: number;
	'Total Cost'?: number;
	'Plan Rows'?: number;
	'Plan Width'?: number;
	'Actual Startup Time'?: number;
	'Actual Total Time'?: number;
	'Actual Rows'?: number;
	'Actual Loops'?: number;
	'Output'?: string[];
	'Filter'?: string;
	'Rows Removed by Filter'?: number;
	'Index Name'?: string;
	'Index Cond'?: string;
	'Scan Direction'?: string;
	'Join Type'?: string;
	'Inner Unique'?: boolean;
	'Hash Cond'?: string;
	'Merge Cond'?: string;
	'Sort Key'?: string[];
	'Sort Method'?: string;
	'Sort Space Used'?: number;
	'Sort Space Type'?: string;
	'Group Key'?: string[];
	'Partial Mode'?: string;
	'Parallel Aware'?: boolean;
	'Workers Planned'?: number;
	'Workers Launched'?: number;
	// BUFFERS
	'Shared Hit Blocks'?: number;
	'Shared Read Blocks'?: number;
	'Shared Dirtied Blocks'?: number;
	'Shared Written Blocks'?: number;
	'Local Hit Blocks'?: number;
	'Local Read Blocks'?: number;
	'Local Dirtied Blocks'?: number;
	'Local Written Blocks'?: number;
	'Temp Read Blocks'?: number;
	'Temp Written Blocks'?: number;
	// MEMORY (PG 17+)
	'Peak Memory Usage'?: number;
	// WAL
	'WAL Records'?: number;
	'WAL FPI'?: number;
	'WAL Bytes'?: number;
	// I/O Timing
	'I/O Read Time'?: number;
	'I/O Write Time'?: number;
	// Workers
	Workers?: ExplainWorker[];
	Plans?: ExplainPlanNode[];
	[key: string]: unknown;
}

export interface ExplainWorker {
	'Worker Number': number;
	'Actual Startup Time'?: number;
	'Actual Total Time'?: number;
	'Actual Rows'?: number;
	'Actual Loops'?: number;
	'Shared Hit Blocks'?: number;
	'Shared Read Blocks'?: number;
	[key: string]: unknown;
}

export interface ExplainOutput {
	Plan: ExplainPlanNode;
	'Query Text'?: string;
	'Planning Time'?: number;
	'Execution Time'?: number;
	'Planning'?: {
		'Shared Hit Blocks'?: number;
		'Shared Read Blocks'?: number;
		'Shared Dirtied Blocks'?: number;
		'Shared Written Blocks'?: number;
	};
	Triggers?: ExplainTrigger[];
	Settings?: Record<string, string>;
}

export interface ExplainTrigger {
	'Trigger Name': string;
	'Relation': string;
	'Time': number;
	'Calls': number;
}

export type HotReason =
	| 'high-self-time'
	| 'estimation-error'
	| 'disk-sort'
	| 'seq-scan-large'
	| 'high-filter-removal';

export interface AnalyzedPlanNode extends ExplainPlanNode {
	id: string;
	selfTime: number;
	selfTimePercent: number;
	isHot: boolean;
	hotReasons: HotReason[];
	estimationFactor: number | null;
	suggestions: Suggestion[];
	depth: number;
	Plans?: AnalyzedPlanNode[];
}

export type SuggestionSeverity = 'info' | 'warning' | 'critical';

export interface Suggestion {
	id: string;
	nodeId: string;
	severity: SuggestionSeverity;
	title: string;
	description: string;
	category: SuggestionCategory;
}

export type SuggestionCategory =
	| 'indexing'
	| 'statistics'
	| 'join-strategy'
	| 'memory'
	| 'filtering';

export interface BufferStats {
	sharedHit: number;
	sharedRead: number;
	sharedDirtied: number;
	sharedWritten: number;
	localHit: number;
	localRead: number;
	localDirtied: number;
	localWritten: number;
	tempRead: number;
	tempWritten: number;
}

export interface WalStats {
	records: number;
	fpi: number;
	bytes: number;
}

export interface AnalyzedPlan {
	root: AnalyzedPlanNode;
	totalTime: number;
	planningTime: number | null;
	executionTime: number | null;
	hasAnalyzeData: boolean;
	hasBufferData: boolean;
	hasWalData: boolean;
	hasSettingsData: boolean;
	queryText: string | null;
	bufferStats: BufferStats | null;
	planningBuffers: BufferStats | null;
	walStats: WalStats | null;
	triggers: ExplainTrigger[];
	settings: Record<string, string>;
	allSuggestions: Suggestion[];
	/** Pre-built index for O(1) node lookup by ID. Built during analysis. */
	nodeIndex: Map<string, AnalyzedPlanNode>;
}
