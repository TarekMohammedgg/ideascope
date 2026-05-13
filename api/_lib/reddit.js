/* Reddit: public JSON search, no API key required */
const SUBREDDITS_BY_MARKET = {
  us:   ['startups', 'entrepreneur', 'SaaS', 'apps', 'technology'],
  eg:   ['Egypt', 'egyptians', 'startups'],
  gulf: ['saudiarabia', 'dubai', 'Emirates', 'startups'],
};

async function collectReddit(idea, markets) {
  const keyword = encodeURIComponent(idea.slice(0, 60));
  const since   = Math.floor((Date.now() - 30 * 86400 * 1000) / 1000);

  const urls = markets.flatMap(m =>
    (SUBREDDITS_BY_MARKET[m] || []).slice(0, 2).map(
      sub => `https://www.reddit.com/r/${sub}/search.json?q=${keyword}&sort=top&t=month&limit=5&restrict_sr=1`
    )
  );
  // Also add a global search
  urls.push(
    `https://www.reddit.com/search.json?q=${keyword}&sort=top&t=month&limit=10`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const results = await Promise.allSettled(
      urls.slice(0, 4).map(url =>
        fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'IdeaScope/1.0 (market research tool)' },
        }).then(r => r.json())
      )
    );

    const posts = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.data?.children) {
        posts.push(...r.value.data.children.map(c => c.data));
      }
    }

    const unique = [...new Map(posts.map(p => [p.id, p])).values()];
    const top    = unique.sort((a, b) => b.score - a.score).slice(0, 10);

    const topKeywords = extractKeywords(top.map(p => `${p.title} ${p.selftext || ''}`).join(' '));

    return {
      postCount:      unique.length,
      topScore:       top[0]?.score ?? 0,
      avgScore:       unique.length ? Math.round(unique.reduce((s, p) => s + p.score, 0) / unique.length) : 0,
      avgComments:    unique.length ? Math.round(unique.reduce((s, p) => s + p.num_comments, 0) / unique.length) : 0,
      subreddits:     [...new Set(top.map(p => p.subreddit))].slice(0, 5),
      topKeywords,
      engagement:     unique.length > 20 ? 'high' : unique.length > 5 ? 'medium' : 'low',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractKeywords(text) {
  const stopWords = new Set(['the','a','an','is','it','in','on','at','to','for','of','and','or','with','this','that','are','was','be','i','my','we','you','your','our','their','not','but','so','if','as','by','from','about','what','how','have','has','do','does','can','will','would','should','could','more','also','very','just','get','got','need','want','use','used','its','been','were','they','them','he','she','his','her','any','all','some','no','up','out','into','than','then','when','where','who','which','why','other','new','like','make','made','one','two','app','idea','product','service','platform','startup','business','market','company','people','user','users','customer','customers']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const freq  = {};
  for (const w of words) {
    if (w.length > 3 && !stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

module.exports = { collectReddit };
