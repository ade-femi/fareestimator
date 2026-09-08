-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "originAddress" TEXT NOT NULL,
    "pricePerMile" REAL NOT NULL DEFAULT 3,
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
INSERT INTO "new_Settings" ("brandColor", "companyLogo", "companyName", "contactEmail", "contactPhone", "createdAt", "displayPricePerMile", "feeExplanation", "id", "maxRadiusMiles", "minimumFee", "originAddress", "outsideAreaMessage", "pricePerMile", "updatedAt") SELECT "brandColor", "companyLogo", "companyName", "contactEmail", "contactPhone", "createdAt", "displayPricePerMile", "feeExplanation", "id", "maxRadiusMiles", "minimumFee", "originAddress", "outsideAreaMessage", "pricePerMile", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
