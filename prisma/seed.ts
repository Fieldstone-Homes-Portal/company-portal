import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Initial set of departments. Editable later via the /admin/departments UI.
// `upsert` makes this idempotent — re-running seed is safe.
const SEED_DEPARTMENTS: { name: string; description: string }[] = [
  { name: "Construction", description: "Field operations, superintendents, trades." },
  { name: "Sales",        description: "New-home sales, model homes, sales counselors." },
  { name: "Marketing",    description: "Brand, advertising, digital marketing, content." },
  { name: "Land",         description: "Land acquisition, development, entitlements." },
  { name: "Accounting",   description: "AP, AR, payroll, financial reporting." },
  { name: "HR",           description: "Hiring, benefits, employee relations." },
  { name: "Customer Service", description: "Warranty, post-close support, homeowner care." },
  { name: "Design",       description: "Architecture, drafting, product design, options." },
  { name: "IT",           description: "Internal IT, infrastructure, security." },
  { name: "Executive",    description: "Leadership team." },
];

async function main() {
  // ---------------------------------------------------------------------
  // Departments (idempotent)
  // ---------------------------------------------------------------------
  for (const dept of SEED_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: { description: dept.description },
      create: dept,
    });
  }
  console.log(`Seeded ${SEED_DEPARTMENTS.length} departments.`);

  // ---------------------------------------------------------------------
  // Starter apps
  // ---------------------------------------------------------------------
  await prisma.portalApp.upsert({
    where: { id: "plat-studio" },
    update: {},
    create: {
      id: "plat-studio",
      name: "Plat Studio",
      description:
        "Interactive lot mapping tool for subdivision plats with live DOMO data overlay",
      icon: "map",
      url: "http://localhost:5053",
      allStaff: true,
      category: "tools",
      sortOrder: 1,
      openIn: "iframe",
    },
  });

  // ---------------------------------------------------------------------
  // Make the first user (skyler) an ADMIN + put them in every department
  // so the existing admin doesn't lose access during the transition.
  // ---------------------------------------------------------------------
  const skyler = await prisma.user.findUnique({
    where: { email: "skyler@fieldstonehomes.com" },
  });
  if (skyler) {
    const allDepts = await prisma.department.findMany({ select: { id: true } });
    await prisma.user.update({
      where: { id: skyler.id },
      data: {
        role: "ADMIN",
        departments: { set: allDepts.map((d) => ({ id: d.id })) },
      },
    });
    console.log(
      `Set skyler@fieldstonehomes.com as ADMIN + member of ${allDepts.length} departments`,
    );
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
