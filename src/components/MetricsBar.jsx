import styles from './MetricsBar.module.css'

export default function MetricsBar({ metrics: m, initialCapital }) {
  const pnlPct = initialCapital > 0 ? (m.totalPnL / initialCapital * 100) : 0

  return (
    <div className={styles.bar}>
      <Metric
        label="總勝率"
        value={`${m.winRate.toFixed(1)}%`}
        sub={`${m.winCount}勝 / ${m.lossCount}敗`}
        color={m.winRate >= 50 ? 'green' : 'red'}
      />
      <Metric
        label="總盈虧"
        value={`${m.totalPnL >= 0 ? '+' : ''}${m.totalPnL.toFixed(2)}`}
        sub={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
        color={m.totalPnL >= 0 ? 'green' : 'red'}
      />
      <Metric
        label="最大回撤"
        value={`${m.maxDrawdown.toFixed(2)}%`}
        sub="歷史最大"
        color="red"
      />
      <Metric
        label="總交易筆數"
        value={m.totalTrades}
        sub={`勝率基礎`}
        color="blue"
      />
      <Metric
        label="最終資金"
        value={m.finalEquity.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}
        sub={`初始 ${initialCapital.toLocaleString()}`}
        color={m.finalEquity >= initialCapital ? 'green' : 'red'}
      />
      <Metric
        label="盈虧比"
        value={m.avgLoss !== 0 ? `${Math.abs(m.avgWin / m.avgLoss).toFixed(2)}` : '—'}
        sub="avg win / avg loss"
        color="amber"
      />
    </div>
  )
}

function Metric({ label, value, sub, color }) {
  const colorMap = {
    green:  'var(--accent-green)',
    red:    'var(--accent-red)',
    blue:   'var(--accent-blue)',
    amber:  'var(--accent-amber)',
    purple: 'var(--accent-purple)',
  }
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={{ color: colorMap[color] }}>{value}</div>
      <div className={styles.metricSub}>{sub}</div>
    </div>
  )
}
