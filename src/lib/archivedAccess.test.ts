import { expect, test } from "vitest";
import { canViewArchivedApps, canAccessApp } from "./roles";
test("Tim can open all retained apps without enabling archived apps for others", () => {
  expect(canViewArchivedApps({ role: "ADMIN", email: "Tim@fieldstonehomes.com" })).toBe(true);
  for (const user of [{role:"ADMIN",email:"skyler@fieldstonehomes.com"},{role:"ADMIN",email:"other@example.com"},{role:"EMPLOYEE",email:"tim@fieldstonehomes.com"}]) expect(canViewArchivedApps(user)).toBe(false);
  expect(canAccessApp({role:"ADMIN",id:"tim"},{allStaff:false,departments:[],grants:[]})).toBe(true);
});
