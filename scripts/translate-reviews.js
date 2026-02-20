const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Russian to English translation mapping
const translations = {
  // Product types
  'Платье': 'Dress',
  'платье': 'dress',
  'Фуфайка': 'Shirt',
  'фуфайка': 'shirt',
  'Брюки': 'Pants',
  'брюки': 'pants',
  'Юбка': 'Skirt',
  'юбка': 'skirt',
  'Блузка': 'Blouse',
  'блузка': 'blouse',
  'Куртка': 'Jacket',
  'куртка': 'jacket',
  'Пальто': 'Coat',
  'пальто': 'coat',
  'Свитер': 'Sweater',
  'свитер': 'sweater',
  'Кофта': 'Cardigan',
  'кофта': 'cardigan',
  'Костюм': 'Suit',
  'костюм': 'suit',
  'Шорты': 'Shorts',
  'шорты': 'shorts',
  'Футболка': 'T-shirt',
  'футболка': 't-shirt',
  'Толстовка': 'Sweatshirt',
  'толстовка': 'sweatshirt',
  'Джинсы': 'Jeans',
  'джинсы': 'jeans',
  'Леггинсы': 'Leggings',
  'леггинсы': 'leggings',
  'Комбинезон': 'Jumpsuit',
  'комбинезон': 'jumpsuit',
  'Жилет': 'Vest',
  'жилет': 'vest',
  'Рубашка': 'Shirt',
  'рубашка': 'shirt',
  'Поло': 'Polo',
  'поло': 'polo',
  'Майка': 'Tank top',
  'майка': 'tank top',
  'Водолазка': 'Turtleneck',
  'водолазка': 'turtleneck',
  
  // Colors
  'черный': 'black',
  'черная': 'black',
  'черное': 'black',
  'белый': 'white',
  'белая': 'white',
  'белое': 'white',
  'красный': 'red',
  'красная': 'red',
  'красное': 'red',
  'синий': 'blue',
  'синяя': 'blue',
  'синее': 'blue',
  'зеленый': 'green',
  'зеленая': 'green',
  'зеленое': 'green',
  'желтый': 'yellow',
  'желтая': 'yellow',
  'желтое': 'yellow',
  'серый': 'gray',
  'серая': 'gray',
  'серое': 'gray',
  'розовый': 'pink',
  'розовая': 'pink',
  'розовое': 'pink',
  'коричневый': 'brown',
  'коричневая': 'brown',
  'коричневое': 'brown',
  'бежевый': 'beige',
  'бежевая': 'beige',
  'бежевое': 'beige',
  'светло-бежевый': 'light beige',
  'светло-бежевая': 'light beige',
  'темно-синий': 'dark blue',
  'темно-синяя': 'dark blue',
  'темно-серый': 'dark gray',
  'темно-gray': 'dark gray',
  'оранжевый': 'orange',
  'оранжевая': 'orange',
  'фиолетовый': 'purple',
  'фиолетовая': 'purple',
  'св.розовый': 'light pink',
  'св.pink': 'light pink',
  'разноцв': 'multicolor',
  'разноцветный': 'multicolor',
  'multicolorетный': 'multicolor',
  'ментоловый': 'mint',
  'ментоловая': 'mint',
  'темно-blue': 'dark blue',
  'голубой': 'light blue',
  'голубая': 'light blue',
  'бордовый': 'burgundy',
  'бордовая': 'burgundy',
  'хаки': 'khaki',
  'салатовый': 'lime',
  'салатовая': 'lime',
  'терракотовый': 'terracotta',
  'терракотовая': 'terracotta',
  
  // Gender/Type
  'женское': "women's",
  'женская': "women's",
  'женский': "women's",
  'мужское': "men's",
  'мужская': "men's",
  'мужской': "men's",
  'детское': "children's",
  'детская': "children's",
  'детский': "children's",
  'унисекс': 'unisex',
  'для девочки': "for girls",
  'для мальчика': "for boys",
  'для плавания': 'for swimming',
  'мужские': "men's",
  'женские': "women's",
  'детские': "children's",
};

function translateText(text) {
  if (!text) return text;
  
  let result = text;
  
  // Replace each Russian word with English
  for (const [russian, english] of Object.entries(translations)) {
    const regex = new RegExp(russian, 'gi');
    result = result.replace(regex, english);
  }
  
  return result;
}

async function translateReviews() {
  try {
    console.log('Fetching all reviews...');
    const reviews = await prisma.productReview.findMany({
      select: {
        id: true,
        productName: true,
      }
    });
    
    console.log(`Found ${reviews.length} reviews to translate`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const review of reviews) {
      const translatedName = translateText(review.productName);
      
      // Only update if translation actually changed something
      if (translatedName !== review.productName) {
        await prisma.productReview.update({
          where: { id: review.id },
          data: { productName: translatedName },
        });
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`Translated ${updated} reviews...`);
        }
      } else {
        skipped++;
      }
    }
    
    console.log('\n=== Translation Summary ===');
    console.log(`Total reviews: ${reviews.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    
    // Show some examples
    console.log('\nSample translations:');
    const samples = await prisma.productReview.findMany({
      take: 5,
      select: {
        articleNumber: true,
        productName: true,
      }
    });
    
    samples.forEach(s => {
      console.log(`${s.articleNumber}: ${s.productName}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

translateReviews();
