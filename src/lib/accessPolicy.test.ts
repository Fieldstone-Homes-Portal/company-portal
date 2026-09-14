import { expect, test } from "vitest";
import { canAccessApp } from "./roles";
test("custom group membership follows additions and removals without copying individual grants", () => {
  const app = { allStaff: false, departments: [{ id: "group" }], grants: [] };
  expect(
    canAccessApp(
      { id: "staff", role: "EMPLOYEE", departments: [{ id: "group" }] },
      app,
    ),
  ).toBe(true);
  expect(
    canAccessApp({ id: "staff", role: "EMPLOYEE", departments: [] }, app),
  ).toBe(false);
});
test("managers do not bypass software access and unrelated individual grants survive", () => {
  const app = { allStaff: false, departments: [], grants: [{ userId: "one" }] };
  expect(canAccessApp({ id: "two", role: "MANAGER" }, app)).toBe(false);
  expect(canAccessApp({ id: "one", role: "EMPLOYEE" }, app)).toBe(true);
});
