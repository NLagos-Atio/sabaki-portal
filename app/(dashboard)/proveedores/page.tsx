import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProveedoresClient } from "./ProveedoresClient";

export default async function ProveedoresPage() {
  const [session, proveedores] = await Promise.all([
    auth(),
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { presupuestos: true } } },
    }),
  ]);

  const userRole = (session?.user as any)?.role || "user";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-sm text-gray-700 mt-1">Gestión de proveedores y análisis de presupuestos con IA</p>
      </div>
      <ProveedoresClient proveedores={proveedores as any} userRole={userRole} />
    </div>
  );
}
