/* Apple iTunes Search API — searches by keyword, not just top-100 rankings */
const COUNTRY_BY_MARKET = { us: 'us', eg: 'eg', gulf: 'sa' };

async function collectAppStore(query, markets) {
  // Use 2-3 core words for the search — iTunes search chokes on long phrases
  const searchTerm = query.split(/\s+/).slice(0, 3).join('+');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const countries = [...new Set(markets.map(m => COUNTRY_BY_MARKET[m] || 'us'))];

    const feeds = await Promise.allSettled(
      countries.map(country =>
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=${country}&entity=software&limit=20&lang=en_us`,
          { signal: controller.signal }
        )
          .then(r => r.json())
          .then(d => ({ country, apps: d.results || [] }))
      )
    );

    const results = {};
    for (const r of feeds) {
      if (r.status !== 'fulfilled') continue;
      const { country, apps } = r.value;

      results[country] = {
        totalFound:          apps.length,
        topApps:             apps.slice(0, 5).map(a => ({
          name:    a.trackName,
          rating:  a.averageUserRating?.toFixed(1) ?? 'N/A',
          reviews: a.userRatingCount ?? 0,
          price:   a.formattedPrice ?? 'Free',
        })),
        avgRating:           apps.length
          ? (apps.reduce((s, a) => s + (a.averageUserRating || 0), 0) / apps.length).toFixed(1)
          : 'N/A',
        competitorStrength:  apps.length > 10 ? 'very-high'
          : apps.length > 5  ? 'high'
          : apps.length > 1  ? 'medium' : 'low',
      };
    }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { collectAppStore };
