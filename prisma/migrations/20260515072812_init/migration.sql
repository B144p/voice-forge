-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'revoked');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('pending', 'processing', 'completed', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "UsageAction" AS ENUM ('generate', 'regenerate');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "monthlyCharLimit" INTEGER,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeechSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceName" TEXT NOT NULL,
    "modelId" TEXT NOT NULL DEFAULT 'eleven_multilingual_v2',
    "status" "SetStatus" NOT NULL DEFAULT 'pending',
    "totalCharacters" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeechSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeechItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "r2Key" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'pending',
    "characterCount" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeechItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "itemsTotal" INTEGER NOT NULL,
    "itemsCompleted" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "heartbeatAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT,
    "itemId" TEXT,
    "action" "UsageAction" NOT NULL,
    "characters" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SpeechSet_userId_createdAt_idx" ON "SpeechSet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeechSet_userId_title_idx" ON "SpeechSet"("userId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "SpeechItem_setId_index_key" ON "SpeechItem"("setId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Job_setId_key" ON "Job"("setId");

-- CreateIndex
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SpeechSet" ADD CONSTRAINT "SpeechSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeechItem" ADD CONSTRAINT "SpeechItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SpeechSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SpeechSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
