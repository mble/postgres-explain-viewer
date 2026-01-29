import { describe, it, expect } from 'vitest';
import { parseExplainJson } from './parser';

describe('parseExplainJson', () => {
	it('parses valid EXPLAIN JSON wrapped in array', () => {
		const input = JSON.stringify([
			{
				Plan: {
					'Node Type': 'Seq Scan',
					'Relation Name': 'users',
					'Actual Total Time': 10.5,
					'Actual Rows': 100
				},
				'Planning Time': 0.1,
				'Execution Time': 10.6
			}
		]);

		const result = parseExplainJson(input);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.plan.Plan['Node Type']).toBe('Seq Scan');
			expect(result.hasAnalyzeData).toBe(true);
		}
	});

	it('parses valid EXPLAIN JSON without array wrapper', () => {
		const input = JSON.stringify({
			Plan: {
				'Node Type': 'Index Scan',
				'Index Name': 'users_pkey'
			}
		});

		const result = parseExplainJson(input);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.plan.Plan['Node Type']).toBe('Index Scan');
			expect(result.hasAnalyzeData).toBe(false);
		}
	});

	it('returns error for invalid JSON', () => {
		const result = parseExplainJson('not valid json');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Invalid JSON');
		}
	});

	it('returns error for empty array', () => {
		const result = parseExplainJson('[]');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Empty EXPLAIN output');
		}
	});

	it('returns error for missing Plan property', () => {
		const result = parseExplainJson('{"foo": "bar"}');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Missing "Plan"');
		}
	});

	it('returns error for missing Node Type', () => {
		const result = parseExplainJson('{"Plan": {"foo": "bar"}}');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Node Type');
		}
	});

	it('detects ANALYZE data in nested nodes', () => {
		const input = JSON.stringify([
			{
				Plan: {
					'Node Type': 'Aggregate',
					Plans: [
						{
							'Node Type': 'Seq Scan',
							'Actual Rows': 50
						}
					]
				}
			}
		]);

		const result = parseExplainJson(input);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.hasAnalyzeData).toBe(true);
		}
	});
});
