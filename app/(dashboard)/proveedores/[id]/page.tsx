import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PresupuestosClient } from "./PresupuestosClient";

export default async function ProveedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: { presupuestos: { orderBy: { createdAt: "desc" } } },
  });

  if (!proveedor) notFound();

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/proveedores" className="hover:text-[#2E86AB]">Proveedores</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{proveedor.nombre}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{proveedor.nombre}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-700">
              {proveedor.pais && <span>🌍 {proveedor.pais}</span>}
              {proveedor.contacto && <span>👤 {proveedor.contacto}</span>}
              {proveedor.email && <span>✉️ {proveedor.email}</span>}
              {proveedor.telefono && <span>📞 {proveedor.telefono}</span>}
            </div>
            {proveedor.notas && <p className="mt-2 text-xs text-gray-500">{proveedor.notas}</p>}
          </div>
          <span className="text-sm bg-[#2E86AB]/10 text-[#2E86AB] font-semibold px-3 py-1.5 rounded-full">
            {proveedor.presupuestos.length} presupuesto(s)
          </span>
        </div>
      </div>

      {/* Presupuestos */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Presupuestos recibidos</h2>
        <p className="text-sm text-gray-600 mt-0.5">Subí un PDF y analizalo con IA para extraer precios e ítems automáticamente</p>
      </div>

      <PresupuestosClient
        proveedorId={id}
        presupuestos={proveedor.presupuestos as any}
      />
    </div>
  );
}
