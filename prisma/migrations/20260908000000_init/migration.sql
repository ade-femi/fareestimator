-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "originAddress" TEXT NOT NULL,
    "pricePerMile" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "minimumFee" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "maxRadiusMiles" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "feeExplanation" TEXT NOT NULL DEFAULT 'Travel fees help cover fuel, travel time, vehicle wear, and transportation expenses required to provide services at your location.',
    "outsideAreaMessage" TEXT NOT NULL DEFAULT 'We''re sorry, this destination is currently outside our normal service area. Please contact us directly to discuss your project.',
    "displayPricePerMile" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT NOT NULL DEFAULT 'Travel Fee Estimator',
    "companyLogo" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0f172a',
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

