-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "condicionesSimpleDefault" TEXT;

-- CreateTable
CREATE TABLE "CotizacionSimple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'COTIZACION',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "tipoCambio" REAL,
    "clienteEmpresa" TEXT NOT NULL,
    "clienteContacto" TEXT,
    "margen" REAL NOT NULL DEFAULT 0,
    "iva" REAL NOT NULL DEFAULT 21,
    "mostrarIva" BOOLEAN NOT NULL DEFAULT false,
    "total" REAL NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CotizacionSimple_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionSimpleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionSimpleId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "notaSecundaria" TEXT,
    "cantidad" REAL NOT NULL,
    "precioUsd" REAL NOT NULL,
    "subtotalUsd" REAL NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CotizacionSimpleItem_cotizacionSimpleId_fkey" FOREIGN KEY ("cotizacionSimpleId") REFERENCES "CotizacionSimple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionSimpleCondicion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionSimpleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CotizacionSimpleCondicion_cotizacionSimpleId_fkey" FOREIGN KEY ("cotizacionSimpleId") REFERENCES "CotizacionSimple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionSimple_numero_key" ON "CotizacionSimple"("numero");
