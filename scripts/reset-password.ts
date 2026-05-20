// Reset a user's password to a new known value. Bcrypt hashes are one-way, so
// the only way to recover a forgotten password is to overwrite it.
//
//   pnpm exec tsx scripts/reset-password.ts <email> <new-password>
//
// Example:
//   pnpm exec tsx scripts/reset-password.ts vansh@gmail.com NewPass!2026

import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error("Usage: tsx scripts/reset-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`✅ Password reset for ${email}`);
  console.log(`   You can now sign in at /login with the new password.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
