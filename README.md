# PostgreSQL EXPLAIN Viewer

A visual tool for analyzing PostgreSQL query execution plans. Paste your `EXPLAIN (ANALYZE, FORMAT JSON)` output and get an interactive visualization with optimization suggestions.

## Features

- **Interactive Tree Visualization** - D3-powered diagram with zoom/pan, showing data flow between nodes
- **Hot Node Detection** - Automatically identifies expensive operations (high self-time, row estimation errors, sequential scans)
- **Optimization Suggestions** - Pattern-based recommendations for indexes, query rewrites, and configuration
- **Plan Comparison** - Side-by-side diff of two plans to measure optimization impact
- **Shareable Links** - Compress and share analysis via URL
- **Export Options** - Download as SVG, PNG, or Markdown report
- **Plan History** - Browser stores your last 20 analyses
- **Mobile Responsive** - Works on tablets and phones

## Supported EXPLAIN Options

The viewer understands output from these PostgreSQL options:

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, TIMING, FORMAT JSON) SELECT ...;
```

| Option | What it shows |
|--------|---------------|
| `ANALYZE` | Actual execution times and row counts |
| `BUFFERS` | Shared/local/temp block reads and writes |
| `WAL` | WAL records, full page images, bytes |
| `TIMING` | I/O read/write timing (requires `track_io_timing`) |
| `MEMORY` | Peak memory usage (PostgreSQL 17+) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## Usage

1. Run your query with `EXPLAIN (ANALYZE, FORMAT JSON)` in PostgreSQL
2. Copy the JSON output
3. Paste into the viewer and click "Analyze"
4. Explore the tree, click nodes for details, review suggestions

### Keyboard Navigation

When focused on the tree:
- **Arrow Left** - Go to parent node
- **Arrow Right** - Go to first child
- **Arrow Up/Down** - Navigate siblings
- **Home/End** - Jump to first/last node
- **Escape** - Deselect node

## Hot Node Detection

Nodes are flagged as "hot" (shown in red) based on:

- Self-time > 15% of total query time
- Row estimation error > 10x actual
- Sort operations spilling to disk
- Sequential scans on tables > 10,000 rows
- Filters removing > 90% of rows

## Tech Stack

- **Framework:** SvelteKit with TypeScript (Svelte 5)
- **Visualization:** D3.js (tree-shaken modules)
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest + Playwright
- **Deployment:** Static site (adapter-static)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run typecheck` | TypeScript validation |

## License

MIT
