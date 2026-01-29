/**
 * Keyboard Navigation Utilities for Plan Tree
 * Enables arrow-key navigation through the plan node hierarchy
 */

import type { AnalyzedPlanNode } from '$lib/types/explain';

export interface NavigationMap {
	parentMap: Map<string, string | null>;
	childrenMap: Map<string, string[]>;
	siblingIndex: Map<string, { siblings: string[]; index: number }>;
	allNodeIds: string[];
}

/**
 * Build navigation maps for keyboard navigation
 * Creates parent lookup, children lookup, and sibling navigation structures
 */
export function buildNavigationMap(root: AnalyzedPlanNode): NavigationMap {
	const parentMap = new Map<string, string | null>();
	const childrenMap = new Map<string, string[]>();
	const siblingIndex = new Map<string, { siblings: string[]; index: number }>();
	const allNodeIds: string[] = [];

	function traverse(node: AnalyzedPlanNode, parentId: string | null): void {
		parentMap.set(node.id, parentId);
		allNodeIds.push(node.id);

		const childIds: string[] = [];
		if (node.Plans) {
			for (const child of node.Plans) {
				childIds.push(child.id);
			}

			// Set sibling info for each child
			for (let i = 0; i < childIds.length; i++) {
				siblingIndex.set(childIds[i], { siblings: childIds, index: i });
			}

			// Recurse into children
			for (const child of node.Plans) {
				traverse(child, node.id);
			}
		}

		childrenMap.set(node.id, childIds);
	}

	traverse(root, null);

	// Root node has no siblings
	siblingIndex.set(root.id, { siblings: [root.id], index: 0 });

	return { parentMap, childrenMap, siblingIndex, allNodeIds };
}

/**
 * Get the parent node ID
 */
export function getParent(navMap: NavigationMap, nodeId: string): string | null {
	return navMap.parentMap.get(nodeId) ?? null;
}

/**
 * Get the first child node ID
 */
export function getFirstChild(navMap: NavigationMap, nodeId: string): string | null {
	const children = navMap.childrenMap.get(nodeId);
	return children && children.length > 0 ? children[0] : null;
}

/**
 * Get the previous sibling node ID
 */
export function getPrevSibling(navMap: NavigationMap, nodeId: string): string | null {
	const info = navMap.siblingIndex.get(nodeId);
	if (!info || info.index === 0) return null;
	return info.siblings[info.index - 1];
}

/**
 * Get the next sibling node ID
 */
export function getNextSibling(navMap: NavigationMap, nodeId: string): string | null {
	const info = navMap.siblingIndex.get(nodeId);
	if (!info || info.index >= info.siblings.length - 1) return null;
	return info.siblings[info.index + 1];
}

/**
 * Get the root node ID
 */
export function getRoot(navMap: NavigationMap): string | null {
	return navMap.allNodeIds.length > 0 ? navMap.allNodeIds[0] : null;
}

/**
 * Get the last node in DFS order (deepest rightmost node)
 */
export function getLastNode(navMap: NavigationMap): string | null {
	return navMap.allNodeIds.length > 0 ? navMap.allNodeIds[navMap.allNodeIds.length - 1] : null;
}

/**
 * Handle keyboard navigation events
 * Returns the new selected node ID, or null if no change
 */
export function handleKeyboardNavigation(
	event: KeyboardEvent,
	currentNodeId: string | null,
	navMap: NavigationMap
): string | null {
	if (!navMap.allNodeIds.length) return null;

	// If no node selected, select root on any navigation key
	if (!currentNodeId) {
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			return getRoot(navMap);
		}
		return null;
	}

	switch (event.key) {
		case 'ArrowUp': {
			event.preventDefault();
			// Go to previous sibling, or parent if no previous sibling
			const prev = getPrevSibling(navMap, currentNodeId);
			if (prev) return prev;
			return getParent(navMap, currentNodeId);
		}

		case 'ArrowDown': {
			event.preventDefault();
			// Go to next sibling
			const next = getNextSibling(navMap, currentNodeId);
			if (next) return next;
			return null;
		}

		case 'ArrowLeft': {
			event.preventDefault();
			// Go to parent
			return getParent(navMap, currentNodeId);
		}

		case 'ArrowRight': {
			event.preventDefault();
			// Go to first child
			return getFirstChild(navMap, currentNodeId);
		}

		case 'Home': {
			event.preventDefault();
			return getRoot(navMap);
		}

		case 'End': {
			event.preventDefault();
			return getLastNode(navMap);
		}

		case 'Escape': {
			event.preventDefault();
			return null; // Deselect
		}

		default:
			return currentNodeId;
	}
}
