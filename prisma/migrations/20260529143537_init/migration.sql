-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioUsd" REAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validezDias" INTEGER NOT NULL DEFAULT 30,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "tipoCambio" REAL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "clienteEmpresa" TEXT NOT NULL,
    "clienteCuit" TEXT,
    "clienteContacto" TEXT,
    "clienteCargo" TEXT,
    "clienteTelefono" TEXT,
    "alcance" TEXT,
    "introduccion" TEXT,
    "sitios" TEXT,
    "condiciones" TEXT,
    "margen" REAL NOT NULL DEFAULT 0,
    "iva" REAL NOT NULL DEFAULT 21,
    "totalOnetimeUsd" REAL NOT NULL DEFAULT 0,
    "totalRecurrenteUsd" REAL NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cotizacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "precioUsd" REAL NOT NULL,
    "subtotalUsd" REAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'onetime',
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CotizacionItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CotizacionTasa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" REAL NOT NULL,
    CONSTRAINT "CotizacionTasa_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_numero_key" ON "Cotizacion"("numero");
