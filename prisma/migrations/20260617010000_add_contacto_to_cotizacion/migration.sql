-- Contacto comercial propio (de quien emite), editable por documento.
-- Reemplaza el uso del contacto fijo configurado en CompanyProfile.
ALTER TABLE "Cotizacion" ADD COLUMN "contactoNombre" TEXT;
ALTER TABLE "Cotizacion" ADD COLUMN "contactoCargo" TEXT;
