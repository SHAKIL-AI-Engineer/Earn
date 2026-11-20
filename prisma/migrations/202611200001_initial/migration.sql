-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "earn_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "earn_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "earn_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_workspace" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Earn Workspace',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "openingCash" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_employees" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "dailyRate" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_production" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pieces',
    "unitRate" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidOn" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_expenses" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidOn" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_salaries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "daysWorked" DECIMAL(3,2) NOT NULL,
    "dailyRate" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidOn" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_cash_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earn_cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earn_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earn_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "earn_users_email_key" ON "earn_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "earn_sessions_token_key" ON "earn_sessions"("token");

-- CreateIndex
CREATE INDEX "earn_sessions_userId_idx" ON "earn_sessions"("userId");

-- CreateIndex
CREATE INDEX "earn_accounts_userId_idx" ON "earn_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "earn_accounts_providerId_accountId_key" ON "earn_accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "earn_verifications_identifier_idx" ON "earn_verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "earn_rate_limits_key_key" ON "earn_rate_limits"("key");

-- CreateIndex
CREATE UNIQUE INDEX "earn_employees_code_key" ON "earn_employees"("code");

-- CreateIndex
CREATE INDEX "earn_production_date_voidedAt_idx" ON "earn_production"("date", "voidedAt");

-- CreateIndex
CREATE INDEX "earn_production_paidOn_idx" ON "earn_production"("paidOn");

-- CreateIndex
CREATE INDEX "earn_expenses_date_voidedAt_idx" ON "earn_expenses"("date", "voidedAt");

-- CreateIndex
CREATE INDEX "earn_expenses_paidOn_idx" ON "earn_expenses"("paidOn");

-- CreateIndex
CREATE INDEX "earn_salaries_date_voidedAt_idx" ON "earn_salaries"("date", "voidedAt");

-- CreateIndex
CREATE INDEX "earn_salaries_employeeId_date_idx" ON "earn_salaries"("employeeId", "date");

-- CreateIndex
CREATE INDEX "earn_salaries_paidOn_idx" ON "earn_salaries"("paidOn");

-- CreateIndex
CREATE INDEX "earn_cash_entries_date_voidedAt_idx" ON "earn_cash_entries"("date", "voidedAt");

-- CreateIndex
CREATE INDEX "earn_audit_logs_createdAt_idx" ON "earn_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "earn_sessions" ADD CONSTRAINT "earn_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "earn_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earn_accounts" ADD CONSTRAINT "earn_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "earn_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earn_salaries" ADD CONSTRAINT "earn_salaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "earn_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

