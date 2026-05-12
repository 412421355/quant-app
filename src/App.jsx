import { useState, useCallback, useRef, useEffect } from 'react'
import {
  parseCSV, calcDonchian, calcSwingPivots,
  calcVolMA, generateSignals, runBacktest, calcMetrics
} from './engine.js'
import ChartPanel from './components/ChartPanel.jsx'
import EquityCurve from './components/EquityCurve.jsx'
import MetricsBar from './components/MetricsBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import styles from './App.module.css'

const DEFAULT_PARAMS = {
  method:        'donchian',
  lookback:      20,
  volMaPeriod:   20,
  confirmBars:   3,
  volMultiplier: 1.5,
  initialCapital: 10000,
}

export default function App() {
  const [params, setParams]     = useState(DEFAULT_PARAMS)
  const [rawData, setRawData]   = useState(null)
  const [result, setResult]     = useState(null)
  const [metrics, setMetrics]   = useState(null)
  const [fileName, setFileName] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState('chart')
  const [error, setError]       = useState(null)

  // CSV 上傳處理
  const handleFile = useCallback((file) => {
    if (!file) return
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result)
        if (parsed.length < 50) {
          setError('數據太少（最少需要 50 根 K 線）')
          return
        }
        setRawData(parsed)
      } catch (err) {
        setError(`解析失敗：${err.message}`)
      }
    }
    reader.readAsText(file)
  }, [])

  // 執行回測
  const runAnalysis = useCallback(() => {
    if (!rawData) return
    setLoading(true)

    setTimeout(() => {
      try {
        let data = [...rawData]

        // 指標計算
        if (params.method === 'donchian') {
          data = calcDonchian(data, params.lookback)
        } else {
          const half = Math.max(1, Math.floor(params.lookback / 2))
          data = calcSwingPivots(data, half, half)
        }
        data = calcVolMA(data, params.volMaPeriod)

        // 去除指標不足的頭部
        const startIdx = data.findIndex(d => d.dcUpper && d.dcLower && d.volMA)
        if (startIdx < 0) { setError('數據不足以計算指標'); setLoading(false); return }
        data = data.slice(startIdx)

        // 訊號 + 回測
        data = generateSignals(data, params.confirmBars, params.volMultiplier)
        data = runBacktest(data, params.initialCapital)
        const m = calcMetrics(data, params.initialCapital)

        setResult(data)
        setMetrics(m)
        setError(null)
      } catch (err) {
        setError(`回測失敗：${err.message}`)
      }
      setLoading(false)
    }, 20)
  }, [rawData, params])

  // 拖曳上傳
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }, [handleFile])

  return (
    <div className={styles.app} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      {/* 掃描線背景效果 */}
      <div className={styles.scanline} />

      {/* 側邊欄 */}
      <Sidebar
        params={params}
        setParams={setParams}
        fileName={fileName}
        onFile={handleFile}
        onRun={runAnalysis}
        hasData={!!rawData}
        loading={loading}
      />

      {/* 主內容區 */}
      <main className={styles.main}>
        {/* 頂部標題列 */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.logo}>QBW</span>
            <div>
              <h1 className={styles.title}>自定義量化回測工作站</h1>
              <p className={styles.subtitle}>
                {result
                  ? `${result[0].date.toLocaleDateString('zh-TW')} ─ ${result[result.length-1].date.toLocaleDateString('zh-TW')} · ${result.length.toLocaleString()} 根 K 線`
                  : '上傳 CSV · 調整參數 · 執行回測'}
              </p>
            </div>
          </div>
          <div className={styles.statusDot} style={{ '--dot-color': result ? 'var(--accent-green)' : 'var(--text-muted)' }} />
        </header>

        {/* 績效指標列 */}
        {metrics && <MetricsBar metrics={metrics} initialCapital={params.initialCapital} />}

        {/* Tab 切換 */}
        {result && (
          <div className={styles.tabs}>
            {[
              { id: 'chart',  label: '01 / K線圖' },
              { id: 'equity', label: '02 / 資金曲線' },
              { id: 'trades', label: '03 / 交易明細' },
            ].map(t => (
              <button
                key={t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 內容區 */}
        <div className={styles.content}>
          {error && (
            <div className={styles.error}>⚠ {error}</div>
          )}

          {!rawData && !error && (
            <DropZone onFile={handleFile} />
          )}

          {rawData && !result && !loading && (
            <div className={styles.ready}>
              <p>✓ 已載入 <strong>{rawData.length.toLocaleString()}</strong> 根 K 線</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                調整左側參數後，點擊「執行回測」
              </p>
            </div>
          )}

          {loading && (
            <div className={styles.loading}>
              <div className={styles.loadingBar} />
              <p>計算中...</p>
            </div>
          )}

          {result && !loading && (
            <>
              {activeTab === 'chart'  && <ChartPanel data={result} params={params} />}
              {activeTab === 'equity' && <EquityCurve data={result} metrics={metrics} initialCapital={params.initialCapital} />}
              {activeTab === 'trades' && <TradesTable data={result} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// 拖曳上傳區
function DropZone({ onFile }) {
  const inputRef = useRef()
  return (
    <div className={styles.dropzone} onClick={() => inputRef.current.click()}>
      <input
        ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={e => onFile(e.target.files[0])}
      />
      <div className={styles.dropzoneIcon}>⬡</div>
      <p className={styles.dropzoneTitle}>拖曳 CSV 至此，或點擊上傳</p>
      <p className={styles.dropzoneHint}>
        支援格式：DateTime / Open / High / Low / Close / Volume
      </p>
      <div className={styles.dropzoneFormats}>
        <span>幣安</span><span>Bybit</span><span>TradingView</span><span>Coinglass</span>
      </div>
    </div>
  )
}

// 交易明細表格
function TradesTable({ data }) {
  const signals = data.filter(d => d.signal !== 0)

  const downloadCSV = () => {
    const headers = 'DateTime,Open,High,Low,Close,Volume,Signal,DC_Upper,DC_Lower,Position,Equity'
    const rows = data.map(d =>
      `${d.date.toISOString()},${d.open},${d.high},${d.low},${d.close},${d.volume},${d.signal},${d.dcUpper?.toFixed(4)||''},${d.dcLower?.toFixed(4)||''},${d.position},${d.equity?.toFixed(4)||''}`
    )
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'backtest_result.csv'; a.click()
  }

  return (
    <div className={styles.tradesContainer}>
      <div className={styles.tradesHeader}>
        <span>訊號觸發紀錄（共 {signals.length} 筆）</span>
        <button className={styles.downloadBtn} onClick={downloadCSV}>⬇ 下載完整 CSV</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>時間</th><th>收盤價</th><th>成交量</th>
              <th>訊號</th><th>通道上軌</th><th>通道下軌</th><th>持倉</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((d, i) => (
              <tr key={i}>
                <td>{d.date.toLocaleString('zh-TW')}</td>
                <td>{d.close.toFixed(4)}</td>
                <td>{d.volume.toLocaleString()}</td>
                <td style={{ color: d.signal === 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {d.signal === 1 ? '▲ 多頭突破' : '▼ 空頭跌破'}
                </td>
                <td>{d.dcUpper?.toFixed(4) || '—'}</td>
                <td>{d.dcLower?.toFixed(4) || '—'}</td>
                <td style={{ color: d.position === 1 ? 'var(--accent-green)' : d.position === -1 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  {d.position === 1 ? '多倉' : d.position === -1 ? '空倉' : '空手'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
