/**
 * 转义 SQL LIKE 通配符，防止用户输入 % 或 _ 干扰查询语义。
 * % → \%
 * _ → \_
 * \ → \\
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}
