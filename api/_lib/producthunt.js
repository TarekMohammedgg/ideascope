/* GitHub repo search — reliable proxy for developer/market interest in a category */
async function collectProductHunt(query) {
  // Use 2-3 core category words for searching
  const searchTerm = query.split(/\s+/).slice(0, 3).join('+');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}+app&sort=stars&per_page=10`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'IdeaScope/1.0' },
      }
    );

    const data = await res.json();
    const repos = data.items || [];

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    const recentRepos = repos.filter(r => {
      const age = (Date.now() - new Date(r.created_at)) / (1000 * 86400 * 365);
      return age < 2;
    });

    return {
      source:         'github',
      repoCount:      data.total_count || 0,
      topRepos:       repos.slice(0, 3).map(r => ({ name: r.full_name, stars: r.stargazers_count })),
      totalStars,
      recentProjects: recentRepos.length,
      developerInterest: repos.length > 5 ? 'high' : repos.length > 1 ? 'medium' : 'low',
      saturation:        data.total_count > 500 ? 'high' : data.total_count > 100 ? 'medium' : 'low',
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { collectProductHunt };
