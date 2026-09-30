import { describe, expect, it } from "vitest";
import { resetCustomizedRequested } from "./reopen";

describe("reopen form parsing", () => {
  it("defaults to protecting customized drafts", () => {
    expect(resetCustomizedRequested(new FormData())).toBe(false);
  });

  it("only resets customized drafts when the checkbox is explicitly ticked", () => {
    const form = new FormData();
    form.set("resetCustomized", "on");
    expect(resetCustomizedRequested(form)).toBe(true);
    form.set("resetCustomized", "off");
    expect(resetCustomizedRequested(form)).toBe(false);
  });
});
