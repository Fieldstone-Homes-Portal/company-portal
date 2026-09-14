import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  graphPages: vi.fn(),
  transaction: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/accessGroups", () => ({ graphPages: mocks.graphPages }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    department: {
      create: mocks.create,
      update: mocks.update,
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));
import { POST } from "./route";
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/access-groups", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { role: "ADMIN" } });
});
test("employees and managers cannot change access groups", async () => {
  for (const role of ["EMPLOYEE", "MANAGER"]) {
    mocks.auth.mockResolvedValue({ user: { role } });
    expect(
      (await POST(request({ name: "Unauthorized", userIds: [] }))).status,
    ).toBe(403);
  }
  expect(mocks.create).not.toHaveBeenCalled();
});
test("failed Microsoft pagination does not mutate saved groups", async () => {
  mocks.graphPages.mockRejectedValue(new Error("offline"));
  expect((await POST(request({ action: "sync" }))).status).toBe(400);
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
test("Microsoft groups cannot be rewritten as custom memberships", async () => {
  mocks.findUnique.mockResolvedValue({ source: "microsoft" });
  expect(
    (
      await POST(
        request({ id: "directory-id", name: "Changed", userIds: ["person"] }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
