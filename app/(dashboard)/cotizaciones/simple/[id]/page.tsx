import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CotizacionSimpleForm } from "../../CotizacionSimpleForm";
import { getCompanyProfile } from "@/lib/company-profile";

export default async function EditarCotizacionSimplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [cotizacion, productos, profile1, profile2] = await Promise.all([
    prisma.cotizacionSimple.findUnique({
      where: { id },
      include: {
        items:       { orderBy: { orden: "asc" } },
        condiciones: { orderBy: { orden: "asc" } },
      },
    }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getCompanyProfile(1),
    prisma.companyProfile.findUnique({ where: { slot: 2 }, select: { nombre: true } }),
  ]);

  if (!cotizacion) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Cotización Simple</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar — {cotizacion.numero}</h1>
        <p className="text-sm text-gray-700 mt-1">{cotizacion.clienteEmpresa}</p>
      </div>
      <CotizacionSimpleForm
        cotizacion={{
          ...cotizacion,
          fecha: new Date(cotizacion.fecha).toISOString().split("T")[0],
          clienteContacto: cotizacion.clienteContacto || "",
          items:       cotizacion.items.map((i) => ({
          ...i,
          notaSecundaria: i.notaSecundaria || "",
          costoUsd:  i.costoUsd  ?? null,
          margenPct: i.margenPct ?? null,
        })),
          condiciones: cotizacion.condiciones,
        }}
        productos={productos}
        defaultNumero={cotizacion.numero}
        defaultCondiciones={cotizacion.condiciones}
        profileNombre1={profile1?.nombre || ""}
        profileNombre2={profile2?.nombre || ""}
      />
    </div>
  );
}
