/**
 * Usage: npx tsx scripts/create-admin.ts <email> <password>
 * Creates a user with role OWNER in the database.
 */

// Load .env.local before importing anything that reads process.env
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx ts-node scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role})`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Admin",
      role: "OWNER",
    },
  });

  console.log(`✓ Created user: ${user.email} (id: ${user.id}, role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
