CREATE UNIQUE INDEX "earn_one_salary_per_day" ON "earn_salaries" ("employeeId", "date") WHERE "voidedAt" IS NULL;
ALTER TABLE "earn_users" ADD CONSTRAINT "earn_role_valid" CHECK (role IN ('admin','manager','accountant','viewer'));
ALTER TABLE "earn_salaries" ADD CONSTRAINT "earn_salary_valid" CHECK ("daysWorked" > 0 AND "daysWorked" <= 1 AND "dailyRate" > 0 AND amount > 0 AND ("paidOn" IS NULL OR "paidOn" >= date));
ALTER TABLE "earn_production" ADD CONSTRAINT "earn_production_valid" CHECK (quantity > 0 AND "unitRate" > 0 AND amount > 0 AND ("paidOn" IS NULL OR "paidOn" >= date));
ALTER TABLE "earn_expenses" ADD CONSTRAINT "earn_expense_valid" CHECK (amount > 0 AND ("paidOn" IS NULL OR "paidOn" >= date));
ALTER TABLE "earn_cash_entries" ADD CONSTRAINT "earn_cash_valid" CHECK (amount > 0 AND direction IN ('IN','OUT'));
ALTER TABLE "earn_employees" ADD CONSTRAINT "earn_employee_rate_valid" CHECK ("dailyRate" > 0);
