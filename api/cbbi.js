export default async function handler(req, res) {
  try {
    const response = await fetch('https://colintalkscrypto.com/cbbi/data/latest.json', {
      headers: { 'User-Agent': 'CryptoIntelDashboard/1.0' },
    });
    if (!response.ok) throw new Error(`CBBI API ${response.status}`);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
