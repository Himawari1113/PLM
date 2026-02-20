const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple translation mapping for common status values
const translateStatus = (status) => {
  const statusMap = {
    'UNPROCESSED': 'UNPROCESSED',
    'PROCESSED': 'PROCESSED',
    'ОБРАБОТАН': 'PROCESSED',
    'НЕОБРАБОТАН': 'UNPROCESSED',
  };
  return statusMap[status] || status;
};

const translateOrderStatus = (status) => {
  const orderStatusMap = {
    'DELIVERED': 'DELIVERED',
    'ДОСТАВЛЕН': 'DELIVERED',
    'ОТМЕНЕН': 'CANCELLED',
    'В ПУТИ': 'IN_TRANSIT',
    'ОБРАБОТКА': 'PROCESSING',
  };
  return orderStatusMap[status] || status;
};

async function importReviews() {
  try {
    const filePath = path.join(__dirname, '..', 'ref', 'Ozon_Reviews_2026-02-13_2026-02-16.xlsx');
    
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Found ${data.length} reviews to import`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Check if review already exists
        const existing = await prisma.productReview.findUnique({
          where: { reviewId: row['ID Отзыва'] }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        await prisma.productReview.create({
          data: {
            reviewId: row['ID Отзыва'],
            sku: String(row['SKU']),
            articleNumber: row['Артикул'] || '',
            productName: row['Название товара'] || '',
            reviewText: row['Текст отзыва'] || null,
            publishedAt: new Date(row['Дата публикации отзыва']),
            rating: parseInt(row['Рейтинг']) || 0,
            status: translateStatus(row['Статус']),
            commentCount: parseInt(row['Количество комментариев у отзыва']) || 0,
            orderStatus: translateOrderStatus(row['Статус заказа']),
            ratingMember: row['Участник рейтинга'] === true || row['Участник рейтинга'] === 'true',
          }
        });
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`Imported ${imported} reviews...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error importing review ${row['ID Отзыва']}:`, error.message);
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importReviews();
