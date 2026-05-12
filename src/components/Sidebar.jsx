import { useRef } from 'react'
import styles from './Sidebar.module.css'

export default function Sidebar({ params, setParams, fileName, onFile, onRun, hasData, loading }) {
  const fileRef = useRef()

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }))

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>PARAM</span>
        <span className={styles.brandSub}>CONSOLE</span>
      </div>

      {/* 數據上傳 */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>// 數據匯入</div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])} />
        <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
          <span className={styles.uploadIcon}>⬡</span>
          <span>{fileName || '選擇 CSV 檔案'}</span>
        </button>
        {fileName && (
          <p className={styles.fileLoaded}>✓ {fileName}</p>
        )}
      </section>

      {/* 通道方法 */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>// 動態箱體識別</div>
        <div className={styles.radioGroup}>
          {[
            { val: 'donchian', label: '唐奇安通道' },
            { val: 'swing',    label: 'Swing Pivot' },
          ].map(opt => (
            <label key={opt.val} className={`${styles.radio} ${params.method === opt.val ? styles.radioActive : ''}`}>
              <input type="radio" name="method" value={opt.val}
                checked={params.method === opt.val}
                onChange={() => set('method', opt.val)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <SliderRow
          label="Lookback 週期 N"
          value={params.lookback}
          min={5} max={200} step={1}
          onChange={v => set('lookback', v)}
        />
      </section>

      {/* 兩段式確認 */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>// 兩段式突破確認</div>
        <SliderRow
          label="量均線週期"
          value={params.volMaPeriod}
          min={5} max={60} step={1}
          onChange={v => set('volMaPeriod', v)}
        />
        <SliderRow
          label="觀察期（K線根數）"
          value={params.confirmBars}
          min={1} max={20} step={1}
          onChange={v => set('confirmBars', v)}
        />
        <SliderRow
          label={`成交量倍數 ×${params.volMultiplier.toFixed(1)}`}
          value={params.volMultiplier}
          min={1.0} max={5.0} step={0.1}
          onChange={v => set('volMultiplier', parseFloat(v))}
        />
      </section>

      {/* 回測設定 */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>// 回測設定</div>
        <div className={styles.inputRow}>
          <label className={styles.inputLabel}>初始資金</label>
          <input
            type="number"
            value={params.initialCapital}
            onChange={e => set('initialCapital', parseFloat(e.target.value) || 10000)}
            min={100}
          />
        </div>
      </section>

      {/* 執行按鈕 */}
      <div className={styles.runWrap}>
        <button
          className={`${styles.runBtn} ${!hasData || loading ? styles.runBtnDisabled : ''}`}
          onClick={onRun}
          disabled={!hasData || loading}
        >
          {loading ? (
            <span className={styles.runLoading}>計算中...</span>
          ) : (
            <><span className={styles.runArrow}>▶</span> 執行回測</>
          )}
        </button>
      </div>

      <div className={styles.footer}>
        僅供研究用途 · 非投資建議
      </div>
    </aside>
  )
}

function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
  )
}
