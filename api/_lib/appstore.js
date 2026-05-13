/* Apple App Store RSS — official free feed, no auth */
const COUNTRY_BY_MARKET = { us: 'us', eg: 'eg', gulf: 'sa' };

async function collectAppStore(idea, markets) {
  const keywords = idea.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 4);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const countries = [...new Set(markets.map(m => COUNTRY_BY_MARKET[m] || 'us'))];

    const feeds = await Promise.allSettled(
      countries.map(country =>
        fetch(
          `https://rss.applemarketingtools.com/api/v2/${country}/apps/top-free/100/apps.json`,
          { signal: controller.signal }
        ).then(r => r.json()).then(d => ({ country, apps: d.feed?.results || [] }))
      )
    );

    const results = {};
    for (const r of feeds) {
      if (r.status !== 'fulfilled') continue;
      const { country, apps } = r.value;

      const related = apps
        .map((app, i) => ({ name: app.name, rank: i + 1, genre: app.genres?.[0]?.name || '' }))
        .filter(({ name, genre }) =>
          keywords.some(kw => name.toLowerCase().includes(kw) || genre.toLowerCase().includes(kw))
        );

      results[country] = {
        totalApps: apps.length,
        relatedApps: related.slice(0, 5),
        relatedCount: related.length,
        competitorStrength: related.length > 5 ? 'very-high' : related.length > 2 ? 'high' : related.length > 0 ? 'medium' : 'low',
      };
    }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { collectAppStore };
