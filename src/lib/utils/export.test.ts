import { describe, it, expect } from 'vitest';
import { generateLlmPrompt } from './export';
import { analyzePlan } from './analyzer';
import type { ExplainOutput } from '$lib/types/explain';

describe('generateLlmPrompt', () => {
	it('includes query text when available', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Relation Name': 'users',
				'Actual Total Time': 100,
				'Actual Loops': 1
			},
			'Query Text': 'SELECT * FROM users',
			'Execution Time': 100
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('SELECT * FROM users');
		expect(prompt).toContain('## SQL Query');
	});

	it('includes performance metrics', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 150,
				'Actual Loops': 1
			},
			'Planning Time': 0.5,
			'Execution Time': 150
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('Execution Time: 150.00 ms');
		expect(prompt).toContain('Planning Time: 0.50 ms');
	});

	it('includes plan structure', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Hash Join',
				'Actual Total Time': 100,
				'Actual Loops': 1,
				Plans: [
					{
						'Node Type': 'Seq Scan',
						'Relation Name': 'orders',
						'Actual Total Time': 60,
						'Actual Loops': 1
					},
					{
						'Node Type': 'Hash',
						'Actual Total Time': 20,
						'Actual Loops': 1,
						Plans: [
							{
								'Node Type': 'Seq Scan',
								'Relation Name': 'customers',
								'Actual Total Time': 15,
								'Actual Loops': 1
							}
						]
					}
				]
			}
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('Hash Join');
		expect(prompt).toContain('on orders');
		expect(prompt).toContain('on customers');
		expect(prompt).toContain('## Execution Plan');
	});

	it('includes suggestions when present', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Relation Name': 'large_table',
				'Actual Total Time': 500,
				'Actual Rows': 100000,
				'Actual Loops': 1
			}
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('## Identified Issues');
		expect(prompt).toContain('Sequential scan');
	});

	it('includes hot nodes section', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Relation Name': 'orders',
				'Actual Total Time': 100,
				'Actual Rows': 50000,
				'Actual Loops': 1
			}
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('## Hot Nodes');
		expect(prompt).toContain('orders');
	});

	it('includes optimization request at the end', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 50,
				'Actual Loops': 1
			}
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('Please analyze this query plan');
		expect(prompt).toContain('Index recommendations');
	});

	it('includes buffer statistics when available', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 50,
				'Actual Loops': 1,
				'Shared Hit Blocks': 1000,
				'Shared Read Blocks': 200
			}
		};

		const plan = analyzePlan(input, true);
		const prompt = generateLlmPrompt(plan);

		expect(prompt).toContain('Buffer Hit Rate');
		expect(prompt).toContain('1000 hits');
		expect(prompt).toContain('200 reads');
	});
});
