/**
 * ==============================================================================
 * USER INTEREST & PERSONALIZATION ENGINE (personalization.ts)
 * ==============================================================================
 * Tracks student interactions on Unimart (views, searches, cart additions, wishlist,
 * and orders) to tailor the shop feed to each user's shopping habits over time.
 *
 * Scoring weights:
 * - Product click / view: +1
 * - Search query matching a category: +2
 * - Adding to wishlist: +3
 * - Adding to cart: +4
 * - Placing an order: +5
 * ==============================================================================
 */

const INTEREST_STORAGE_KEY = 'unimart_user_interests';
const RECENT_VIEWS_KEY = 'unimart_recent_views';

export interface CategoryScoreMap {
  [categorySlug: string]: number;
}

/**
 * Retrieve current user interest scores from localStorage.
 */
export function getCategoryScores(): CategoryScoreMap {
  try {
    const raw = localStorage.getItem(INTEREST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/**
 * Add points to a category based on user action.
 */
export function addCategoryInterest(category: string, points: number = 1): void {
  if (!category) return;
  const slug = category.toLowerCase().trim();
  const scores = getCategoryScores();
  scores[slug] = (scores[slug] || 0) + points;
  try {
    localStorage.setItem(INTEREST_STORAGE_KEY, JSON.stringify(scores));
  } catch {}
}

/**
 * Record a product view, saving to recent views and incrementing category affinity.
 */
export function trackProductView(product: { id: string | number; category?: string }): void {
  if (product.category) {
    addCategoryInterest(product.category, 1);
  }

  try {
    const raw = localStorage.getItem(RECENT_VIEWS_KEY);
    const views: Array<string | number> = raw ? JSON.parse(raw) : [];
    const filtered = views.filter(id => String(id) !== String(product.id));
    filtered.unshift(product.id);
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {}
}

/**
 * Record search activity. If search relates to categories, bump their score.
 */
export function trackSearchInterest(query: string, matchedCategories: string[]): void {
  if (!query) return;
  matchedCategories.forEach(cat => addCategoryInterest(cat, 2));
}

/**
 * Record wishlist addition (+3 points).
 */
export function trackWishlistInterest(category?: string): void {
  if (category) addCategoryInterest(category, 3);
}

/**
 * Record cart addition (+4 points).
 */
export function trackCartInterest(category?: string): void {
  if (category) addCategoryInterest(category, 4);
}

/**
 * Record order purchase (+5 points).
 */
export function trackOrderInterest(categories: string[]): void {
  categories.forEach(cat => {
    if (cat) addCategoryInterest(cat, 5);
  });
}

/**
 * Check if the user has any interaction history.
 */
export function hasUserInteractions(): boolean {
  const scores = getCategoryScores();
  return Object.values(scores).some(val => val > 0);
}

/**
 * Return top preferred categories in descending score order.
 */
export function getTopUserCategories(limit: number = 3): string[] {
  const scores = getCategoryScores();
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, score]) => score > 0)
    .slice(0, limit)
    .map(([cat]) => cat);
}

/**
 * Personalize and sort a list of products based on user interest scores.
 * Products from preferred categories are prioritized, while still retaining a diverse
 * blend across other categories.
 */
export function getPersonalizedProducts<T extends { category?: string; id?: any }>(
  allProducts: T[],
  limit?: number
): T[] {
  if (!allProducts || allProducts.length === 0) return [];

  const scores = getCategoryScores();
  const hasHistory = Object.values(scores).some(score => score > 0);

  // If no history yet, ensure a balanced showcase across different categories
  if (!hasHistory) {
    const categoryBuckets: Record<string, T[]> = {};
    allProducts.forEach(item => {
      const cat = (item.category || 'others').toLowerCase();
      if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
      categoryBuckets[cat].push(item);
    });

    const diverseList: T[] = [];
    const keys = Object.keys(categoryBuckets);
    let maxLen = Math.max(...keys.map(k => categoryBuckets[k].length), 0);

    for (let i = 0; i < maxLen; i++) {
      for (const k of keys) {
        if (categoryBuckets[k][i]) {
          diverseList.push(categoryBuckets[k][i]);
        }
      }
    }

    return limit ? diverseList.slice(0, limit) : diverseList;
  }

  // User has interaction history: calculate weighted scores
  const scored = allProducts.map(product => {
    const cat = (product.category || '').toLowerCase();
    const affinityScore = scores[cat] || 0;
    // Add small random jitter (0-0.5) to keep the feed fresh on reloads
    const rankScore = affinityScore * 10 + (Math.random() * 0.5);
    return { product, rankScore };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  const result = scored.map(s => s.product);
  return limit ? result.slice(0, limit) : result;
}

