import { prisma } from "@/lib/prisma";
import { CotizacionForm } from "../CotizacionForm";
import { notFound } from "next/navigation";
import { getCompanyProfile } from "@/lib/company-profile";

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [cotizacion, productos, profile1, profile2] = await Promise.all([
    prisma.cotizacion.findUnique({
      where: { id },
      include: { items: { orderBy: { orden: "asc" } }, tasas: true },
    }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getCompanyProfile(1),
    prisma.companyProfile.findUnique({ where: { slot: 2 }, select: { nombre: true } }),
  ]);

  if (!cotizacion) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cotización</h1>
        <p className="text-sm text-gray-700 mt-1">{cotizacion.numero}</p>
      </div>
      <CotizacionForm
        cotizacion={cotizacion as any}
        productos={productos}
        defaultNumero={cotizacion.numero}
        defaultCondiciones={cotizacion.condiciones || ""}
        profileNombre1={profile1?.nombre || ""}
        profileNombre2={profile2?.nombre || ""}
      />
    </div>
  );
}
