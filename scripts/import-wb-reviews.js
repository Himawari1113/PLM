const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Simple Russian to English translation for seller article patterns
const translationMap = {
  // Colors
  'светло-бежевый': 'light beige',
  'темно-синий': 'dark blue',
  'темно-серый': 'dark gray',
  'светло-розовый': 'light pink',
  'светло-голубой': 'light blue',
  'черный': 'black',
  'белый': 'white',
  'красный': 'red',
  'синий': 'blue',
  'зеленый': 'green',
  'желтый': 'yellow',
  'серый': 'gray',
  'розовый': 'pink',
  'коричневый': 'brown',
  'бежевый': 'beige',
  'оранжевый': 'orange',
  'фиолетовый': 'purple',
  'голубой': 'light blue',
  'бордовый': 'burgundy',
  'хаки': 'khaki',
  'салатовый': 'lime',
  'мятный': 'mint',
  'лиловый': 'lilac',
  'бирюзовый': 'turquoise',
  'коралловый': 'coral',
  'персиковый': 'peach',
  'молочный': 'milk',
  'слоновая кость': 'ivory',
  'разноцветный': 'multicolor',
};

function translateSellerArticle(text) {
  if (!text) return text;
  let result = text;
  for (const [ru, en] of Object.entries(translationMap)) {
    const regex = new RegExp(ru, 'gi');
    result = result.replace(regex, en);
  }
  return result;
}

async function main() {
  const filePath = path.join(__dirname, '../ref/WB_Review.xlsx');

  console.log('Reading WB Review Excel file:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} rows in Excel file`);

  let imported = 0;
  let skipped = 0;

  for (const row of data) {
    try {
      // Extract fields
      const reviewText = row['Review text'] || '';
      const advantages = row['Advantages'] || '';
      const flaws = row['Flaws'] || '';
      const rating = parseInt(row['Оценка'], 10) || 0;
      const publishedAt = new Date(row['Дата']);
      const productName = row['Название товара'] || '';
      const articleNumber = row['article Number'] || '';
      const sellerArticle = row['Артикул продавца'] || '';
      const productId = row['product ID'];

      // Skip if missing required fields
      if (!articleNumber || !productId) {
        skipped++;
        continue;
      }

      // Combine review texts
      const combinedReviewText = [reviewText, advantages, flaws]
        .filter(text => text && text.trim())
        .join(' | ');

      // Translate seller article
      const translatedSellerArticle = translateSellerArticle(sellerArticle);

      // Generate unique review ID (using product ID + date as basis)
      const reviewId = `WB-${productId}-${publishedAt.getTime()}`;

      // Check if review already exists
      const existing = await prisma.productReview.findUnique({
        where: { reviewId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create review
      await prisma.productReview.create({
        data: {
          reviewId,
          sku: String(productId),
          articleNumber,
          productName: `${productName} (${translatedSellerArticle})`,
          reviewText: combinedReviewText || null,
          publishedAt,
          rating,
          status: 'UNPROCESSED',
          commentCount: 0,
          orderStatus: 'DELIVERED',
          ratingMember: false,
          channel: 'WILDBERRIES',
        },
      });

      imported++;

      if (imported % 500 === 0) {
        console.log(`  Imported ${imported} reviews...`);
      }
    } catch (error) {
      console.error(`Error importing review:`, error.message);
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
