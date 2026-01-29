/**
 * SQL Syntax Highlighter
 * Regex-based tokenizer for SQL keywords, strings, numbers, and comments
 */

export interface SqlToken {
	type: 'keyword' | 'string' | 'number' | 'comment' | 'operator' | 'identifier' | 'text';
	value: string;
}

// SQL keywords (PostgreSQL-focused)
const SQL_KEYWORDS = new Set([
	// Data Manipulation
	'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT',
	'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
	'IS', 'NULL', 'TRUE', 'FALSE',
	'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL', 'ON', 'USING',
	'ORDER', 'BY', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
	'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'FETCH', 'NEXT', 'ROWS', 'ONLY',
	'UNION', 'INTERSECT', 'EXCEPT', 'ALL', 'DISTINCT',
	'AS', 'WITH', 'RECURSIVE', 'MATERIALIZED',
	// Aggregates
	'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ARRAY_AGG', 'STRING_AGG', 'BOOL_AND', 'BOOL_OR',
	// Data Definition
	'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'TABLE', 'INDEX', 'VIEW', 'SEQUENCE', 'TYPE',
	'DATABASE', 'SCHEMA', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
	'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE', 'RESTRICT', 'SET', 'TRIGGER', 'FUNCTION',
	// Data Types
	'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
	'VARCHAR', 'CHAR', 'TEXT', 'BOOLEAN', 'BOOL',
	'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'TIME', 'INTERVAL',
	'NUMERIC', 'DECIMAL', 'REAL', 'FLOAT', 'DOUBLE', 'PRECISION',
	'JSON', 'JSONB', 'UUID', 'ARRAY', 'BYTEA',
	// Transaction
	'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
	// Control
	'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'COALESCE', 'NULLIF', 'GREATEST', 'LEAST',
	// Other
	'EXPLAIN', 'ANALYZE', 'FORMAT', 'VERBOSE', 'COSTS', 'BUFFERS', 'TIMING', 'SUMMARY',
	'OVER', 'PARTITION', 'WINDOW', 'FILTER', 'WITHIN', 'RETURNING', 'INTO', 'VALUES',
	'LATERAL', 'ANY', 'SOME', 'CAST', 'EXTRACT', 'EPOCH'
]);

// SQL operators
const SQL_OPERATORS = /^(::|\|\||->|->>|#>|#>>|@>|<@|\?&|\?\||\?|<>|!=|<=|>=|<|>|=|\+|-|\*|\/|%|&|\||#|~)/;

/**
 * Tokenize SQL into highlighted parts
 */
export function tokenizeSql(sql: string): SqlToken[] {
	const tokens: SqlToken[] = [];
	let pos = 0;

	while (pos < sql.length) {
		// Skip whitespace, keeping it as text
		const wsMatch = sql.slice(pos).match(/^(\s+)/);
		if (wsMatch) {
			tokens.push({ type: 'text', value: wsMatch[1] });
			pos += wsMatch[1].length;
			continue;
		}

		// Single-line comment
		if (sql.slice(pos, pos + 2) === '--') {
			const end = sql.indexOf('\n', pos);
			const comment = end === -1 ? sql.slice(pos) : sql.slice(pos, end);
			tokens.push({ type: 'comment', value: comment });
			pos += comment.length;
			continue;
		}

		// Multi-line comment
		if (sql.slice(pos, pos + 2) === '/*') {
			const end = sql.indexOf('*/', pos + 2);
			const comment = end === -1 ? sql.slice(pos) : sql.slice(pos, end + 2);
			tokens.push({ type: 'comment', value: comment });
			pos += comment.length;
			continue;
		}

		// String literal (single quotes)
		if (sql[pos] === "'") {
			let end = pos + 1;
			while (end < sql.length) {
				if (sql[end] === "'" && sql[end + 1] === "'") {
					end += 2; // Escaped quote
				} else if (sql[end] === "'") {
					break;
				} else {
					end++;
				}
			}
			const str = sql.slice(pos, end + 1);
			tokens.push({ type: 'string', value: str });
			pos = end + 1;
			continue;
		}

		// Dollar-quoted string
		if (sql[pos] === '$') {
			const tagMatch = sql.slice(pos).match(/^\$([a-zA-Z_]*)\$/);
			if (tagMatch) {
				const tag = tagMatch[0];
				const endTag = sql.indexOf(tag, pos + tag.length);
				const str = endTag === -1 ? sql.slice(pos) : sql.slice(pos, endTag + tag.length);
				tokens.push({ type: 'string', value: str });
				pos += str.length;
				continue;
			}
		}

		// Number (integer, decimal, scientific notation)
		const numMatch = sql.slice(pos).match(/^(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/);
		if (numMatch) {
			tokens.push({ type: 'number', value: numMatch[1] });
			pos += numMatch[1].length;
			continue;
		}

		// Operators
		const opMatch = sql.slice(pos).match(SQL_OPERATORS);
		if (opMatch) {
			tokens.push({ type: 'operator', value: opMatch[1] });
			pos += opMatch[1].length;
			continue;
		}

		// Identifier or keyword
		const identMatch = sql.slice(pos).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
		if (identMatch) {
			const word = identMatch[1];
			const isKeyword = SQL_KEYWORDS.has(word.toUpperCase());
			tokens.push({
				type: isKeyword ? 'keyword' : 'identifier',
				value: word
			});
			pos += word.length;
			continue;
		}

		// Quoted identifier (handles escaped "" like single quotes handle '')
		if (sql[pos] === '"') {
			let end = pos + 1;
			while (end < sql.length) {
				if (sql[end] === '"' && sql[end + 1] === '"') {
					end += 2; // Escaped quote
				} else if (sql[end] === '"') {
					break;
				} else {
					end++;
				}
			}
			const ident = sql.slice(pos, end + 1);
			tokens.push({ type: 'identifier', value: ident });
			pos = end + 1;
			continue;
		}

		// Single character (punctuation, etc.)
		tokens.push({ type: 'text', value: sql[pos] });
		pos++;
	}

	return tokens;
}
