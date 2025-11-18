import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test accounts (required for testing)
  const testAccounts = [
    { email: "john@doe.com", password: "johndoe123", name: "John Doe" },
    { email: "test@example.com", password: "test123456", name: "Test User" }
  ];

  for (const account of testAccounts) {
    const existingUser = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      await prisma.user.create({
        data: {
          email: account.email,
          password: hashedPassword,
          name: account.name,
        },
      });

      console.log(`✅ Test user created: ${account.email}`);
    } else {
      console.log(`ℹ️  Test user already exists: ${account.email}`);
    }
  }

  // Create demo user
  const demoEmail = "demo@devtools.com";
  const demoPassword = "Demo123456!";

  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existingDemo) {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    
    await prisma.user.create({
      data: {
        email: demoEmail,
        password: hashedPassword,
        name: "Demo User",
      },
    });

    console.log("✅ Demo user created: demo@devtools.com / Demo123456!");
  } else {
    console.log("ℹ️  Demo user already exists");
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
