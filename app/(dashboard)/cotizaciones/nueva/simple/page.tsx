import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { CotizacionSimpleForm } from "../../CotizacionSimpleForm";

const CONDICIONES_DEFAULT = [
  { label: "Precios:",           valor: 'Los precios indicados son en USD y NO incluyen IVA (21%). El IVA se facturará por separado según la condición impositiva del comprador.', orden: 0 },
  { label: "Pago:",              valor: "100% contra entrega.",                                              orden: 1 },
  { label: "Plazo de entrega:",  valor: "8 a 10 semanas desde confirmación de orden de compra.",             orden: 2 },
  { label: "Garantía:",          valor: "12 meses por defectos de fabricación.",                             orden: 3 },
  { label: "Entrega",            valor: "",                                                                   orden: 4 },
  { label: "Validez:",           valor: "30 días.",                                                          orden: 5 },
];

export default async function NuevaCotizacionSimplePage() {
  const [productos, settings, profile2, ultima] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getCompanyProfile(1),
    prisma.companyProfile.findUnique({ where: { slot: 2 }, select: { nombre: true } }),
    prisma.cotizacionSimple.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  // Número correlativo CV-YYYY-NNN
  const year    = new Date().getFullYear();
  const lastNum = ultima?.numero.match(/(\d+)$/)?.[1];
  const next    = lastNum ? String(Number(lastNum) + 1).padStart(3, "0") : "001";
  const numero  = `CV-${year}-${next}`;

  // Condiciones por defecto: desde ajustes o las hardcoded
  let defaultCondiciones = CONDICIONES_DEFAULT;
  if (settings?.condicionesSimpleDefault) {
    try {
      const parsed = JSON.parse(settings.condicionesSimpleDefault);
      if (Array.isArray(parsed) && parsed.length > 0) {
        defaultCondiciones = parsed.map((c: any, i: number) => ({ ...c, orden: i }));
      }
    } catch {}
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Cotización Simple</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Cotización Simple</h1>
        <p className="text-sm text-gray-700 mt-1">Formato de productos/piezas — sin secciones narrativas</p>
      </div>
      <CotizacionSimpleForm
        productos={productos}
        defaultNumero={numero}
        defaultCondiciones={defaultCondiciones}
        profileNombre1={settings?.nombre || ""}
        profileNombre2={profile2?.nombre || ""}
      />
    </div>
  );
}
