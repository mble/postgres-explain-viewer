import { test, expect } from '@playwright/test';

const samplePlan = JSON.stringify([
	{
		Plan: {
			'Node Type': 'Aggregate',
			'Actual Total Time': 152.485,
			'Actual Rows': 1,
			'Actual Loops': 1,
			Plans: [
				{
					'Node Type': 'Hash Join',
					'Join Type': 'Inner',
					'Actual Total Time': 143.263,
					'Actual Rows': 50000,
					'Actual Loops': 1,
					'Hash Cond': '(orders.customer_id = customers.id)',
					Plans: [
						{
							'Node Type': 'Seq Scan',
							'Relation Name': 'orders',
							'Actual Total Time': 51.583,
							'Actual Rows': 100000,
							'Actual Loops': 1,
							Filter: "(status = 'completed'::text)",
							'Rows Removed by Filter': 900000
						},
						{
							'Node Type': 'Hash',
							'Actual Total Time': 42.573,
							'Actual Rows': 50000,
							'Actual Loops': 1,
							Plans: [
								{
									'Node Type': 'Seq Scan',
									'Relation Name': 'customers',
									'Actual Total Time': 21.156,
									'Actual Rows': 50000,
									'Actual Loops': 1,
									Filter: "(country = 'US'::text)",
									'Rows Removed by Filter': 50000
								}
							]
						}
					]
				}
			]
		},
		'Planning Time': 0.512,
		'Execution Time': 152.847
	}
]);

// Setup to disable onboarding and clear localStorage before each test
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		// Mark onboarding as completed to prevent it from showing
		localStorage.setItem('onboarding-completed', 'true');
	});
});

test.describe('PostgreSQL EXPLAIN Viewer', () => {
	test('loads the landing page', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('h1')).toContainText('EXPLAIN Viewer');
		await expect(page.locator('textarea')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Analyze' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Example' })).toBeVisible();
	});

	test('shows error for invalid JSON', async ({ page }) => {
		await page.goto('/');

		await page.locator('textarea').fill('not valid json');
		await page.getByRole('button', { name: 'Analyze' }).click();

		await expect(page.locator('text=Invalid JSON')).toBeVisible();
	});

	test('parses and displays plan from textarea', async ({ page }) => {
		await page.goto('/');

		await page.locator('textarea').fill(samplePlan);
		await page.getByRole('button', { name: 'Analyze' }).click();

		// Should show the tree visualization
		await expect(page.getByRole('application', { name: /Query plan visualization/i }).locator('svg')).toBeVisible();

		// Should show plan summary with ANALYZE badge
		await expect(page.getByRole('button', { name: 'ANALYZE' })).toBeVisible();
		await expect(page.getByText('Execution', { exact: true })).toBeVisible();
	});

	test('loads example plan', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Example' }).click();

		// Should show the tree visualization
		await expect(page.getByRole('application', { name: /Query plan visualization/i }).locator('svg')).toBeVisible();

		// Should show suggestions (Insights tab is active by default)
		await expect(page.getByRole('button', { name: /Insights/i })).toBeVisible();
	});

	test('toggles between suggestions and node details', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Example' }).click();

		// Initially shows Insights tab active
		await expect(page.getByRole('button', { name: /Insights/i })).toBeVisible();

		// Click Details tab
		await page.getByRole('button', { name: 'Details' }).click();
		await expect(page.locator('text=Click a node in the tree')).toBeVisible();

		// Click back to Insights
		await page.getByRole('button', { name: /Insights/i }).click();
		// Should show suggestions - look for the first suggestion alert
		await expect(page.locator('.alert').first()).toBeVisible();
	});

	test('clicking suggestion selects node and shows details', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Example' }).click();

		// Wait for plan to load
		await expect(page.getByRole('application', { name: /Query plan visualization/i }).locator('svg')).toBeVisible();

		// Click on a suggestion
		await page.locator('button:has-text("Consider adding an index")').first().click();

		// Should switch to Node Details
		await page.getByRole('button', { name: 'Details' }).click();

		// Should show node details (not empty state)
		await expect(page.locator('text=Click a node in the tree')).not.toBeVisible();
		await expect(page.locator('text=% of query')).toBeVisible();
	});

	test('clears plan and returns to input', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Example' }).click();

		const treeSvg = page.getByRole('application', { name: /Query plan visualization/i }).locator('svg');

		// Verify plan is loaded
		await expect(treeSvg).toBeVisible();

		// Click clear
		await page.getByRole('button', { name: 'Clear' }).click();

		// Should show textarea again
		await expect(page.locator('textarea')).toBeVisible();
		await expect(treeSvg).not.toBeVisible();
	});

	test('toggles dark mode', async ({ page }) => {
		await page.goto('/');

		// Get initial background color
		const html = page.locator('html');

		// Click theme toggle
		await page.getByRole('button', { name: 'Toggle dark mode' }).click();

		// Should have dark class
		await expect(html).toHaveClass(/dark/);

		// Click again to toggle back
		await page.getByRole('button', { name: 'Toggle dark mode' }).click();

		// Should not have dark class
		await expect(html).not.toHaveClass(/dark/);
	});

	test('shows legend when plan is loaded', async ({ page }) => {
		await page.goto('/');

		// Load plan
		await page.getByRole('button', { name: 'Example' }).click();

		// Legend should be visible on desktop (hidden on mobile)
		// Check for legend component which contains color scale
		await expect(page.locator('.hidden.md\\:block')).toBeVisible();
	});

	test('displays multiple nodes in tree', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Example' }).click();

		const treeSvg = page.getByRole('application', { name: /Query plan visualization/i }).locator('svg');

		// Wait for SVG to render
		await expect(treeSvg).toBeVisible();

		// Should have multiple node rectangles
		const nodes = treeSvg.locator('.node');
		await expect(nodes).toHaveCount(5); // Aggregate, Hash Join, Seq Scan x2, Hash
	});

	test('persists dark mode preference', async ({ page }) => {
		await page.goto('/');

		// Enable dark mode
		await page.getByRole('button', { name: 'Toggle dark mode' }).click();
		await expect(page.locator('html')).toHaveClass(/dark/);

		// Reload page
		await page.reload();

		// Should still be in dark mode
		await expect(page.locator('html')).toHaveClass(/dark/);
	});
});
