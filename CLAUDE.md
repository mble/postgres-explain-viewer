# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript web application for visualizing PostgreSQL EXPLAIN plans in JSON format. Users submit EXPLAIN ANALYZE output and receive:
- Visual tree representation of the query plan with card-based nodes
- Identification of hot (expensive) query plan nodes
- Suggestions for query optimization
- Support for BUFFERS, WAL, MEMORY, and TIMING options
- URL-based plan sharing, history tracking, export functionality
- Plan comparison mode for before/after analysis

## Tech Stack

- **Framework:** SvelteKit with TypeScript (Svelte 5 with runes: $state, $props, $derived)
- **Visualization:** D3.js (tree-shaken: d3-selection, d3-hierarchy, d3-shape, d3-zoom)
- **Styling:** Tailwind CSS v4 with custom dark mode variant
- **Compression:** lz-string for URL state and history storage
- **Testing:** Vitest (31 unit tests), Playwright (11 e2e tests)
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
  - Initial zoom centers on most problematic node
  - Keyboard navigation (arrow keys for tree traversal)

- **NodeList.svelte** - Hierarchical node list in left panel with depth indicators

- **NodeDetails.svelte** - Selected node properties, suggestions, buffer/WAL stats

- **SuggestionPanel.svelte** - All suggestions grouped by category

- **ExplainInput.svelte** - JSON/SQL input with tabbed interface, displays summary after parsing

- **SqlHighlight.svelte** - SQL syntax highlighting with regex-based tokenizer

- **ExportMenu.svelte** - Export to SVG, PNG, or Markdown report

- **PlanHistory.svelte** - Slide-out panel showing recently analyzed plans (localStorage)

- **PlanComparison.svelte** - Side-by-side plan comparison with node matching and delta display

- **OnboardingTooltips.svelte** - First-time user onboarding flow

- **MobileNav.svelte** - Bottom tab navigation for mobile devices

- **ScrollContainer.svelte** - Reusable scroll wrapper with fade indicators

- **Legend.svelte** - Color scale explanation

- **ThemeToggle.svelte** - Dark/light mode toggle

### Stores (src/lib/stores/)

- **plan.ts** - Core state: rawJson, sqlQuery, analyzedPlan, selectedNodeId, parseError
- **theme.ts** - Dark/light mode with localStorage persistence
- **history.ts** - Plan history with LRU eviction (max 20 entries)
- **comparison.ts** - Plan A/B comparison state
- **onboarding.ts** - First-time user onboarding flow state

### Utils (src/lib/utils/)

- **parser.ts** - JSON parsing, handles array wrapper, detects ANALYZE data
- **analyzer.ts** - Hot node detection, self-time calculation, buffer/WAL stats collection
- **suggestions.ts** - Pattern-based optimization suggestions (10+ rules)
- **tree-transform.ts** - Converts plan to D3 hierarchy format
- **sql-highlighter.ts** - SQL syntax tokenizer for highlighting
- **keyboard-navigation.ts** - Arrow key navigation for plan tree
- **compression.ts** - lz-string wrapper for URL state
- **url-state.ts** - URL hash encoding/decoding for shareable links
- **export.ts** - SVG, PNG, and Markdown export utilities
- **plan-diff.ts** - Node matching and delta calculation for plan comparison

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

### Suggestion Rules

1. Sequential scan on large table - index recommendation
2. Missing index (Seq Scan with Filter)
3. Large estimation error - ANALYZE recommendation
4. Sort spilling to disk - work_mem increase
5. High filter removal - index or query restructure
6. Nested Loop with high iterations - Hash Join consideration
7. Hash operation using multiple batches
8. Parallel workers underutilization
9. High temporary disk usage
10. High execution time (general)

### Layout

- Viewport-constrained (h-screen, overflow-hidden)
- Desktop: 3-column grid (12-col): Left col-span-3 (summary + node list), Center col-span-6 (tree), Right col-span-3 (details/suggestions)
- Mobile: Full-screen panels with bottom tab navigation
- All panels use ScrollContainer for internal scrolling with fade indicators
- Debounced resize handling (150ms, 50px threshold) to prevent render thrash

### Features

- **URL State Persistence** - Plans compressed with lz-string and stored in URL hash
- **Plan History** - Last 20 plans stored in localStorage with LRU eviction
- **Export** - SVG, PNG (2x scale), Markdown report
- **Plan Comparison** - Side-by-side comparison with node matching and delta display
- **Keyboard Navigation** - Arrow keys to navigate tree (Left=parent, Right=child, Up/Down=siblings)
- **SQL Syntax Highlighting** - Keywords, strings, numbers, comments highlighted
- **Onboarding** - 4-step tutorial for first-time users
- **Mobile Support** - Responsive layout with bottom tab navigation

### Example Plan

Located at `src/lib/constants/example.ts` - includes BUFFERS, WAL, MEMORY data for demonstration.

## Current State

All features implemented and working:
- 31 unit tests passing
- 11 e2e tests passing
- Build succeeds
- Full feature set: visualization, suggestions, export, history, comparison, mobile
