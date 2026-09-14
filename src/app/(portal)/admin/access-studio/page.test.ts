import { expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { portalApp: { findMany: mocks.findMany } } }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import AccessStudioPage from "./page";
import DepartmentsPage from "../departments/page";
test("other administrators cannot load access administration pages", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "ADMIN", email: "other@fieldstonehomes.com" } });
  for (const page of [AccessStudioPage, DepartmentsPage]) {
    await expect(page()).rejects.toThrow("redirect:/dashboard");
  }
  expect(mocks.findMany).not.toHaveBeenCalled();
});
