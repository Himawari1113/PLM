-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "articleNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "reviewText" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "orderStatus" TEXT NOT NULL,
    "ratingMember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_reviewId_key" ON "ProductReview"("reviewId");

-- CreateIndex
CREATE INDEX "ProductReview_sku_idx" ON "ProductReview"("sku");

-- CreateIndex
CREATE INDEX "ProductReview_articleNumber_idx" ON "ProductReview"("articleNumber");

-- CreateIndex
CREATE INDEX "ProductReview_rating_idx" ON "ProductReview"("rating");

-- CreateIndex
CREATE INDEX "ProductReview_publishedAt_idx" ON "ProductReview"("publishedAt");
