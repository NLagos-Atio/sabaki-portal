-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "pais" TEXT,
    "contacto" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PresupuestoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "numeroQuote" TEXT,
    "fechaDoc" DATETIME,
    "validezOferta" DATETIME,
    "moneda" TEXT,
    "incoterm" TEXT,
    "condPago" TEXT,
    "impuestos" TEXT,
    "descuentos" TEXT,
    "subtotal" REAL,
    "totalFinal" REAL,
    "cargosJson" TEXT,
    "itemsJson" TEXT,
    "analisisRaw" TEXT,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PresupuestoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
