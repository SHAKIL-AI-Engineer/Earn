ALTER TABLE "earn_workspace" ALTER COLUMN "currency" SET DEFAULT 'BDT';
UPDATE "earn_workspace" SET "currency" = 'BDT', "updatedAt" = CURRENT_TIMESTAMP WHERE "currency" = 'USD';
