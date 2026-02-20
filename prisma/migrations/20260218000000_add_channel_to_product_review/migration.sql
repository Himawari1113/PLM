-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'OZON';

-- CreateIndex
CREATE INDEX "ProductReview_channel_idx" ON "ProductReview"("channel");
