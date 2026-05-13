const crypto = require('crypto');
const { cacheGet, cacheSet } = require('./_lib/cache');
const { collectReddit }      = require('./_lib/reddit');
const { collectHN }          = require('./_lib/hackernews');
const { collectProductHunt } = require('./_lib/producthunt');
const { collectAppStore }    = require('./_lib/appstore');

/* ── Arabic → English category map ─────────────────────────────────── */
const ARABIC_CATEGORIES = [
  { words: ['دواء','دوا','جرع','صيدل','علاج','مريض','دكتور','طبي'],  en: 'medication medicine pill dose tracker' },
  { words: ['طعام','أكل','اكل','مطعم','توصيل','وجبة','مطاعم'],       en: 'food delivery restaurant meal' },
  { words: ['تعليم','تدريس','درس','طالب','مدرس','كورس','منهج'],       en: 'education learning course app' },
  { words: ['عقار','شقة','إيجار','ايجار','سكن','عمارة'],              en: 'real estate property rental apartment' },
  { words: ['بنك','مال','دفع','محفظ','معامل','فلوس','تحويل'],         en: 'finance payment banking wallet' },
  { words: ['سفر','حجز','فندق','رحلة','طيران','سياحة'],               en: 'travel booking hotel flight' },
  { words: ['تسوق','شراء','منتج','متجر'],                             en: 'shopping ecommerce store' },
  { words: ['صح','لياقة','رياضة','تمرين'],                            en: 'health fitness workout diet' },
  { words: ['موسيقى','غناء','فيديو','ترفيه','مسلسل'],                 en: 'music video entertainment streaming' },
  { words: ['توظيف','وظيفة','موظف','تعيين'],                          en: 'jobs employment hiring resume' },
  { words: ['توصيل','شحن','لوجستي'],                                  en: 'delivery logistics shipping' },
  { words: ['تواصل','دردش','رسالة','محادثة'],                         en: 'social chat messaging communication' },
  { words: ['صورة','تصوير','فلتر','تعديل'],                           en: 'photo editing camera filter' },
  { words: ['خريطة','موقع','ملاحة','طريق'],                           en: 'map navigation location GPS' },
];

const NOISE = new Set(['the','and','for','with','your','arabic','english','google','drive',
  'backup','localization','auto','use','using','app','المستخدم','بشكل','وفعال','امكانية','عمل','بشكل']);

function deriveSearchQuery(idea, frontendQuery) {
  // If the frontend already extracted a clean query, use it
  if (frontendQuery && frontendQuery !== idea && !/[؀-ۿ]/.test(frontendQuery)) {
    return frontendQuery.trim().slice(0, 120);
  }

  // Extract English words (≥3 chars, not noise)
  const englishWords = (idea.match(/[a-zA-Z]{3,}/g) || [])
    .filter(w => !NOISE.has(w.toLowerCase()));

  // App name = first Title-Cased English word
  const appName = englishWords.find(w => /^[A-Z]/.test(w)) || '';

  // Detect Arabic category
  let category = '';
  for (const cat of ARABIC_CATEGORIES) {
    if (cat.words.some(w => idea.includes(w))) { category = cat.en; break; }
  }

  // Extra English words beyond the app name
  const extra = englishWords.filter(w => w !== appName).slice(0, 3).join(' ');

  const query = [appName, category, extra].filter(Boolean).join(' ').trim();
  return query.length >= 5 ? query.slice(0, 120) : idea.replace(/[؀-ۿ]/g, '').trim().slice(0, 80);
}

/* ── Handler ─────────────────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { return res.status(405).json({ error: 'Method not allowed' }); }

  const { idea, markets = ['us'], searchQuery } = req.body || {};
  if (!idea || typeof idea !== 'string' || idea.trim().length < 5) {
    return res.status(400).json({ error: 'Idea must be at least 5 characters' });
  }

  const cleanIdea    = idea.trim().slice(0, 200);
  const cleanQuery   = deriveSearchQuery(cleanIdea, searchQuery);
  const cleanMarkets = (Array.isArray(markets) ? markets : ['us'])
    .filter(m => ['us', 'eg', 'gulf'].includes(m))
    .sort();

  const cacheKey = `research:v3:${crypto
    .createHash('md5')
    .update(cleanQuery.toLowerCase() + cleanMarkets.join(','))
    .digest('hex')}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const [reddit, hn, ph, appstore] = await Promise.allSettled([
    collectReddit(cleanQuery, cleanMarkets),
    collectHN(cleanQuery),
    collectProductHunt(cleanQuery),
    collectAppStore(cleanQuery, cleanMarkets),
  ]);

  const result = {
    idea:        cleanIdea,
    searchQuery: cleanQuery,   // visible in response so you can verify what was searched
    markets:     cleanMarkets,
    timestamp:   new Date().toISOString(),
    cached:      false,
    signals: {
      reddit:      reddit.status      === 'fulfilled' ? reddit.value      : { error: 'unavailable' },
      hackernews:  hn.status          === 'fulfilled' ? hn.value          : { error: 'unavailable' },
      productHunt: ph.status          === 'fulfilled' ? ph.value          : { error: 'unavailable' },
      appStore:    appstore.status    === 'fulfilled' ? appstore.value    : { error: 'unavailable' },
    },
  };

  await cacheSet(cacheKey, result, 21600);
  return res.json(result);
};
