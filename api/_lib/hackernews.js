/* HN Algolia API — free, no rate limits, no auth */
async function collectHN(idea) {
  const keyword = idea.slice(0, 80);
  const since   = Math.floor((Date.now() - 6 * 30 * 86400 * 1000) / 1000); // 6 months

  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=20`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res  = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    const hits = data.hits || [];

    const totalPoints   = hits.reduce((s, h) => s + (h.points || 0), 0);
    const totalComments = hits.reduce((s, h) => s + (h.num_comments || 0), 0);
    const avgPoints     = hits.length ? Math.round(totalPoints / hits.length) : 0;

    return {
      storyCount:    hits.length,
      totalComments,
      avgPoints,
      topStory:      hits[0] ? { title: hits[0].title, points: hits[0].points, comments: hits[0].num_comments } : null,
      interest:      hits.length > 10 ? 'high' : hits.length > 3 ? 'medium' : 'low',
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { collectHN };
