const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Translation maps
const statusTranslations = {
  'UNPROCESSED': 'UNPROCESSED',
  'НЕОБРАБОТАНО': 'UNPROCESSED',
  'PROCESSED': 'PROCESSED',
  'ОБРАБОТАНО': 'PROCESSED',
};

const orderStatusTranslations = {
  'DELIVERED': 'DELIVERED',
  'ДОСТАВЛЕНО': 'DELIVERED',
  'CANCELLED': 'CANCELLED',
  'ОТМЕНЕНО': 'CANCELLED',
  'PENDING': 'PENDING',
  'В ОЖИДАНИИ': 'PENDING',
};

async function main() {
  const filePath = path.join(__dirname, '../ref/OZON Review.xlsx');

  console.log('Reading Excel file:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} rows in Excel file`);

  // Delete all existing reviews
  console.log('\nDeleting all existing reviews...');
  const deleteResult = await prisma.productReview.deleteMany({});
  console.log(`Deleted ${deleteResult.count} existing reviews`);

  // Import new reviews
  console.log('\nImporting new reviews...');
  let imported = 0;
  let skipped = 0;

  for (const row of data) {
    try {
      const reviewId = row['ID Отзыва'];
      const sku = String(row['SKU'] || '');
      const articleNumber = String(row['Артикул'] || '');
      const productName = String(row['Название товара'] || '');
      const reviewText = row['Текст отзыва'] || null;
      const publishedAt = new Date(row['Дата публикации отзыва']);
      const rating = parseInt(row['Рейтинг'], 10);
      const status = statusTranslations[row['Статус']] || row['Статус'] || 'UNPROCESSED';
      const commentCount = parseInt(row['Количество комментариев у отзыва'], 10) || 0;
      const orderStatus = orderStatusTranslations[row['Статус заказа']] || row['Статус заказа'] || 'DELIVERED';
      const ratingMember = Boolean(row['Участник рейтинга']);

      // Skip if missing required fields
      if (!reviewId || !sku || !articleNumber) {
        skipped++;
        continue;
      }

      await prisma.productReview.create({
        data: {
          reviewId,
          sku,
          articleNumber,
          productName,
          reviewText: reviewText || null,
          publishedAt,
          rating,
          status,
          commentCount,
          orderStatus,
          ratingMember,
        },
      });

      imported++;

      if (imported % 500 === 0) {
        console.log(`  Imported ${imported} reviews...`);
      }
    } catch (error) {
      console.error(`Error importing review ${row['ID Отзыва']}:`, error.message);
      skipped++;
    }
  }

  console.log(`\nImport completed!`);
  console.log(`  Total rows: ${data.length}`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
