export const USER_CSS_STYLE_ID = "auraliq-user-css";
export const MAX_USER_CSS_LENGTH = 32_768;

export interface SanitizedCssResult {
  css: string;
  warnings: string[];
}

export function sanitizeUserCss(rawCss: string): SanitizedCssResult {
  const warnings: string[] = [];
  let css = rawCss;

  if (css.length > MAX_USER_CSS_LENGTH) {
    css = css.slice(0, MAX_USER_CSS_LENGTH);
    warnings.push(`Custom CSS exceeded ${MAX_USER_CSS_LENGTH} characters and was truncated.`);
  }

  if (/<\/?style/i.test(css)) {
    css = css.replace(/<\/?style[^>]*>/gi, "");
    warnings.push("Removed <style> tags from custom CSS.");
  }

  if (/@import\b/i.test(css)) {
    css = css.replace(/@import\b[^;\n]*(;|$)/gi, "/* blocked import */");
    warnings.push("Blocked @import directives for local-only security.");
  }

  if (/expression\s*\(/i.test(css)) {
    css = css.replace(/expression\s*\([^)]*\)/gi, "none");
    warnings.push("Blocked legacy CSS expression() calls.");
  }

  if (/behavior\s*:|-moz-binding\s*:/i.test(css)) {
    css = css.replace(/(behavior|-moz-binding)\s*:[^;\n]*(;|$)/gi, "");
    warnings.push("Blocked legacy behavior / -moz-binding directives.");
  }

  if (/javascript\s*:/i.test(css)) {
    css = css.replace(/javascript\s*:/gi, "blocked:");
    warnings.push("Blocked javascript: URI scheme.");
  }

  if (/url\(\s*['"]?\s*(https?:|\/\/|file:)/i.test(css)) {
    css = css.replace(
      /url\(\s*['"]?\s*(https?:|\/\/|file:)[^)]*\)/gi,
      "/* blocked external url() */",
    );
    warnings.push("Blocked external network/file url() references.");
  }

  return { css, warnings };
}

export function applyUserCssToDocument(rawCss: string, enabled: boolean): string[] {
  if (typeof document === "undefined") {
    return [];
  }

  const existing = document.getElementById(USER_CSS_STYLE_ID);
  if (!enabled || !rawCss.trim()) {
    existing?.remove();
    return [];
  }

  const { css, warnings } = sanitizeUserCss(rawCss);
  if (!css.trim()) {
    existing?.remove();
    return warnings;
  }

  let styleEl = existing as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = USER_CSS_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
  return warnings;
}
