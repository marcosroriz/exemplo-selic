// Vercel Serverless Function to fetch stock data from Yahoo Finance
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let ticker = (req.query.ticker || req.query.symbol || 'PETR4').trim().toUpperCase();
  ticker = ticker.replace('.SA', '');
  const yahooSymbol = `${ticker}.SA`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=10y&interval=1mo`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: true,
        message: `Falha ao buscar ticker ${ticker} no Yahoo Finance (${response.status})`
      });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({
        error: true,
        message: `Ticker ${ticker} não encontrado ou sem dados históricos.`
      });
    }

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const adjclose = result.indicators?.adjclose?.[0]?.adjclose || quote.close || [];

    const history = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i];
      const adj = adjclose?.[i];
      if (close != null && adj != null && !isNaN(close) && !isNaN(adj)) {
        const d = new Date(timestamps[i] * 1000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        history.push({
          date: `${yyyy}-${mm}`,
          timestamp: timestamps[i],
          close: Number(close.toFixed(2)),
          adjClose: Number(adj.toFixed(2))
        });
      }
    }

    const firstTradeDate = meta.firstTradeDate 
      ? new Date(meta.firstTradeDate * 1000).toISOString() 
      : (history[0] ? `${history[0].date}-01T00:00:00.000Z` : null);

    return res.status(200).json({
      symbol: ticker,
      name: meta.shortName || meta.longName || ticker,
      currency: meta.currency || 'BRL',
      firstTradeDate: firstTradeDate,
      regularMarketPrice: meta.regularMarketPrice || history[history.length - 1]?.close,
      history: history
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message || 'Erro interno ao consultar dados da ação.'
    });
  }
}
