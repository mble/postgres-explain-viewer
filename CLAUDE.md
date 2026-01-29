# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript web application for visualizing PostgreSQL EXPLAIN plans in JSON format. Users submit EXPLAIN ANALYZE output and receive:
- Visual tree representation of the query plan with card-based nodes
- Identification of hot (expensive) query plan nodes
- Suggestions for query optimization
- Support for BUFFERS, WAL, MEMORY, and TIMING options

## Tech Stack

- **Framework:** SvelteKit with TypeScript (Svelte 5 with runes: $state, $props, $derived)
- **Visualization:** D3.js for interactive tree diagram with zoom/pan
- **Styling:** Tailwind CSS v4 with custom dark mode variant
- **Testing:** Vitest (28 unit tests), Playwright (11 e2e tests)
- **Deployment:** Static site with @sveltejs/adapter-static

## Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Type check
npm run typecheck
```

## Architecture

### Key Components

- **PlanTree.svelte** - D3.js tree visualization with card-based nodes showing:
  - Header bar (colored by severity: gray/yellow/red) with node type and percentage
  - Relation/table name with warning indicator for hot nodes
  - Metrics row: rows, time, loops, read blocks
  - Initial zoom centers on most problematic node (based on selfTimePercent + isHot + hotReasons)

- **NodeList.svelte** - Hierarchical node list in left panel with depth indicators

- **NodeDetails.svelte** - Selected node properties, suggestions, buffer/WAL stats

- **SuggestionPanel.svelte** - All suggestions grouped by category

- **ExplainInput.svelte** - JSON/SQL input with tabbed interface, displays summary after parsing

- **ScrollContainer.svelte** - Reusable scroll wrapper with fade indicators for more content

- **Legend.svelte** - Color scale explanation

- **ThemeToggle.svelte** - Dark/light mode toggle

### Stores (src/lib/stores/)

- **plan.ts** - Core state: rawJson, sqlQuery, analyzedPlan, selectedNodeId, parseError
- **theme.ts** - Dark/light mode with localStorage persistence

### Utils (src/lib/utils/)

- **parser.ts** - JSON parsing, handles array wrapper, detects ANALYZE data
- **analyzer.ts** - Hot node detection, self-time calculation, buffer/WAL stats collection
- **suggestions.ts** - Pattern-based optimization suggestions
- **tree-transform.ts** - Converts plan to D3 hierarchy format

### Types (src/lib/types/explain.ts)

Key interfaces:
- ExplainPlanNode - Raw PostgreSQL EXPLAIN node
- AnalyzedPlanNode - Node with computed metrics (selfTime, isHot, suggestions)
- AnalyzedPlan - Full analyzed plan with buffer/WAL stats, triggers, settings
- BufferStats, WalStats - I/O statistics
- Suggestion - Optimization recommendation with severity

### EXPLAIN Options Supported

- **ANALYZE** - Actual execution times and row counts
- **BUFFERS** - Shared/Local/Temp Hit/Read/Dirtied/Written Blocks, I/O timing
- **WAL** - WAL Records, FPI, Bytes
- **MEMORY** - Peak Memory Usage (PostgreSQL 17+)
- **TIMING** - I/O Read/Write Time (requires track_io_timing)

### Hot Node Detection

Nodes flagged as "hot" based on:
1. Self-time > 15% of total query time
2. Row estimation error > 10x
3. Sort spilling to disk
4. Sequential scan on large tables (>10000 rows)
5. High filter removal (>90% rows filtered)

### Layout

- Viewport-constrained (h-screen, overflow-hidden)
- 3-column grid (12-col): Left col-span-3 (summary + node list), Center col-span-6 (tree), Right col-span-3 (details/suggestions)
- All panels use ScrollContainer for internal scrolling with fade indicators
- Debounced resize handling (150ms, 50px threshold) to prevent render thrash

### Example Plan

Located at `src/lib/constants/example.ts` - includes BUFFERS, WAL, MEMORY data for demonstration.

## Current State (Ready for Compaction)

All features implemented and working:
- 28 unit tests passing
- 11 e2e tests passing
- Build succeeds
- Dark mode fully supported
- Card-based node visualization with metrics
- Initial zoom to most problematic node
- Scroll fade indicators on all panels

No pending tasks.
