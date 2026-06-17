import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NuevaCotizacionSelector } from "./NuevaCotizacionSelector";
import { CotizacionesListClient } from "./CotizacionesListClient";

export default async function CotizacionesPage() {
  const session = await auth();

  const [propuestas, simples, profile1, profile2] = await Promise.all([
    prisma.cotizacion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, numero: true, clienteEmpresa: true, fecha: true,
        totalOnetimeUsd: true, totalRecurrenteUsd: true, estado: true,
        moneda: true, profileSlot: true, userId: true,
        user: { select: { name: true } },
      },
    }),
    prisma.cotizacionSimple.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, numero: true, titulo: true, clienteEmpresa: true,
        fecha: true, total: true, estado: true, moneda: true, profileSlot: true, userId: true,
        user: { select: { name: true } },
      },
    }),
    prisma.companyProfile.findUnique({ where: { slot: 1 }, select: { nombre: true } }),
    prisma.companyProfile.findUnique({ where: { slot: 2 }, select: { nombre: true } }),
  ]);

  const total = propuestas.length + simples.length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-700 mt-1">
            {total} documento{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <NuevaCotizacionSelector />
      </div>

      <CotizacionesListClient
        propuestas={propuestas}
        simples={simples}
        profileNombre1={profile1?.nombre || ""}
        profileNombre2={profile2?.nombre || ""}
        sessionUserId={session?.user?.id || ""}
        sessionRole={(session?.user as any)?.role || "user"}
      />
    </div>
  );
}
