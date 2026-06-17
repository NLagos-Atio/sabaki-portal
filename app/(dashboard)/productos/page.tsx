import { prisma } from "@/lib/prisma";
import { ProductosClient } from "./ProductosClient";

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: "asc" } });
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos & Servicios</h1>
        <p className="text-sm text-gray-700 mt-1">Catálogo de ítems reutilizables en cotizaciones</p>
      </div>
      <ProductosClient productos={productos as any} />
    </div>
  );
}
