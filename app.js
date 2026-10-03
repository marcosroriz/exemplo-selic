/**
 * SELIC vs AÇÕES B3 - COMPARADOR HISTÓRICO
 * Senior Frontend Architecture & Financial Calculation Engine
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    ticker: 'PETR4',
    stockData: null,
    initialInvestment: 1000,
    window: '1y', // '1y', '2y', '5y', '10y'
    viewMode: 'currency', // 'currency' (R$) or 'percent' (%)
    priceType: 'adj', // 'adj' (with dividends) or 'nominal' (simple close)
    availableWindows: ['1y', '2y', '5y', '10y'],
    chartInstance: null,
    isTableCollapsed: false
  };

  // Window definitions
  const WINDOW_CONFIG = {
    '1y': { label: '1 Ano', months: 12, minListingYears: 1 },
    '2y': { label: '2 Anos', months: 24, minListingYears: 2 },
    '5y': { label: '5 Anos', months: 60, minListingYears: 5 },
    '10y': { label: '10 Anos', months: 120, minListingYears: 10 }
  };

  // Popular B3 tickers metadata for search & autocomplete
  const POPULAR_TICKERS = [
    { symbol: 'PETR4', name: 'Petrobras PN', sector: 'Petróleo & Gás', years: 24 },
    { symbol: 'VALE3', name: 'Vale ON', sector: 'Mineração', years: 24 },
    { symbol: 'WEGE3', name: 'WEG ON', sector: 'Bens Industriais', years: 24 },
    { symbol: 'ITUB4', name: 'Itaú Unibanco PN', sector: 'Financeiro', years: 24 },
    { symbol: 'BBAS3', name: 'Banco do Brasil ON', sector: 'Financeiro', years: 24 },
    { symbol: 'BBDC4', name: 'Bradesco PN', sector: 'Financeiro', years: 24 },
    { symbol: 'MGLU3', name: 'Magazine Luiza ON', sector: 'Varejo', years: 13 },
    { symbol: 'RENT3', name: 'Localiza ON', sector: 'Aluguel de Carros', years: 19 },
    { symbol: 'B3SA3', name: 'B3 ON', sector: 'Serviços Financeiros', years: 16 },
    { symbol: 'PRIO3', name: 'PRIO ON', sector: 'Petróleo & Gás', years: 14 },
    { symbol: 'ABEV3', name: 'Ambev ON', sector: 'Bebidas', years: 11 },
    { symbol: 'CXSE3', name: 'Caixa Seguridade ON', sector: 'Seguros', years: 5.4 },
    { symbol: 'AURE3', name: 'Auren Energia ON', sector: 'Energia Elétrica', years: 4.5 },
    { symbol: 'VAMO3', name: 'Grupo Vamos ON', sector: 'Logística', years: 5.6 },
    { symbol: 'ASAI3', name: 'Assaí ON', sector: 'Varejo Alimentício', years: 5.6 },
    { symbol: 'CURY3', name: 'Cury Construtora ON', sector: 'Construção Civil', years: 6.0 }
  ];

  // DOM Elements
  const DOM = {
    stockInput: document.getElementById('stock-input'),
    autocompleteList: document.getElementById('autocomplete-list'),
    quickChips: document.getElementById('quick-chips'),
    investmentInput: document.getElementById('investment-input'),
    amountChips: document.getElementById('amount-chips'),
    windowButtons: document.getElementById('window-buttons'),
    windowNotice: document.getElementById('window-notice'),
    windowNoticeText: document.getElementById('window-notice-text'),
    windowStatusHint: document.getElementById('window-status-hint'),
    
    // Company Banner
    bannerSymbol: document.getElementById('banner-symbol'),
    bannerName: document.getElementById('banner-name'),
    bannerSector: document.getElementById('banner-sector'),
    bannerListing: document.getElementById('banner-listing'),
    bannerPrice: document.getElementById('banner-price'),

    // Metric Cards
    winnerCard: document.getElementById('winner-card'),
    winnerIcon: document.getElementById('winner-icon'),
    winnerHeadline: document.getElementById('winner-headline'),
    winnerSub: document.getElementById('winner-sub'),
    winnerPill: document.getElementById('winner-pill'),

    stockCardTitle: document.getElementById('stock-card-title'),
    stockCardTicker: document.getElementById('stock-card-ticker'),
    stockFinalValue: document.getElementById('stock-final-value'),
    stockReturnPill: document.getElementById('stock-return-pill'),
    stockShareCaption: document.getElementById('stock-share-caption'),

    selicFinalValue: document.getElementById('selic-final-value'),
    selicReturnPill: document.getElementById('selic-return-pill'),
    selicRateCaption: document.getElementById('selic-rate-caption'),

    alphaValue: document.getElementById('alpha-value'),
    alphaPercentPill: document.getElementById('alpha-percent-pill'),
    alphaCaption: document.getElementById('alpha-caption'),
    alphaPill: document.getElementById('alpha-pill'),

    // Toggles
    viewModeCurrency: document.getElementById('view-mode-currency'),
    viewModePercent: document.getElementById('view-mode-percent'),
    priceTypeAdj: document.getElementById('price-type-adj'),
    priceTypeNominal: document.getElementById('price-type-nominal'),
    legendStockLabel: document.getElementById('legend-stock-label'),

    // Chart & Stats
    chartCanvas: document.getElementById('comparisonChart'),
    chartLoading: document.getElementById('chart-loading'),
    statCagrStock: document.getElementById('stat-cagr-stock'),
    statSelicAvg: document.getElementById('stat-selic-avg'),
    statBestMonth: document.getElementById('stat-best-month'),
    statWorstMonth: document.getElementById('stat-worst-month'),

    // Table
    evolutionTableBody: document.getElementById('evolution-table-body'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnToggleTable: document.getElementById('btn-toggle-table'),
    tableToggleLabel: document.getElementById('table-toggle-label'),
    tableContainer: document.getElementById('table-container'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // --- FORMATTERS ---
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatPercent = (val, includePlus = true) => {
    const sign = val > 0 && includePlus ? '+' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')}%`;
  };

  const formatPoints = (val, includePlus = true) => {
    const sign = val > 0 && includePlus ? '+' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')} p.p.`;
  };

  // Format YYYY-MM to readable pt-BR month/year (e.g. "Out/2024")
  const formatMonthYear = (ymStr) => {
    if (!ymStr) return '';
    const [y, m] = ymStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(m, 10) - 1;
    return `${months[idx]}/${y}`;
  };

  // Toast Notification
  function showToast(message, icon = 'ℹ️') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- STOCK DATA FETCHER WITH FALLBACK CHAIN ---
  async function fetchStockData(symbol) {
    const ticker = symbol.trim().toUpperCase().replace('.SA', '');
    
    // 1. Check local preloaded cache
    if (window.STOCK_CACHE && window.STOCK_CACHE[ticker]) {
      return window.STOCK_CACHE[ticker];
    }

    DOM.chartLoading.classList.add('active');

    // 2. Try Vercel / Local serverless endpoint
    try {
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.history && data.history.length > 0) {
          DOM.chartLoading.classList.remove('active');
          return data;
        }
      }
    } catch (e) {
      console.warn('API /api/stock route not reached, trying fallback...', e);
    }

    // 3. Fallback to direct Yahoo Finance query or CORS proxy
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?range=10y&interval=1mo`;
    const proxyUrls = [
      yahooUrl,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`
    ];

    for (const url of proxyUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const result = data.chart?.result?.[0];
        if (result && result.timestamp) {
          const timestamps = result.timestamp;
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

          const meta = result.meta || {};
          const parsedStock = {
            symbol: ticker,
            name: meta.shortName || meta.longName || ticker,
            currency: 'BRL',
            firstTradeDate: meta.firstTradeDate ? new Date(meta.firstTradeDate * 1000).toISOString() : (history[0] ? `${history[0].date}-01T00:00:00.000Z` : null),
            regularMarketPrice: meta.regularMarketPrice || history[history.length - 1]?.close,
            history: history
          };

          DOM.chartLoading.classList.remove('active');
          return parsedStock;
        }
      } catch (err) {
        console.warn(`Fallback ${url} failed:`, err);
      }
    }

    DOM.chartLoading.classList.remove('active');
    throw new Error(`Não foi possível carregar os dados para a ação ${ticker}. Verifique o código e tente novamente.`);
  }

  // --- DYNAMIC WINDOW AVAILABILITY ENGINE ---
  /**
   * REQUISITO DO USUÁRIO:
   * "As janelas disponíveis para comparação são 1 ano, 2 anos, 5 anos e 10 anos.
   * Caso a empresa não esteja listada nesse período, não apresente as opções que ela não cobre.
   * Por exemplo, uma empresa listada na bolsa em menos de 5 anos, não teria a opção de janela de 5 anos e nem 10 anos."
   */
  function computeAvailableWindows(stock) {
    if (!stock || !stock.history || stock.history.length === 0) {
      return ['1y'];
    }

    const totalDataMonths = stock.history.length;
    
    // Check listing span either by firstTradeDate or first history point
    let listingYears = 0;
    if (stock.firstTradeDate) {
      const firstDate = new Date(stock.firstTradeDate);
      const now = new Date();
      listingYears = (now - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
    } else {
      listingYears = totalDataMonths / 12;
    }

    const available = [];

    // Check each window
    // 1 year: needs at least 13 points (start + 12 months) and listing >= 1.0 year
    if (totalDataMonths >= 13 && listingYears >= 0.95) {
      available.push('1y');
    }

    // 2 years: needs at least 25 points and listing >= 2.0 years
    if (totalDataMonths >= 25 && listingYears >= 1.95) {
      available.push('2y');
    }

    // 5 years: needs at least 61 points and listing >= 5.0 years
    if (totalDataMonths >= 61 && listingYears >= 4.95) {
      available.push('5y');
    }

    // 10 years: needs at least 121 points and listing >= 10.0 years
    if (totalDataMonths >= 121 && listingYears >= 9.95) {
      available.push('10y');
    }

    // If company is very young (< 1 year), keep at least 1y or minimal slice
    if (available.length === 0) {
      available.push('1y');
    }

    return {
      available,
      listingYears,
      totalMonths: totalDataMonths
    };
  }

  // Render the window selector buttons dynamically (omitting unavailable ones)
  function renderWindowButtons(availableWindows, listingYears) {
    DOM.windowButtons.innerHTML = '';

    availableWindows.forEach(wKey => {
      const config = WINDOW_CONFIG[wKey];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `window-btn ${state.window === wKey ? 'active' : ''}`;
      btn.dataset.window = wKey;
      btn.textContent = config.label;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.window === wKey ? 'true' : 'false');
      btn.title = `Comparar rendimento nos últimos ${config.label}`;

      btn.addEventListener('click', () => {
        if (state.window !== wKey) {
          state.window = wKey;
          updateSimulation();
        }
      });

      DOM.windowButtons.appendChild(btn);
    });

    // Check if any windows were omitted
    const omitted = ['1y', '2y', '5y', '10y'].filter(w => !availableWindows.includes(w));
    if (omitted.length > 0) {
      const omittedLabels = omitted.map(w => WINDOW_CONFIG[w].label).join(' e ');
      const yearsFormatted = listingYears.toFixed(1).replace('.', ',');
      DOM.windowNoticeText.textContent = `Ação listada há ${yearsFormatted} anos. Janelas de ${omittedLabels} omitidas por não cobrirem o período.`;
      DOM.windowNotice.classList.add('visible');
      DOM.windowStatusHint.textContent = `${availableWindows.length} de 4 opções disponíveis`;
    } else {
      DOM.windowNotice.classList.remove('visible');
      DOM.windowStatusHint.textContent = `Todas as 4 janelas disponíveis`;
    }
  }

  // --- CALCULATION ENGINE ---
  function computeComparisonData() {
    if (!state.stockData || !state.stockData.history || state.stockData.history.length === 0) {
      return null;
    }

    const monthsNeeded = WINDOW_CONFIG[state.window].months;
    const history = state.stockData.history;

    // We need (monthsNeeded + 1) points: Month 0 (initial) + subsequent months
    const sliceCount = monthsNeeded + 1;
    let stockSlice = history.slice(-sliceCount);

    if (stockSlice.length < 2) {
      return null;
    }

    const V0 = state.initialInvestment > 0 ? state.initialInvestment : 1000;
    const priceKey = state.priceType === 'adj' ? 'adjClose' : 'close';

    const p0 = stockSlice[0][priceKey];
    if (!p0 || p0 <= 0) return null;

    // Build timeline points
    const timeline = [];
    let cumulativeSelicFactor = 1.0;
    let prevStockPrice = p0;

    for (let i = 0; i < stockSlice.length; i++) {
      const pt = stockSlice[i];
      const dateStr = pt.date; // "YYYY-MM"
      const currentPrice = pt[priceKey];

      // Selic calculation:
      // Month 0 (initial investment): factor = 1.0, return = 0%
      // Month i >= 1: compounds by the Selic rate of that month
      let selicMonthRate = 0;
      if (i > 0) {
        selicMonthRate = window.SELIC_MAP.get(dateStr) || 0;
        cumulativeSelicFactor *= (1 + selicMonthRate / 100);
      }

      const selicValue = V0 * cumulativeSelicFactor;
      const selicReturnPct = ((selicValue / V0) - 1) * 100;

      // Stock calculation:
      const stockValue = V0 * (currentPrice / p0);
      const stockReturnPct = ((stockValue / V0) - 1) * 100;
      const stockMonthlyVarPct = i === 0 ? 0 : ((currentPrice / prevStockPrice) - 1) * 100;
      prevStockPrice = currentPrice;

      timeline.push({
        index: i,
        date: dateStr,
        label: formatMonthYear(dateStr),
        stockPrice: currentPrice,
        stockMonthlyVar: stockMonthlyVarPct,
        stockValue: stockValue,
        stockReturn: stockReturnPct,
        selicRate: selicMonthRate,
        selicValue: selicValue,
        selicReturn: selicReturnPct,
        diffValue: stockValue - selicValue,
        diffReturn: stockReturnPct - selicReturnPct
      });
    }

    // Key Summary Metrics
    const finalPoint = timeline[timeline.length - 1];
    const stockWins = finalPoint.stockValue >= finalPoint.selicValue;
    const absDiff = Math.abs(finalPoint.diffValue);
    const spreadPp = Math.abs(finalPoint.diffReturn);

    // CAGR (Compound Annual Growth Rate) for Stock
    const years = monthsNeeded / 12;
    const stockCagr = (Math.pow(finalPoint.stockValue / V0, 1 / years) - 1) * 100;
    const selicCagr = (Math.pow(finalPoint.selicValue / V0, 1 / years) - 1) * 100;

    // Best and Worst months for stock in the window
    let bestMonth = { val: -Infinity, label: '' };
    let worstMonth = { val: Infinity, label: '' };
    for (let i = 1; i < timeline.length; i++) {
      const v = timeline[i].stockMonthlyVar;
      if (v > bestMonth.val) bestMonth = { val: v, label: timeline[i].label };
      if (v < worstMonth.val) worstMonth = { val: v, label: timeline[i].label };
    }

    return {
      timeline,
      V0,
      initialPrice: p0,
      finalPoint,
      stockWins,
      absDiff,
      spreadPp,
      stockCagr,
      selicCagr,
      bestMonth,
      worstMonth,
      monthsCount: monthsNeeded
    };
  }

  // --- UI UPDATERS ---
  function updateSimulation() {
    const comp = computeComparisonData();
    if (!comp) return;

    const {
      timeline,
      V0,
      initialPrice,
      finalPoint,
      stockWins,
      absDiff,
      spreadPp,
      stockCagr,
      selicCagr,
      bestMonth,
      worstMonth
    } = comp;

    const ticker = state.stockData.symbol;

    // 1. Company Banner
    DOM.bannerSymbol.textContent = ticker;
    DOM.bannerName.textContent = state.stockData.name || ticker;
    
    const matchedPopular = POPULAR_TICKERS.find(t => t.symbol === ticker);
    DOM.bannerSector.textContent = matchedPopular ? matchedPopular.sector : (state.stockData.sector || 'B3');
    
    if (state.stockData.firstTradeDate) {
      const firstDate = new Date(state.stockData.firstTradeDate);
      DOM.bannerListing.textContent = `Listada desde: ${firstDate.getUTCFullYear()}`;
    } else {
      DOM.bannerListing.textContent = `Histórico B3 disponível`;
    }

    const currentQuote = finalPoint.stockPrice;
    DOM.bannerPrice.textContent = `Cotação Janela: R$ ${currentQuote.toFixed(2).replace('.', ',')}`;

    // 2. Winner Card
    if (stockWins) {
      DOM.winnerCard.className = 'metric-card winner-card';
      DOM.winnerIcon.textContent = '🏆';
      DOM.winnerHeadline.textContent = `${ticker} superou a Selic`;
      DOM.winnerSub.textContent = `Vantagem de +${formatCurrency(absDiff)} (+${spreadPp.toFixed(1).replace('.', ',')} p.p.) no período`;
      DOM.winnerPill.className = 'metric-pill pill-stock';
      DOM.winnerPill.textContent = 'Ação Venceu';
    } else {
      DOM.winnerCard.className = 'metric-card winner-card selic-wins';
      DOM.winnerIcon.textContent = '🛡️';
      DOM.winnerHeadline.textContent = `Selic superou ${ticker}`;
      DOM.winnerSub.textContent = `Vantagem de +${formatCurrency(absDiff)} (+${spreadPp.toFixed(1).replace('.', ',')} p.p.) sobre a ação`;
      DOM.winnerPill.className = 'metric-pill pill-selic';
      DOM.winnerPill.textContent = 'Renda Fixa Venceu';
    }

    // 3. Stock Metric Card
    DOM.stockCardTicker.textContent = ticker;
    DOM.stockFinalValue.textContent = formatCurrency(finalPoint.stockValue);
    DOM.stockReturnPill.textContent = formatPercent(finalPoint.stockReturn);
    DOM.stockReturnPill.className = `return-pill ${finalPoint.stockReturn >= 0 ? 'positive' : 'negative'}`;
    DOM.stockShareCaption.textContent = `Preço: R$ ${initialPrice.toFixed(2).replace('.', ',')} → R$ ${finalPoint.stockPrice.toFixed(2).replace('.', ',')}`;

    // 4. Selic Metric Card
    DOM.selicFinalValue.textContent = formatCurrency(finalPoint.selicValue);
    DOM.selicReturnPill.textContent = formatPercent(finalPoint.selicReturn);
    DOM.selicRateCaption.textContent = `Rentab. média: ${selicCagr.toFixed(2).replace('.', ',')}% a.a.`;

    // 5. Spread / Alpha Card
    const alphaSign = stockWins ? '+' : '-';
    DOM.alphaValue.textContent = `${alphaSign}${formatCurrency(absDiff)}`;
    DOM.alphaPercentPill.textContent = formatPoints(stockWins ? spreadPp : -spreadPp);
    DOM.alphaPercentPill.className = `return-pill ${stockWins ? 'positive' : 'negative'}`;
    DOM.alphaCaption.textContent = stockWins ? `Excedente sobre a renda fixa` : `Rendimento abaixo da Selic`;
    DOM.alphaPill.textContent = stockWins ? 'Alfa Positivo' : 'Alfa Negativo';

    // 6. Secondary Stats
    DOM.statCagrStock.textContent = `${stockCagr.toFixed(2).replace('.', ',')}% a.a.`;
    DOM.statSelicAvg.textContent = `${selicCagr.toFixed(2).replace('.', ',')}% a.a.`;
    DOM.statBestMonth.textContent = bestMonth.label ? `${formatPercent(bestMonth.val)} (${bestMonth.label})` : '--';
    DOM.statWorstMonth.textContent = worstMonth.label ? `${formatPercent(worstMonth.val)} (${worstMonth.label})` : '--';

    // 7. Legend Label
    DOM.legendStockLabel.textContent = `${ticker} (${state.priceType === 'adj' ? 'Ajustado' : 'Nominal'})`;

    // 8. Render Chart & Table
    renderChart(timeline);
    renderTable(timeline);

    // Update window active buttons in DOM
    const btns = DOM.windowButtons.querySelectorAll('.window-btn');
    btns.forEach(b => {
      const isActive = b.dataset.window === state.window;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    // Update quick chips selection
    const chips = DOM.quickChips.querySelectorAll('.chip');
    chips.forEach(c => {
      c.classList.toggle('selected', c.dataset.ticker === ticker);
    });
  }

  // --- CHART RENDERING WITH CHART.JS ---
  function renderChart(timeline) {
    if (!window.Chart) {
      console.error('Chart.js library not loaded yet');
      return;
    }

    const labels = timeline.map(p => p.label);
    const isCurrency = state.viewMode === 'currency';

    const stockDataPoints = timeline.map(p => isCurrency ? p.stockValue : p.stockReturn);
    const selicDataPoints = timeline.map(p => isCurrency ? p.selicValue : p.selicReturn);

    const ctx = DOM.chartCanvas.getContext('2d');

    // Create gradients
    const stockGradient = ctx.createLinearGradient(0, 0, 0, 400);
    stockGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    stockGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const selicGradient = ctx.createLinearGradient(0, 0, 0, 400);
    selicGradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    selicGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    if (state.chartInstance) {
      state.chartInstance.destroy();
    }

    state.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${state.ticker} (${state.priceType === 'adj' ? 'C/ Div' : 'Nominal'})`,
            data: stockDataPoints,
            borderColor: '#10b981',
            backgroundColor: stockGradient,
            borderWidth: 2.8,
            fill: true,
            tension: 0.35,
            pointRadius: timeline.length > 50 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          },
          {
            label: 'Taxa Selic Acumulada',
            data: selicDataPoints,
            borderColor: '#06b6d4',
            backgroundColor: selicGradient,
            borderWidth: 2.8,
            fill: true,
            tension: 0.35,
            pointRadius: timeline.length > 50 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // Using custom HTML legend
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            cornerRadius: 10,
            titleFont: { family: 'Outfit', size: 14, weight: '700' },
            bodyFont: { family: 'JetBrains Mono', size: 13 },
            callbacks: {
              title: function (items) {
                return items[0].label;
              },
              label: function (context) {
                const idx = context.dataIndex;
                const pt = timeline[idx];
                const isStock = context.datasetIndex === 0;

                if (isStock) {
                  return `  ${state.ticker}: ${formatCurrency(pt.stockValue)} (${formatPercent(pt.stockReturn)})`;
                } else {
                  return `  Selic: ${formatCurrency(pt.selicValue)} (${formatPercent(pt.selicReturn)})`;
                }
              },
              afterBody: function (items) {
                const idx = items[0].dataIndex;
                const pt = timeline[idx];
                const delta = pt.stockValue - pt.selicValue;
                const deltaSign = delta >= 0 ? '+' : '';
                return [
                  `  Diferença: ${deltaSign}${formatCurrency(delta)}`,
                  pt.selicRate > 0 ? `  Taxa Selic no Mês: ${pt.selicRate.toFixed(2).replace('.', ',')}%` : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 11 },
              maxTicksLimit: 12,
              maxRotation: 0
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.06)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: function (val) {
                if (isCurrency) {
                  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                  return `R$ ${val}`;
                } else {
                  return `${val >= 0 ? '+' : ''}${val}%`;
                }
              }
            }
          }
        }
      }
    });
  }

  // --- TABLE RENDERING ---
  function renderTable(timeline) {
    const tbody = DOM.evolutionTableBody;
    tbody.innerHTML = '';

    // Render in reverse chronological order (newest month at top)
    const reversed = [...timeline].reverse();

    const fragment = document.createDocumentFragment();

    reversed.forEach(pt => {
      const tr = document.createElement('tr');
      const isWinner = pt.stockValue >= pt.selicValue;

      tr.innerHTML = `
        <td class="mono" style="font-weight: 600;">${pt.label}</td>
        <td class="mono">R$ ${pt.stockPrice.toFixed(2).replace('.', ',')}</td>
        <td class="mono" style="color: ${pt.stockMonthlyVar >= 0 ? 'var(--color-stock)' : 'var(--color-accent-rose)'};">
          ${pt.index === 0 ? '-' : formatPercent(pt.stockMonthlyVar)}
        </td>
        <td class="mono" style="font-weight: 600; color: #fff;">${formatCurrency(pt.stockValue)}</td>
        <td class="mono" style="color: ${pt.stockReturn >= 0 ? 'var(--color-stock)' : 'var(--color-accent-rose)'};">
          ${formatPercent(pt.stockReturn)}
        </td>
        <td class="mono" style="color: var(--color-selic);">${pt.selicRate > 0 ? pt.selicRate.toFixed(2).replace('.', ',') + '%' : '-'}</td>
        <td class="mono" style="font-weight: 600; color: #fff;">${formatCurrency(pt.selicValue)}</td>
        <td class="mono" style="color: var(--color-selic);">${formatPercent(pt.selicReturn)}</td>
        <td>
          <span class="table-badge ${isWinner ? 'stock-win' : 'selic-win'}">
            ${isWinner ? state.ticker : 'Selic'}
          </span>
        </td>
      `;

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }

  // --- CSV EXPORT ---
  function exportCsv() {
    const comp = computeComparisonData();
    if (!comp) return;

    const headers = [
      'Mes/Ano',
      'Cotacao_Acao_BRL',
      'Variacao_Mensal_Acao_Pct',
      'Saldo_Acao_BRL',
      'Retorno_Acumulado_Acao_Pct',
      'Taxa_Selic_Mes_Pct',
      'Saldo_Selic_BRL',
      'Retorno_Acumulado_Selic_Pct',
      'Diferenca_Saldo_BRL',
      'Lider'
    ];

    const rows = comp.timeline.map(pt => [
      `"${pt.label}"`,
      pt.stockPrice.toFixed(2).replace('.', ','),
      pt.stockMonthlyVar.toFixed(2).replace('.', ','),
      pt.stockValue.toFixed(2).replace('.', ','),
      pt.stockReturn.toFixed(2).replace('.', ','),
      pt.selicRate.toFixed(2).replace('.', ','),
      pt.selicValue.toFixed(2).replace('.', ','),
      pt.selicReturn.toFixed(2).replace('.', ','),
      pt.diffValue.toFixed(2).replace('.', ','),
      `"${pt.stockValue >= pt.selicValue ? state.ticker : 'Selic'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparacao_selic_${state.ticker}_${state.window}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Tabela exportada com sucesso como CSV!`, '📥');
  }

  // --- CONTROLLER & EVENT LISTENERS ---
  async function selectStock(symbol) {
    const clean = symbol.trim().toUpperCase().replace('.SA', '');
    if (!clean) return;

    try {
      const data = await fetchStockData(clean);
      state.stockData = data;
      state.ticker = data.symbol;
      DOM.stockInput.value = data.symbol;

      // 1. Calculate available windows for this stock
      const { available, listingYears } = computeAvailableWindows(data);
      state.availableWindows = available;

      // 2. If current window is not supported by this stock, auto-switch to highest supported
      if (!available.includes(state.window)) {
        const fallback = available[available.length - 1];
        showToast(`${data.symbol} está listada há ${listingYears.toFixed(1).replace('.', ',')} anos. Janela alterada para ${WINDOW_CONFIG[fallback].label}.`, '⚠️');
        state.window = fallback;
      }

      // 3. Render window buttons dynamically
      renderWindowButtons(available, listingYears);

      // 4. Update the simulation
      updateSimulation();
    } catch (err) {
      showToast(err.message || 'Erro ao carregar dados da ação.', '❌');
    }
  }

  // Set up all interactive event listeners
  function setupEvents() {
    // Autocomplete & Stock Search Input
    DOM.stockInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toUpperCase();
      if (!query) {
        DOM.autocompleteList.classList.remove('open');
        return;
      }

      const matches = POPULAR_TICKERS.filter(t => 
        t.symbol.includes(query) || t.name.toUpperCase().includes(query)
      );

      if (matches.length > 0) {
        DOM.autocompleteList.innerHTML = matches.map(m => `
          <div class="autocomplete-item" data-ticker="${m.symbol}">
            <div>
              <span class="auto-ticker">${m.symbol}</span>
              <span class="auto-name"> • ${m.name}</span>
            </div>
            <span class="auto-sector">${m.sector}</span>
          </div>
        `).join('');
        DOM.autocompleteList.classList.add('open');
      } else {
        DOM.autocompleteList.innerHTML = `
          <div class="autocomplete-item" data-ticker="${query}">
            <div>
              <span class="auto-ticker">Buscar "${query}" na B3</span>
            </div>
            <span class="auto-sector">Personalizado</span>
          </div>
        `;
        DOM.autocompleteList.classList.add('open');
      }
    });

    // Autocomplete Item Click
    DOM.autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item && item.dataset.ticker) {
        selectStock(item.dataset.ticker);
        DOM.autocompleteList.classList.remove('open');
      }
    });

    // Stock input enter key
    DOM.stockInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = DOM.stockInput.value.trim().toUpperCase();
        if (val) {
          selectStock(val);
          DOM.autocompleteList.classList.remove('open');
        }
      }
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        DOM.autocompleteList.classList.remove('open');
      }
    });

    // Quick Stock Chips
    DOM.quickChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (btn && btn.dataset.ticker) {
        selectStock(btn.dataset.ticker);
      }
    });

    // Investment Input Currency Formatting & Mask
    DOM.investmentInput.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/\D/g, '');
      if (!raw) raw = '0';
      const num = parseInt(raw, 10) / 100;
      state.initialInvestment = num > 0 ? num : 1000;
      
      e.target.value = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);

      // Deselect quick amount chips if custom
      DOM.amountChips.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('selected', Number(c.dataset.val) === num);
      });

      updateSimulation();
    });

    DOM.investmentInput.addEventListener('blur', (e) => {
      if (!e.target.value || state.initialInvestment <= 0) {
        state.initialInvestment = 1000;
        e.target.value = '1.000,00';
        updateSimulation();
      }
    });

    // Quick Investment Amount Chips
    DOM.amountChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (btn && btn.dataset.val) {
        const val = Number(btn.dataset.val);
        state.initialInvestment = val;
        DOM.investmentInput.value = new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(val);

        DOM.amountChips.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');

        updateSimulation();
      }
    });

    // View Mode Toggle (Currency vs Percent)
    DOM.viewModeCurrency.addEventListener('click', () => {
      if (state.viewMode !== 'currency') {
        state.viewMode = 'currency';
        DOM.viewModeCurrency.classList.add('active');
        DOM.viewModePercent.classList.remove('active');
        updateSimulation();
      }
    });

    DOM.viewModePercent.addEventListener('click', () => {
      if (state.viewMode !== 'percent') {
        state.viewMode = 'percent';
        DOM.viewModePercent.classList.add('active');
        DOM.viewModeCurrency.classList.remove('active');
        updateSimulation();
      }
    });

    // Price Type Toggle (Adjusted with Dividends vs Nominal)
    DOM.priceTypeAdj.addEventListener('click', () => {
      if (state.priceType !== 'adj') {
        state.priceType = 'adj';
        DOM.priceTypeAdj.classList.add('active');
        DOM.priceTypeNominal.classList.remove('active');
        updateSimulation();
      }
    });

    DOM.priceTypeNominal.addEventListener('click', () => {
      if (state.priceType !== 'nominal') {
        state.priceType = 'nominal';
        DOM.priceTypeNominal.classList.add('active');
        DOM.priceTypeAdj.classList.remove('active');
        updateSimulation();
      }
    });

    // CSV Export Button
    DOM.btnExportCsv.addEventListener('click', exportCsv);

    // Toggle Table Collapse
    DOM.btnToggleTable.addEventListener('click', () => {
      state.isTableCollapsed = !state.isTableCollapsed;
      DOM.tableContainer.style.display = state.isTableCollapsed ? 'none' : 'block';
      DOM.tableToggleLabel.textContent = state.isTableCollapsed ? 'Expandir Tabela' : 'Recolher Tabela';
    });
  }

  // --- INITIALIZATION ---
  async function init() {
    setupEvents();
    // Default load PETR4
    await selectStock('PETR4');
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
