import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  session: null as null | { user: { role: string; email?: string } },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import RequestsRedirect from "./page";
import RequestCenterPage from "../request-center/page";

describe("Request Center limited launch", () => {
  beforeEach(() => {
    state.session = null;
    vi.stubEnv("REQUEST_CENTER_USERS", "janeh@fieldstonehomes.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  for (const [name, page] of [["old employee URL", RequestsRedirect], ["request-center page", RequestCenterPage]] as const) {
    it(`${name} requires sign-in`, async () => {
      await expect(page()).rejects.toThrow("redirect:/login");
    });
    for (const role of ["EMPLOYEE", "MANAGER"]) {
      it(`${name} denies a non-allowlisted ${role}`, async () => {
        state.session = { user: { role, email: "someone@fieldstonehomes.com" } };
        await expect(page()).rejects.toThrow("redirect:/home");
      });
    }
  }
  it("redirects an administrator's old bookmark to /request-center", async () => {
    state.session = { user: { role: "ADMIN" } };
    await expect(RequestsRedirect()).rejects.toThrow("redirect:/request-center");
  });
  it("redirects an allowlisted employee's old bookmark to /request-center", async () => {
    state.session = {
      user: { role: "EMPLOYEE", email: "JaneH@fieldstonehomes.com" },
    };
    await expect(RequestsRedirect()).rejects.toThrow("redirect:/request-center");
  });
});
