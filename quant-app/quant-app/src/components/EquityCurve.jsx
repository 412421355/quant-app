import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './EquityCurve.module.css'

export default function EquityCurve({ data, metrics: m, initialCapital }) {
  const fmtTime = (t) => {
    if (!t) return ''
    const dt = new Date(t * 1000)
    return `${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getDate().toString().padStart(2,'0')}`
  }

  const equityData = data.map(d => ({
    time:     d.time,
    date:     d.date,
    equity:   d.equity,
    drawdown: d.drawdown,
  }))

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const pnl = d.equity - initialCapital
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipTime}>{d.date?.toLocaleDateString('zh-TW')}</div>
        <div className={styles.tooltipRow}>
          <span>資金</span>
          <span style={{ color: 'var(--accent-blue)' }}>{d.equity?.toFixed(2)}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span>損益</span>
          <span style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {pnl >= 0 ? '+' : ''}{pnl?.toFixed(2)}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span>回撤</span>
          <span style={{ color: 'var(--accent-red)' }}>{d.drawdown?.toFixed(2)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* 資金曲線 */}
      <div className={styles.chartLabel}>資金曲線（Equity Curve）</div>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={equityData} margin={{ top: 8, right: 70, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2dd4f7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2dd4f7" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e2a36" vertical={false} />
            <XAxis dataKey="time" tickFormatter={fmtTime}
              tick={{ fill: '#3d5068', fontSize: 10 }} axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis orientation="right"
              tick={{ fill: '#3d5068', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false} width={70}
              tickFormatter={v => v.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={initialCapital} stroke="#3d5068" strokeDasharray="4 3" />
            <Area dataKey="equity" stroke="#2dd4f7" strokeWidth={2}
              fill="url(#eqGrad)" dot={false} name="資金" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 回撤圖 */}
      <div className={styles.chartLabel} style={{ marginTop: 12 }}>回撤幅度（Drawdown）</div>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={equityData} margin={{ top: 4, right: 70, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff4d6a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ff4d6a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e2a36" vertical={false} />
            <XAxis dataKey="time" tickFormatter={fmtTime}
              tick={{ fill: '#3d5068', fontSize: 9 }} axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis orientation="right"
              tick={{ fill: '#3d5068', fontSize: 9 }} axisLine={false} tickLine={false}
              width={70} tickFormatter={v => `${v.toFixed(1)}%`}
            />
            <Area dataKey="drawdown" stroke="#ff4d6a" strokeWidth={1.5}
              fill="url(#ddGrad)" dot={false} name="回撤" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 統計摘要 */}
      <div className={styles.stats}>
        {[
          { label: '平均獲利（每筆）', value: m.avgWin.toFixed(4),  color: 'var(--accent-green)' },
          { label: '平均虧損（每筆）', value: m.avgLoss.toFixed(4), color: 'var(--accent-red)' },
          { label: '盈虧比（RRR）',
            value: m.avgLoss !== 0 ? Math.abs(m.avgWin / m.avgLoss).toFixed(2) : '—',
            color: 'var(--accent-amber)' },
          { label: '最大回撤', value: `${m.maxDrawdown.toFixed(2)}%`, color: 'var(--accent-red)' },
        ].map(s => (
          <div key={s.label} className={styles.statItem}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
