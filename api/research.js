const crypto = require('crypto');
const { cacheGet, cacheSet } = require('./_lib/cache');
const { collectReddit }      = require('./_lib/reddit');
const { collectHN }          = require('./_lib/hackernews');
const { collectProductHunt } = require('./_lib/producthunt');
const { collectAppStore }    = require('./_lib/appstore');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idea, markets = ['us'] } = req.body || {};
  if (!idea || typeof idea !== 'string' || idea.trim().length < 5) {
    return res.status(400).json({ error: 'Idea must be at least 5 characters' });
  }

  const cleanIdea     = idea.trim().slice(0, 200);
  const cleanMarkets  = (Array.isArray(markets) ? markets : ['us'])
    .filter(m => ['us', 'eg', 'gulf'].includes(m))
    .sort();

  const cacheKey = `research:v1:${crypto
    .createHash('md5')
    .update(cleanIdea.toLowerCase() + cleanMarkets.join(','))
    .digest('hex')}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  // Run all collectors in parallel — failures don't block the response
  const [reddit, hn, ph, appstore] = await Promise.allSettled([
    collectReddit(cleanIdea, cleanMarkets),
    collectHN(cleanIdea),
    collectProductHunt(cleanIdea),
    collectAppStore(cleanIdea, cleanMarkets),
  ]);

  const result = {
    idea:      cleanIdea,
    markets:   cleanMarkets,
    timestamp: new Date().toISOString(),
    cached:    false,
    signals: {
      reddit:      reddit.status      === 'fulfilled' ? reddit.value      : { error: 'unavailable' },
      hackernews:  hn.status          === 'fulfilled' ? hn.value          : { error: 'unavailable' },
      productHunt: ph.status          === 'fulfilled' ? ph.value          : { error: 'unavailable' },
      appStore:    appstore.status    === 'fulfilled' ? appstore.value    : { error: 'unavailable' },
    },
  };

  // Cache 6 hours — signals don't change that fast
  await cacheSet(cacheKey, result, 21600);

  return res.json(result);
};
