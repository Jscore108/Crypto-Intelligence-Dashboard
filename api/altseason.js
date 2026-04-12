export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.blockchaincenter.net/api/altcoin-season-index', {
      headers: { 'User-Agent': 'CryptoSwizaIntel/1.0' },
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
