// Known editable config keys per source (from connector files / .env.example).
export const CONFIG_HINTS: Record<string, string> = {
  "GitHub Profile": 'githubLogin (string); token via GITHUB_TOKEN env',
  "Site Analytics": 'provider ("plausible"|"umami"), baseUrl, siteId, token, channelName; env fallback ANALYTICS_*',
  "Google Alerts": 'feeds (string[] of RSS URLs)',
  "Newsletter RSS": 'feedUrl (string), channelName',
  GDELT: 'queries (string[]), delayMs (default 5000)',
  "NSF Awards": 'pages (default 1), delayMs',
  arXiv: 'maxResults (default 10), delayMs',
  GitHub: 'repos (string[]), perRepo, delayMs',
  OpenAlex: 'perTag',
  Crossref: 'rows',
  DOAJ: 'pageSize',
  "Semantic Scholar": 'authorId',
  PatentsView: 'limit',
};

// Runner-managed keys; preserved from the stored config on edit.
export const RUNNER_KEYS = ["status", "lastError", "lastErrorAt", "lastCounts", "skipped"];
