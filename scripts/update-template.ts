import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { DEFAULT_BLOCKS } from "../lib/blocks/defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const templates = await prisma.template.findMany();
  console.log(`Found ${templates.length} templates`);

  for (const t of templates) {
    const existing = t.blocksConfig as any[];
    const existingTypes = new Set(existing.map((b: any) => b.type));

    const missing = DEFAULT_BLOCKS.filter((b) => !existingTypes.has(b.type));
    if (missing.length === 0) {
      console.log(`  ${t.name}: up to date`);
      continue;
    }

    const maxOrder = Math.max(...existing.map((b: any) => b.order ?? 0));
    const toAdd = missing.map((b, i) => ({ ...b, order: maxOrder + i + 1 }));
    const updated = [...existing, ...toAdd];

    await prisma.template.update({
      where: { id: t.id },
      data: { blocksConfig: updated as any },
    });
    console.log(`  ${t.name}: added ${toAdd.map((b) => b.type).join(", ")}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
