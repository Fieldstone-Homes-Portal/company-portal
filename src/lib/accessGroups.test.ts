import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ graphGet: vi.fn(), findMany: vi.fn() }));
vi.mock("./graphClient", () => ({ graphGet: mocks.graphGet }));
vi.mock("./prisma", () => ({
  prisma: { department: { findMany: mocks.findMany } },
}));
import { graphPages, directoryDepartments } from "./accessGroups";
beforeEach(() => vi.resetAllMocks());
test("reads every directory membership page", async () => {
  mocks.graphGet
    .mockResolvedValueOnce({
      value: [{ id: "one" }],
      "@odata.nextLink": "https://graph.microsoft.com/v1.0/groups?$skiptoken=2",
    })
    .mockResolvedValueOnce({ value: [{ id: "two" }] });
  expect(await graphPages("/groups")).toEqual([{ id: "one" }, { id: "two" }]);
  expect(mocks.graphGet).toHaveBeenLastCalledWith("/groups?$skiptoken=2");
});
test("never forwards a directory credential to a foreign pagination URL", async () => {
  mocks.graphGet.mockResolvedValue({
    value: [],
    "@odata.nextLink": "https://example.com/steal",
  });
  await expect(graphPages("/groups")).rejects.toThrow(
    "Invalid Graph pagination",
  );
  expect(mocks.graphGet).toHaveBeenCalledTimes(1);
});
test("only current Microsoft memberships grant access, and outages fail closed", async () => {
  mocks.findMany.mockResolvedValue([
    { id: "local-a", name: "A", externalId: "a" },
    { id: "local-b", name: "B", externalId: "b" },
  ]);
  mocks.graphGet
    .mockResolvedValueOnce({ value: [{ id: "a" }] })
    .mockResolvedValueOnce({ value: [] })
    .mockRejectedValueOnce(new Error("offline"));
  expect(await directoryDepartments("staff@fieldstonehomes.com")).toEqual([
    { id: "local-a", name: "A" },
  ]);
  expect(await directoryDepartments("staff@fieldstonehomes.com")).toEqual([]);
  expect(await directoryDepartments("staff@fieldstonehomes.com")).toEqual([]);
});
