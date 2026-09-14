import { describe, it, expect } from "vitest";
import { canManageAccess } from "./accessStudioPolicy";
describe("named access administrators", () => {
  it("allows only Tim and Skyler with ADMIN roles", () => {
    for (const email of ["tim@fieldstonehomes.com", "Skyler@fieldstonehomes.com"]) {
      expect(canManageAccess({role:"ADMIN",email})).toBe(true);
      expect(canManageAccess({role:"EMPLOYEE",email})).toBe(false);
    }
    expect(canManageAccess({role:"ADMIN",email:"other@fieldstonehomes.com"})).toBe(false);
    expect(canManageAccess({role:"ADMIN"})).toBe(false);
    expect(canManageAccess(null)).toBe(false);
  });
});
