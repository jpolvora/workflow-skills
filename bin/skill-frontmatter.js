/**
 * SKILL.md YAML frontmatter rewrite used by build-site --bump.
 * LF-normalize, parse the opening fence by length (not slice(4)), and strip
 * leading/trailing blank lines so Windows CRLF checkouts cannot accumulate
 * empty lines after --- on each version stamp.
 */

/**
 * @param {string} text
 * @param {string} siteVersion
 * @returns {string | null} rewritten markdown (LF) or null if no frontmatter
 */
export function rewriteSkillMarkdown(text, siteVersion) {
  const lf = String(text).replace(/\r\n/g, '\n');
  const open = lf.match(/^---\n/);
  if (!open) return null;
  const afterOpen = lf.slice(open[0].length);
  const close = afterOpen.match(/\n---\n/);
  if (!close) return null;
  let fm = afterOpen.slice(0, close.index).replace(/^\n+/, '').replace(/\n+$/, '');
  const body = afterOpen.slice(close.index + close[0].length);
  if (/^version:\s*/m.test(fm)) {
    fm = fm.replace(/^version:\s*.*$/m, `version: ${siteVersion}`);
  } else if (/^name:\s*/m.test(fm)) {
    fm = fm.replace(/^(name:\s*.*)$/m, `$1\nversion: ${siteVersion}`);
  } else {
    fm = `version: ${siteVersion}\n${fm}`;
  }
  return `---\n${fm}\n---\n${body}`;
}
