-- Fix drift: webmasterAccountId and webmasterHostId were added directly to DB
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "webmasterAccountId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "webmasterHostId" TEXT;

-- New: default integration settings per project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "defaultTopvisorProjectId" INTEGER;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "defaultWebmasterAccountId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "defaultWebmasterHostId" TEXT;
