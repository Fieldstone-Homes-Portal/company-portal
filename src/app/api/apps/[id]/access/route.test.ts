import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  update: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
import { PATCH } from "./route";
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/apps/app/access", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
const context = { params: Promise.resolve({ id: "app" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    user: { role: "ADMIN", email: "admin@example.com" },
  });
  mocks.transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        portalApp: { update: mocks.update },
        appGrant: {
          createMany: mocks.createMany,
          deleteMany: mocks.deleteMany,
        },
      }),
  );
});
test("non-admin cannot grant or remove software access", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "MANAGER" } });
  expect(
    (
      await PATCH(
        request({ action: "grant", userIds: ["user"], deptIds: [] }),
        context,
      )
    ).status,
  ).toBe(403);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
test("bulk grant connects groups without replacing existing policy", async () => {
  expect(
    (
      await PATCH(
        request({ action: "grant", userIds: ["u", "u"], deptIds: ["g"] }),
        context,
      )
    ).status,
  ).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "app" },
    data: { departments: { connect: [{ id: "g" }] } },
  });
  expect(mocks.createMany).toHaveBeenCalledWith({
    data: [{ appId: "app", userId: "u", grantedBy: "admin@example.com" }],
    skipDuplicates: true,
  });
  expect(mocks.deleteMany).not.toHaveBeenCalled();
});
test("removing selected grants leaves unrelated users alone", async () => {
  expect(
    (
      await PATCH(
        request({ action: "remove", userIds: ["u"], deptIds: [] }),
        context,
      )
    ).status,
  ).toBe(200);
  expect(mocks.deleteMany).toHaveBeenCalledWith({
    where: { appId: "app", userId: { in: ["u"] } },
  });
});
test("bad group and user selection fails validation before writing", async () => {
  expect(
    (
      await PATCH(
        request({ action: "grant", userIds: [123], deptIds: [] }),
        context,
      )
    ).status,
  ).toBe(400);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
