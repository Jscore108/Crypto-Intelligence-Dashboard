export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const urls = [
    'https://api.blockchaincenter.net/api/altcoin-season-index',
    'https://www.blockchaincenter.net/api/altcoin-season-index',
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CryptoSwizaIntel/1.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch (_) {
        // Maybe it returned just a number
        const num = parseInt(text.trim());
        if (!isNaN(num)) return res.status(200).json({ index: num });
      }
    } catch (_) { continue; }
  }

  // Try scraping the HTML page as last resort
  try {
    const response = await fetch('https://www.blockchaincenter.net/en/altcoin-season-index/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const html = await response.text();
      // Look for the index value in the page
      const match = html.match(/(?:altcoin.season.index|season.index)[^0-9]*?(\d{1,3})/i)
        || html.match(/class="[^"]*index[^"]*"[^>]*>(\d{1,3})/i)
        || html.match(/"index"\s*:\s*(\d{1,3})/i)
        || html.match(/"value"\s*:\s*(\d{1,3})/i);
      if (match) {
        return res.status(200).json({ index: parseInt(match[1]) });
      }
    }
  } catch (_) {}

  res.status(500).json({ error: 'Could not fetch alt season index' });
}
