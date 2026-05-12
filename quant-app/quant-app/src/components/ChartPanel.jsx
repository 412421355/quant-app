import { useMemo, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Scatter, Cell
} from 'recharts'
import styles from './ChartPanel.module.css'

const MAX_POINTS = 500 // 效能限制，超過時取樣

export default function ChartPanel({ data }) {
  const [range, setRange] = useState([0, 1])

  // 取樣（資料太多時降採樣）
  const sampled = useMemo(() => {
    if (data.length <= MAX_POINTS) return data
    const step = Math.ceil(data.length / MAX_POINTS)
    return data.filter((_, i) => i % step === 0)
  }, [data])

  const displayed = useMemo(() => {
    const start = Math.floor(range[0] * sampled.length)
    const end   = Math.ceil(range[1] * sampled.length)
    return sampled.slice(start, end)
  }, [sampled, range])

  // 格式化 X 軸時間
  const fmtTime = (d) => {
    if (!d) return ''
    const dt = new Date(d * 1000)
    return `${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getDate().toString().padStart(2,'0')}`
  }

  // Y 軸範圍
  const prices = displayed.flatMap(d => [d.high, d.low, d.dcUpper, d.dcLower].filter(Boolean))
  const yMin = prices.length ? Math.min(...prices) * 0.999 : 0
  const yMax = prices.length ? Math.max(...prices) * 1.001 : 1

  // 蠟燭圖數據轉換（用 Bar 模擬）
  const candleData = displayed.map(d => ({
    time: d.time,
    date: d.date,
    open: d.open, high: d.high, low: d.low, close: d.close,
    dcUpper: d.dcUpper, dcLower: d.dcLower, dcMid: d.dcMid,
    volume: d.volume, volMA: d.volMA,
    entryLong: d.entryLong, entryShort: d.entryShort,
    signal: d.signal,
    isUp: d.close >= d.open,
    // 蠟燭 bar：從 min(open,close) 到 max(open,close)
    candleBase:  Math.min(d.open, d.close),
    candleBody:  Math.abs(d.close - d.open),
    // 上下影線
    wickHigh: d.high - Math.max(d.open, d.close),
    wickLow:  Math.min(d.open, d.close) - d.low,
  }))

  // 進出場標記
  const longEntries  = displayed.filter(d => d.entryLong)
  const shortEntries = displayed.filter(d => d.entryShort)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipTime}>{d.date?.toLocaleString('zh-TW')}</div>
        <div className={styles.tooltipRow}><span>開</span><span>{d.open?.toFixed(4)}</span></div>
        <div className={styles.tooltipRow}><span>高</span><span style={{color:'var(--accent-green)'}}>{d.high?.toFixed(4)}</span></div>
        <div className={styles.tooltipRow}><span>低</span><span style={{color:'var(--accent-red)'}}>{d.low?.toFixed(4)}</span></div>
        <div className={styles.tooltipRow}><span>收</span><span style={{color: d.isUp ? 'var(--accent-green)' : 'var(--accent-red)'}}>{d.close?.toFixed(4)}</span></div>
        {d.dcUpper && <div className={styles.tooltipRow}><span>上軌</span><span style={{color:'var(--accent-blue)'}}>{d.dcUpper?.toFixed(4)}</span></div>}
        {d.dcLower && <div className={styles.tooltipRow}><span>下軌</span><span style={{color:'var(--accent-purple)'}}>{d.dcLower?.toFixed(4)}</span></div>}
        {d.signal !== 0 && <div className={styles.tooltipSignal} style={{color: d.signal===1?'var(--accent-green)':'var(--accent-red)'}}>
          {d.signal === 1 ? '▲ 多頭突破' : '▼ 空頭跌破'}
        </div>}
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* 時間範圍滑桿 */}
      <div className={styles.rangeWrap}>
        <span className={styles.rangeLabel}>顯示範圍</span>
        <input type="range" min={0} max={0.9} step={0.01}
          value={range[0]}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (v < range[1] - 0.05) setRange([v, range[1]])
          }}
          style={{ width: 80 }}
        />
        <input type="range" min={0.1} max={1} step={0.01}
          value={range[1]}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (v > range[0] + 0.05) setRange([range[0], v])
          }}
          style={{ width: 80 }}
        />
        <span className={styles.rangeLabel}>{displayed.length} 根</span>
        <button className={styles.resetBtn} onClick={() => setRange([0,1])}>全部</button>
      </div>

      {/* 主 K 線圖 */}
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={candleData} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e2a36" vertical={false} />
            <XAxis dataKey="time" tickFormatter={fmtTime}
              tick={{ fill: '#3d5068', fontSize: 10 }} axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis domain={[yMin, yMax]} orientation="right"
              tick={{ fill: '#3d5068', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(2)} width={70}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 唐奇安通道 */}
            <Line dataKey="dcUpper" stroke="#2dd4f7" strokeWidth={1}
              dot={false} strokeDasharray="4 3" name="上軌" />
            <Line dataKey="dcLower" stroke="#a78bfa" strokeWidth={1}
              dot={false} strokeDasharray="4 3" name="下軌" />
            <Line dataKey="dcMid" stroke="#f5a623" strokeWidth={1}
              dot={false} strokeDasharray="2 4" name="中線" />

            {/* 影線（用細 Bar 模擬） */}
            <Bar dataKey="high" stackId="wick" fill="transparent" />

            {/* K 線實體 */}
            <Bar dataKey="candleBody" stackId="candle" radius={[1,1,1,1]}
              minPointSize={1}>
              {candleData.map((d, i) => (
                <Cell key={i}
                  fill={d.isUp ? 'var(--accent-green)' : 'var(--accent-red)'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            {/* 進場點標記（Scatter） */}
            <Scatter data={longEntries.map(d => ({ time: d.time, y: d.low * 0.998, date: d.date }))}
              dataKey="y" fill="#22d68a" shape={<TriangleUp />} name="買進" />
            <Scatter data={shortEntries.map(d => ({ time: d.time, y: d.high * 1.002, date: d.date }))}
              dataKey="y" fill="#ff4d6a" shape={<TriangleDown />} name="放空" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 成交量子圖 */}
      <div className={styles.volWrap}>
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={candleData} margin={{ top: 0, right: 12, bottom: 4, left: 8 }}>
            <XAxis dataKey="time" tickFormatter={fmtTime}
              tick={{ fill: '#3d5068', fontSize: 9 }} axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis orientation="right"
              tick={{ fill: '#3d5068', fontSize: 9 }} axisLine={false} tickLine={false}
              width={70} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <CartesianGrid strokeDasharray="2 4" stroke="#1e2a36" vertical={false} />
            <Bar dataKey="volume" maxBarSize={6}>
              {candleData.map((d, i) => (
                <Cell key={i}
                  fill={d.isUp ? 'rgba(34,214,138,0.5)' : 'rgba(255,77,106,0.5)'}
                />
              ))}
            </Bar>
            <Line dataKey="volMA" stroke="#f5a623" strokeWidth={1} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 圖例 */}
      <div className={styles.legend}>
        {[
          { color: 'var(--accent-blue)',   label: '通道上軌' },
          { color: 'var(--accent-purple)', label: '通道下軌' },
          { color: 'var(--accent-amber)',  label: '中線' },
          { color: 'var(--accent-green)',  label: '▲ 買進' },
          { color: 'var(--accent-red)',    label: '▼ 放空' },
        ].map(l => (
          <span key={l.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// 自訂進場箭頭形狀
function TriangleUp(props) {
  const { cx, cy } = props
  return <polygon points={`${cx},${cy-8} ${cx-5},${cy+2} ${cx+5},${cy+2}`} fill="#22d68a" opacity={0.9} />
}
function TriangleDown(props) {
  const { cx, cy } = props
  return <polygon points={`${cx},${cy+8} ${cx-5},${cy-2} ${cx+5},${cy-2}`} fill="#ff4d6a" opacity={0.9} />
}
