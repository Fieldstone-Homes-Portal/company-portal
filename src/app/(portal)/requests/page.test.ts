import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ session: null as null | { user: { role: string } } }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import RequestsRedirect from "./page";
import RequestCenterPage from "../admin/request-center/page";

describe("Request Center admin preview", () => {
  beforeEach(() => { state.session = null; });
  for (const [name, page] of [["old employee URL", RequestsRedirect], ["management page", RequestCenterPage]] as const) {
    it(`${name} requires sign-in`, async () => {
      await expect(page()).rejects.toThrow("redirect:/login");
    });
    for (const role of ["EMPLOYEE", "MANAGER"]) {
      it(`${name} denies ${role}`, async () => {
        state.session = { user: { role } };
        await expect(page()).rejects.toThrow("redirect:/home");
      });
    }
  }
  it("redirects an administrator's old bookmark into Management", async () => {
    state.session = { user: { role: "ADMIN" } };
    await expect(RequestsRedirect()).rejects.toThrow("redirect:/admin/request-center");
  });
});
