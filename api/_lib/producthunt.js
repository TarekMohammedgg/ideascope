/* Product Hunt: public RSS feed — no auth required */
async function collectProductHunt(idea) {
  const keywords = idea.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res  = await fetch('https://www.producthunt.com/feed', { signal: controller.signal });
    const xml  = await res.text();

    // Parse titles and descriptions from RSS
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);

    const parsed = items.map(item => ({
      title:  (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '',
      desc:   (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])?.[1] || '',
      link:   (item.match(/<link>(.*?)<\/link>/))?.[1] || '',
    }));

    const related = parsed.filter(({ title, desc }) => {
      const text = `${title} ${desc}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });

    return {
      totalFeedItems: parsed.length,
      relatedLaunches: related.length,
      relatedProducts: related.slice(0, 3).map(p => p.title),
      saturation: related.length > 3 ? 'high' : related.length > 0 ? 'medium' : 'low',
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { collectProductHunt };
