import { prisma } from "@/lib/prisma";

/**
 * Resuelve el perfil de empresa emisora (slot 1 o 2) usado para
 * generar documentos (DOCX/PDF/preview) y branding del portal.
 * Cualquier valor inesperado de slot cae a 1.
 */
export async function getCompanyProfile(slot: number | null | undefined) {
  const safeSlot = slot === 2 ? 2 : 1;
  return prisma.companyProfile.findUnique({ where: { slot: safeSlot } });
}
