module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800');

  try {
    const r = await fetch('https://api.blockchaincenter.net/api/altcoin-season-index');
    if (r.ok) {
      const d = await r.json();
      return res.json(d);
    }
  } catch (_) {}

  try {
    const r = await fetch('https://www.blockchaincenter.net/en/altcoin-season-index/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (r.ok) {
      const html = await r.text();
      const m = html.match(/"altcoinIndex"\s*:\s*(\d+)/i)
        || html.match(/"index"\s*:\s*(\d+)/i)
        || html.match(/altcoin.season.index[^0-9]*?(\d{1,3})/i);
      if (m) return res.json({ index: parseInt(m[1]) });
    }
  } catch (_) {}

  res.status(500).json({ error: 'failed' });
};
