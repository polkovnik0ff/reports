import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_BLOCKS } from "../lib/blocks/defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.template.count();
  if (count > 0) {
    console.log(`Templates already exist (${count}). Skipping seed.`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template = await prisma.template.create({
    data: {
      name: "Стандартный отчёт",
      blocksConfig: DEFAULT_BLOCKS as unknown as any,
      isDefault: true,
    },
  });

  console.log(`✓ Created default template: "${template.name}" (id: ${template.id})`);
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
