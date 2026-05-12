// ═══════════════════════════════════════════════════════════
// 量化回測引擎（JavaScript 純前端版）
// 邏輯與 Python 版本完全對應，可直接替換為 Hawkes / GEX
// ═══════════════════════════════════════════════════════════

// ── 唐奇安通道 ──────────────────────────────────────────────
export function calcDonchian(data, period) {
  return data.map((d, i) => {
    if (i < period) return { ...d, dcUpper: null, dcLower: null, dcMid: null }
    const window = data.slice(i - period, i) // shift(1): 不含當根
    const high = Math.max(...window.map(x => x.high))
    const low  = Math.min(...window.map(x => x.low))
    return { ...d, dcUpper: high, dcLower: low, dcMid: (high + low) / 2 }
  })
}

// ── 滾動波段高低點 ───────────────────────────────────────────
export function calcSwingPivots(data, left, right) {
  const n = data.length
  const result = data.map(d => ({ ...d, pivotHigh: null, pivotLow: null }))

  for (let i = left; i < n - right; i++) {
    const wHigh = data.slice(i - left, i + right + 1).map(x => x.high)
    const wLow  = data.slice(i - left, i + right + 1).map(x => x.low)
    if (data[i].high === Math.max(...wHigh)) result[i].pivotHigh = data[i].high
    if (data[i].low  === Math.min(...wLow))  result[i].pivotLow  = data[i].low
  }

  // 向前填補作為動態邊界
  let lastHigh = null, lastLow = null
  for (let i = 0; i < n; i++) {
    if (result[i].pivotHigh !== null) lastHigh = result[i].pivotHigh
    if (result[i].pivotLow  !== null) lastLow  = result[i].pivotLow
    result[i].dcUpper = lastHigh
    result[i].dcLower = lastLow
    result[i].dcMid   = lastHigh && lastLow ? (lastHigh + lastLow) / 2 : null
  }
  return result
}

// ── 成交量移動平均 ───────────────────────────────────────────
export function calcVolMA(data, period) {
  return data.map((d, i) => {
    if (i < period) return { ...d, volMA: null }
    const avg = data.slice(i - period, i).reduce((s, x) => s + x.volume, 0) / period
    return { ...d, volMA: avg }
  })
}

// ── 兩段式突破確認訊號生成 ───────────────────────────────────
// ※ 要替換成 Hawkes 邏輯：修改下方「第二階段確認條件」即可
export function generateSignals(data, confirmBars, volMultiplier) {
  const n = data.length
  const signals = new Array(n).fill(0)

  let pendingDir   = 0
  let pendingStart = -1

  for (let i = 1; i < n; i++) {
    const d = data[i]
    if (!d.dcUpper || !d.dcLower || !d.volMA) continue

    // 第一階段：結構破壞偵測
    if (d.close > d.dcUpper && pendingDir !== 1) {
      pendingDir = 1; pendingStart = i
    } else if (d.close < d.dcLower && pendingDir !== -1) {
      pendingDir = -1; pendingStart = i
    }

    // 第二階段：成交量確認（可替換為 λ(t) > 閾值）
    if (pendingDir !== 0 && pendingStart > 0) {
      const elapsed = i - pendingStart
      if (elapsed <= confirmBars) {
        const volSurge = d.volume > d.volMA * volMultiplier
        if (volSurge) {
          signals[i]    = pendingDir
          pendingDir    = 0
          pendingStart  = -1
        }
      } else {
        pendingDir = 0; pendingStart = -1
      }
    }
  }

  // 轉換為持倉狀態（下一根執行）
  const positions = new Array(n).fill(0)
  let currentPos = 0
  for (let i = 1; i < n; i++) {
    if (signals[i - 1] !== 0) currentPos = signals[i - 1]
    positions[i] = currentPos
  }

  return data.map((d, i) => {
    const prevPos = i > 0 ? positions[i - 1] : 0
    const posChange = positions[i] - prevPos
    return {
      ...d,
      signal:     signals[i],
      position:   positions[i],
      entryLong:  posChange > 0 && positions[i] === 1  ? d.open : null,
      entryShort: posChange < 0 && positions[i] === -1 ? d.open : null,
      exitPos:    posChange !== 0 && positions[i] === 0 ? d.open : null,
    }
  })
}

