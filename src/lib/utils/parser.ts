import type { ExplainPlanNode, ExplainOutput } from '$lib/types/explain';

export interface ParseResult {
	success: true;
	plan: ExplainOutput;
	hasAnalyzeData: boolean;
}

export interface ParseError {
	success: false;
	error: string;
}

export type ParseOutcome = ParseResult | ParseError;

export function parseExplainJson(input: string): ParseOutcome {
	let parsed: unknown;

	try {
		parsed = JSON.parse(input);
	} catch {
		return { success: false, error: 'Invalid JSON: Unable to parse input' };
	}

	// PostgreSQL EXPLAIN JSON wraps output in an array
	if (Array.isArray(parsed)) {
		if (parsed.length === 0) {
			return { success: false, error: 'Empty EXPLAIN output array' };
		}
		parsed = parsed[0];
	}

	if (!isExplainOutput(parsed)) {
		return {
			success: false,
			error: 'Invalid EXPLAIN format: Missing "Plan" property'
		};
	}

	if (!isValidPlanNode(parsed.Plan)) {
		return {
			success: false,
			error: 'Invalid plan node: Missing required "Node Type" property'
		};
	}

	const hasAnalyzeData = checkForAnalyzeData(parsed.Plan);

	return {
		success: true,
		plan: parsed,
		hasAnalyzeData
	};
}

function isExplainOutput(obj: unknown): obj is ExplainOutput {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'Plan' in obj &&
		typeof (obj as ExplainOutput).Plan === 'object'
	);
}

function isValidPlanNode(node: unknown): node is ExplainPlanNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'Node Type' in node &&
		typeof (node as ExplainPlanNode)['Node Type'] === 'string'
	);
}

function checkForAnalyzeData(node: ExplainPlanNode): boolean {
	if ('Actual Total Time' in node || 'Actual Rows' in node) {
		return true;
	}

	if (node.Plans) {
		return node.Plans.some(checkForAnalyzeData);
	}

	return false;
}
