-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "attribution" TEXT NOT NULL DEFAULT 'lastsign',
ADD COLUMN     "crossDevice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withRobots" BOOLEAN NOT NULL DEFAULT false;
