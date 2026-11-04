-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qualityTier" TEXT NOT NULL DEFAULT 'unrated',
    "avoidFlag" BOOLEAN NOT NULL DEFAULT false,
    "selectivity" TEXT,
    "indexing" TEXT,
    "cost" TEXT,
    "homepage" TEXT,
    "fieldTags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "independenceHint" TEXT,
    "prestige" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "venueId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "criterionIds" TEXT NOT NULL DEFAULT '[]',
    "deadline" TIMESTAMP(3),
    "url" TEXT,
    "effort" TEXT NOT NULL DEFAULT 'medium',
    "statusCatalog" TEXT NOT NULL DEFAULT 'unknown',
    "sourceId" TEXT,
    "raw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "proofChecklist" TEXT NOT NULL DEFAULT '[]',
    "buildable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pursuit" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'shortlisted',
    "criterionIds" TEXT NOT NULL DEFAULT '[]',
    "strength" TEXT,
    "appliedOn" TIMESTAMP(3),
    "decidedOn" TIMESTAMP(3),
    "completedOn" TIMESTAMP(3),
    "notes" TEXT,
    "brandScore" INTEGER,
    "invitationProof" BOOLEAN NOT NULL DEFAULT false,
    "completionProof" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyProof" BOOLEAN NOT NULL DEFAULT false,
    "independence" TEXT NOT NULL DEFAULT 'mixed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pursuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "pursuitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "checklistItem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3),
    "config" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL DEFAULT 'me',
    "name" TEXT NOT NULL DEFAULT '',
    "orcid" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "fieldTags" TEXT NOT NULL DEFAULT '["data engineering","data product management","analytics","data management"]',
    "positioning" TEXT,
    "pillars" TEXT NOT NULL DEFAULT '[]',
    "cadenceNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownership" TEXT NOT NULL DEFAULT 'owned',
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReachMetric" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inboundCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ReachMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommender" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "org" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT '',
    "independent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "lastContacted" TIMESTAMP(3),
    "nextNudge" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_sourceId_url_key" ON "Opportunity"("sourceId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_key" ON "Source"("name");

-- CreateIndex
CREATE INDEX "ReachMetric_channelId_date_idx" ON "ReachMetric"("channelId", "date");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pursuit" ADD CONSTRAINT "Pursuit_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_pursuitId_fkey" FOREIGN KEY ("pursuitId") REFERENCES "Pursuit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReachMetric" ADD CONSTRAINT "ReachMetric_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

