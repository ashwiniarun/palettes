// PostgREST's `.or()` filter is a raw string where commas/colons/parens are
// syntax, so untrusted search text (e.g. "Cream Mist, Size: 4oz") breaks the
// whole filter with a parse error unless each value is double-quoted.
function escapeFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function orIlike(columns: string[], query: string): string {
  const pattern = escapeFilterValue(`%${query}%`);
  return columns.map(col => `${col}.ilike.${pattern}`).join(',');
}
