import type { HierarchyNode } from 'd3-hierarchy';
import type { AnalyzedPlanNode } from '$lib/types/explain';

export interface TreeNode {
	id: string;
	name: string;
	data: AnalyzedPlanNode;
	children?: TreeNode[];
}

export function transformToTree(node: AnalyzedPlanNode): TreeNode {
	const treeNode: TreeNode = {
		id: node.id,
		name: formatNodeName(node),
		data: node
	};

	if (node.Plans && node.Plans.length > 0) {
		treeNode.children = node.Plans.map(transformToTree);
	}

	return treeNode;
}

function formatNodeName(node: AnalyzedPlanNode): string {
	let name = node['Node Type'];

	if (node['Relation Name']) {
		name += ` on ${node['Relation Name']}`;
	}

	if (node['Index Name']) {
		name += ` using ${node['Index Name']}`;
	}

	if (node['Join Type']) {
		name = `${node['Join Type']} ${name}`;
	}

	return name;
}

export function getNodeLabel(node: AnalyzedPlanNode): string {
	return formatNodeName(node);
}

export function getNodeMetrics(node: AnalyzedPlanNode): string {
	const parts: string[] = [];

	if (node['Actual Rows'] !== undefined) {
		parts.push(`${node['Actual Rows'].toLocaleString()} rows`);
	}

	if (node.selfTime > 0) {
		parts.push(`${node.selfTime.toFixed(2)}ms`);
	}

	return parts.join(' | ');
}

export type D3TreeNode = HierarchyNode<TreeNode>;
