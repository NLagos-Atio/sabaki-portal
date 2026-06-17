import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const profile = await prisma.companyProfile.findUnique({ where: { slot: 1 } });

  return <LoginForm logoPath={profile?.logoPath} nombre={profile?.nombre} />;
}
