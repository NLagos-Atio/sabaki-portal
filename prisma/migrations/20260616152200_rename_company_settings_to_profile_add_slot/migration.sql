-- Rename CompanySettings -> CompanyProfile, add slot column (perfil 1 o 2)
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "condicionIva" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "contactoNombre" TEXT NOT NULL,
    "contactoCargo" TEXT NOT NULL,
    "logoPath" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#1B2A4A',
    "colorSecundario" TEXT NOT NULL DEFAULT '#2E86AB',
    "notasDefault" TEXT,
    "condicionesSimpleDefault" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- Migrar la fila existente del singleton al perfil slot=1 (preserva logoPath y todos los datos)
INSERT INTO "CompanyProfile" ("id", "slot", "nombre", "cuit", "condicionIva", "direccion", "contactoNombre", "contactoCargo", "logoPath", "colorPrimario", "colorSecundario", "notasDefault", "condicionesSimpleDefault", "updatedAt")
SELECT "id", 1, "nombre", "cuit", "condicionIva", "direccion", "contactoNombre", "contactoCargo", "logoPath", "colorPrimario", "colorSecundario", "notasDefault", "condicionesSimpleDefault", "updatedAt"
FROM "CompanySettings";

DROP TABLE "CompanySettings";

CREATE UNIQUE INDEX "CompanyProfile_slot_key" ON "CompanyProfile"("slot");

-- Agregar profileSlot a Cotizacion y CotizacionSimple (default 1 -> retrocompatibilidad automática)
ALTER TABLE "Cotizacion" ADD COLUMN "profileSlot" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CotizacionSimple" ADD COLUMN "profileSlot" INTEGER NOT NULL DEFAULT 1;
