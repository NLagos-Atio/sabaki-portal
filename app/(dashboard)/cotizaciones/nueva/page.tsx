import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCompanyProfile } from "@/lib/company-profile";
import { CotizacionForm } from "../CotizacionForm";

export default async function NuevaCotizacionPage() {
  const session = await auth();

  const [productos, settings, profile2, ultima, currentUser] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getCompanyProfile(1),
    prisma.companyProfile.findUnique({ where: { slot: 2 }, select: { nombre: true } }),
    prisma.cotizacion.findFirst({ orderBy: { createdAt: "desc" } }),
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, cargo: true } })
      : null,
  ]);

  // Número correlativo basado en el último registro de la DB
  const year = new Date().getFullYear();
  const lastNum = ultima?.numero.match(/(\d+)$/)?.[1];
  const next = lastNum ? String(Number(lastNum) + 1).padStart(3, "0") : "001";
  const numero = `COT-${year}-${next}`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Cotización</h1>
        <p className="text-sm text-gray-700 mt-1">Completá los datos para generar la propuesta</p>
      </div>
      <CotizacionForm
        productos={productos}
        defaultNumero={numero}
        defaultCondiciones={settings?.notasDefault || ""}
        defaultContactoNombre={currentUser?.name || ""}
        defaultContactoCargo={currentUser?.cargo || ""}
        profileNombre1={settings?.nombre || ""}
        profileNombre2={profile2?.nombre || ""}
      />
    </div>
  );
}
