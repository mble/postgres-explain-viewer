/**
 * Slug Utilities
 * Generate URL-safe slugs for plan identification
 */

/**
 * Convert text to URL-safe slug
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim hyphens from ends
 * - Max 50 characters
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single
		.replace(/^-|-$/g, '') // Trim hyphens from ends
		.slice(0, 50); // Max 50 chars
}

/**
 * Generate a unique slug from text, appending a number if necessary
 */
export function generateSlug(text: string, existingSlugs: Set<string>): string {
	const base = slugify(text);

	// Handle empty slug
	if (!base) {
		let counter = 1;
		while (existingSlugs.has(`plan-${counter}`)) {
			counter++;
		}
		return `plan-${counter}`;
	}

	// If base slug is unique, use it
	if (!existingSlugs.has(base)) {
		return base;
	}

	// Append incrementing number until unique
	let counter = 2;
	while (existingSlugs.has(`${base}-${counter}`)) {
		counter++;
	}
	return `${base}-${counter}`;
}

/**
 * Check if a string is a valid slug
 * - Only lowercase letters, numbers, and hyphens
 * - No consecutive hyphens
 * - Doesn't start or end with hyphen
 * - At least 1 character
 */
export function isValidSlug(slug: string): boolean {
	if (!slug || slug.length === 0) return false;
	if (slug.length > 50) return false;

	// Only lowercase alphanumeric and hyphens
	if (!/^[a-z0-9-]+$/.test(slug)) return false;

	// No consecutive hyphens
	if (/--/.test(slug)) return false;

	// Doesn't start or end with hyphen
	if (slug.startsWith('-') || slug.endsWith('-')) return false;

	return true;
}
