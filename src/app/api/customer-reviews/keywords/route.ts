import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple keyword extraction function
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Common stop words to filter out (English + Russian)
  const stopWords = new Set([
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i',
    'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
    'our', 'their', 'very', 'too', 'also', 'just', 'so', 'than', 'such',
    // Russian
    'и', 'в', 'не', 'на', 'с', 'по', 'для', 'как', 'это', 'из', 'за', 'от',
    'что', 'то', 'но', 'же', 'или', 'к', 'у', 'о', 'при', 'до', 'под', 'во',
    'который', 'которые', 'была', 'были', 'было', 'быть', 'есть', 'был',
    'все', 'всё', 'этот', 'эта', 'эти', 'тот', 'та', 'те', 'один', 'одна',
    'очень', 'только', 'так', 'себя', 'свой', 'мой', 'твой', 'его', 'её',
    'наш', 'ваш', 'их', 'этого', 'того', 'этой', 'той', 'через'
  ]);
  
  // Extract words (3+ characters for Russian, 2+ for English)
  const words = text
    .toLowerCase()
    .replace(/[^\wа-яё\s]/gu, ' ') // Keep Latin and Cyrillic letters
    .split(/\s+/)
    .filter(word => {
      // Must be at least 2 characters
      if (word.length < 2) return false;
      // Filter out pure numbers
      if (/^\d+$/.test(word)) return false;
      // Must contain at least one letter
      if (!/[a-zа-яё]/i.test(word)) return false;
      // Not a stop word
      return !stopWords.has(word);
    });
  
  return words;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelParam = searchParams.get('channel')
    
    // Build where clause for channel filter
    const whereClause: any = {
      reviewText: {
        not: null,
      },
      NOT: {
        reviewText: '',
      },
    }
    
    if (channelParam && channelParam !== 'ALL') {
      whereClause.channel = channelParam
    }
    
    // Get reviews with text
    const reviews = await prisma.productReview.findMany({
      where: whereClause,
      select: {
        reviewText: true,
        rating: true,
      },
      take: 1000, // Limit to first 1000 for performance
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        totalReviewsAnalyzed: 0,
        keywords: [],
      });
    }

    // Extract keywords from all reviews
    const keywordFrequency: Record<string, number> = {};
    
    for (const review of reviews) {
      const keywords = extractKeywords(review.reviewText || '');
      
      for (const keyword of keywords) {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      }
    }

    // Convert to array and sort by frequency
    const keywordArray = Object.entries(keywordFrequency)
      .map(([keyword, count]) => ({
        keyword,
        count,
      }))
      .filter(k => k.count >= 3 && k.keyword.length >= 3) // Filter keywords that appear at least 3 times and have 3+ chars
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 keywords

    return NextResponse.json({
      totalReviewsAnalyzed: reviews.length,
      keywords: keywordArray,
    });
  } catch (error) {
    console.error('GET /api/customer-reviews/keywords failed:', error);
    return NextResponse.json({ error: 'Failed to fetch keywords', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
