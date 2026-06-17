import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuariosClient } from "./UsuariosClient";

export default async function UsuariosPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/cotizaciones");

  const usuarios = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, cargo: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-sm text-gray-700 mt-1">Solo administradores pueden acceder a esta sección</p>
      </div>
      <UsuariosClient usuarios={usuarios} />
    </div>
  );
}
