import { prisma } from "@/lib/prisma";
import { AjustesClient } from "./AjustesClient";

export default async function AjustesPage() {
  const [profile1, profile2] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { slot: 1 } }),
    prisma.companyProfile.findUnique({ where: { slot: 2 } }),
  ]);
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Empresa</h1>
        <p className="text-sm text-gray-700 mt-1">Datos que aparecerán en los PDFs generados, por perfil de empresa emisora</p>
      </div>
      <AjustesClient profile1={profile1} profile2={profile2} />
    </div>
  );
}
