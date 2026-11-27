import { afterEach, describe, expect, it } from "vitest";
import { applyUserCssToDocument, sanitizeUserCss, USER_CSS_STYLE_ID } from "./userCss";

describe("userCss", () => {
  afterEach(() => {
    document.getElementById(USER_CSS_STYLE_ID)?.remove();
  });

  it("strips unsafe @import, external url(), expression(), and </style> tags", () => {
    const raw = `
      @import url("https://evil.example/x.css");
      .aq-panel {
        background: url("https://evil.example/bg.png");
        width: expression(alert(1));
        color: #f3ecff;
      }
      </style><script>alert(1)</script>
    `;
    const result = sanitizeUserCss(raw);
    expect(result.css).not.toContain("@import");
    expect(result.css).not.toContain("https://evil.example");
    expect(result.css).not.toContain("expression(");
    expect(result.css).not.toContain("</style>");
    expect(result.css).toContain("color: #f3ecff;");
    expect(result.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it("injects and removes <style id='auraliq-user-css'> when toggled", () => {
    applyUserCssToDocument(".aq-panel { border-color: #a855f7; }", true);
    const el = document.getElementById(USER_CSS_STYLE_ID);
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("border-color: #a855f7;");

    applyUserCssToDocument(".aq-panel { border-color: #a855f7; }", false);
    expect(document.getElementById(USER_CSS_STYLE_ID)).toBeNull();
  });
});
