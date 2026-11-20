-- Keep legacy columns/rows for recovery while exposing only the simple fields through Prisma.
ALTER TABLE "earn_salaries" DROP CONSTRAINT IF EXISTS "earn_salary_valid";
ALTER TABLE "earn_salaries" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "earn_salaries" ALTER COLUMN "daysWorked" DROP NOT NULL;
ALTER TABLE "earn_salaries" ALTER COLUMN "dailyRate" DROP NOT NULL;
ALTER TABLE "earn_production" DROP CONSTRAINT IF EXISTS "earn_production_valid";
ALTER TABLE "earn_production" ALTER COLUMN "description" SET DEFAULT 'Daily production';
ALTER TABLE "earn_production" ALTER COLUMN "unitRate" DROP NOT NULL;
ALTER TABLE "earn_cash_entries" DROP CONSTRAINT IF EXISTS "earn_cash_valid";
ALTER TABLE "earn_cash_entries" ALTER COLUMN "description" SET DEFAULT 'Daily cashflow expense';
ALTER TABLE "earn_cash_entries" ALTER COLUMN "direction" SET DEFAULT 'OUT';

INSERT INTO "earn_salaries" (id,date,amount,"createdBy","createdAt","updatedAt")
SELECT 'simple-salary-'||date::text,date,SUM(amount),'schema-migration',MIN("createdAt"),CURRENT_TIMESTAMP
FROM "earn_salaries" WHERE "voidedAt" IS NULL GROUP BY date;
UPDATE "earn_salaries" SET "voidedAt"=CURRENT_TIMESTAMP WHERE "voidedAt" IS NULL AND id NOT LIKE 'simple-salary-%';

INSERT INTO "earn_production" (id,date,quantity,amount,"createdBy","createdAt","updatedAt")
SELECT 'simple-production-'||date::text,date,SUM(quantity),SUM(amount),'schema-migration',MIN("createdAt"),CURRENT_TIMESTAMP
FROM "earn_production" WHERE "voidedAt" IS NULL GROUP BY date;
UPDATE "earn_production" SET "voidedAt"=CURRENT_TIMESTAMP WHERE "voidedAt" IS NULL AND id NOT LIKE 'simple-production-%';

INSERT INTO "earn_cash_entries" (id,date,amount,"createdBy","createdAt","updatedAt")
SELECT 'simple-cashflow-'||date::text,date,SUM(amount),'schema-migration',MIN("createdAt"),CURRENT_TIMESTAMP
FROM (
 SELECT date,amount,"createdAt" FROM "earn_cash_entries" WHERE "voidedAt" IS NULL AND direction='OUT'
 UNION ALL SELECT date,amount,"createdAt" FROM "earn_expenses" WHERE "voidedAt" IS NULL
) expenses GROUP BY date;
UPDATE "earn_cash_entries" SET "voidedAt"=CURRENT_TIMESTAMP WHERE "voidedAt" IS NULL AND id NOT LIKE 'simple-cashflow-%';

DROP INDEX IF EXISTS "earn_one_salary_per_day";
CREATE UNIQUE INDEX "earn_salary_date_active" ON "earn_salaries" (date) WHERE "voidedAt" IS NULL;
CREATE UNIQUE INDEX "earn_production_date_active" ON "earn_production" (date) WHERE "voidedAt" IS NULL;
CREATE UNIQUE INDEX "earn_cashflow_date_active" ON "earn_cash_entries" (date) WHERE "voidedAt" IS NULL;
ALTER TABLE "earn_salaries" ADD CONSTRAINT "earn_net_salary_valid" CHECK (amount >= 0);
ALTER TABLE "earn_production" ADD CONSTRAINT "earn_daily_production_valid" CHECK (quantity >= 0 AND amount >= 0);
ALTER TABLE "earn_cash_entries" ADD CONSTRAINT "earn_net_amount_valid" CHECK (amount >= 0);
