-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "originAddress" TEXT NOT NULL,
    "pricePerMile" REAL NOT NULL DEFAULT 0.8,
    "minimumFee" REAL NOT NULL DEFAULT 30,
    "maxRadiusMiles" REAL NOT NULL DEFAULT 100,
    "feeExplanation" TEXT NOT NULL DEFAULT 'Travel fees help cover fuel, travel time, vehicle wear, and transportation expenses required to provide services at your location.',
    "outsideAreaMessage" TEXT NOT NULL DEFAULT 'We''re sorry, this destination is currently outside our normal service area. Please contact us directly to discuss your project.',
    "displayPricePerMile" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT NOT NULL DEFAULT 'Travel Fee Estimator',
    "companyLogo" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0f172a',
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");