// ── 向量化回測引擎 ───────────────────────────────────────────
export function runBacktest(data, initialCapital = 10000) {
  let equity = initialCapital
  const result = data.map((d, i) => {
    if (i === 0) return { ...d, equity, drawdown: 0, ret: 0 }
    const prevClose = data[i - 1].close
    const ret = prevClose > 0
      ? ((d.close - prevClose) / prevClose) * data[i - 1].position
      : 0
    equity = equity * (1 + ret)
    return { ...d, equity, ret }
  })

  // 計算回撤
  let peak = initialCapital
  return result.map(d => {
    if (d.equity > peak) peak = d.equity
    return { ...d, drawdown: peak > 0 ? (d.equity - peak) / peak * 100 : 0 }
  })
}

// ── 績效指標 ─────────────────────────────────────────────────
export function calcMetrics(data, initialCapital = 10000) {
  const trades = []
  let entryPrice = null, entryDir = 0

  for (let i = 1; i < data.length; i++) {
    const curr = data[i], prev = data[i - 1]
    if (curr.position !== prev.position) {
      if (entryPrice !== null) {
        trades.push((curr.close - entryPrice) * entryDir)
      }
      if (curr.position !== 0) {
        entryPrice = curr.close
        entryDir   = curr.position
      } else {
        entryPrice = null; entryDir = 0
      }
    }
  }

  if (trades.length === 0) return {
    winRate: 0, totalPnL: 0, maxDrawdown: 0,
    totalTrades: 0, winCount: 0, lossCount: 0,
    avgWin: 0, avgLoss: 0, finalEquity: initialCapital,
  }

  const wins   = trades.filter(t => t > 0)
  const losses = trades.filter(t => t <= 0)
  const finalEquity  = data[data.length - 1].equity
  const maxDrawdown  = Math.min(...data.map(d => d.drawdown))

  return {
    winRate:     wins.length / trades.length * 100,
    totalPnL:    finalEquity - initialCapital,
    maxDrawdown,
    totalTrades: trades.length,
    winCount:    wins.length,
    lossCount:   losses.length,
    avgWin:      wins.length   ? wins.reduce((a,b)=>a+b,0)/wins.length     : 0,
    avgLoss:     losses.length ? losses.reduce((a,b)=>a+b,0)/losses.length : 0,
    finalEquity,
  }
}

// ── CSV 解析與清洗 ───────────────────────────────────────────
export function parseCSV(rawText) {
  const lines = rawText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())

  const colMap = {}
  headers.forEach((h, i) => {
    if (['datetime','date','time','timestamp','open_time','candle_begin_time'].includes(h)) colMap.datetime = i
    else if (h === 'open')   colMap.open   = i
    else if (h === 'high')   colMap.high   = i
    else if (h === 'low')    colMap.low    = i
    else if (['close','last'].includes(h))  colMap.close  = i
    else if (['volume','vol','quantity'].includes(h)) colMap.volume = i
  })

  if (colMap.datetime === undefined) colMap.datetime = 0

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
    if (cols.length < 2) continue
    const time = new Date(cols[colMap.datetime]).getTime()
    if (isNaN(time)) continue
    rows.push({
      time:   Math.floor(time / 1000), // Unix seconds for lightweight-charts
      date:   new Date(cols[colMap.datetime]),
      open:   parseFloat(cols[colMap.open])   || 0,
      high:   parseFloat(cols[colMap.high])   || 0,
      low:    parseFloat(cols[colMap.low])    || 0,
      close:  parseFloat(cols[colMap.close])  || 0,
      volume: parseFloat(cols[colMap.volume]) || 0,
    })
  }

  return rows.sort((a, b) => a.time - b.time)
}
