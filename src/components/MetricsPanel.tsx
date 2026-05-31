import { MetricsResult, EVAL_THRESHOLDS } from '../utils/metrics';

interface Props {
  metrics: MetricsResult;
  onCalculate: () => void;
  iouThreshold: string;
  onIouThresholdChange: (threshold: string) => void;
}

export default function MetricsPanel({ metrics, onCalculate, iouThreshold, onIouThresholdChange }: Props) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  // Get threshold-specific metrics
  const tp = metrics.tpByThreshold?.[iouThreshold] ?? metrics.tp;
  const fp = metrics.fpByThreshold?.[iouThreshold] ?? metrics.fp;
  const fn = metrics.fnByThreshold?.[iouThreshold] ?? metrics.fn;
  const precision = metrics.precisionByThreshold?.[iouThreshold] ?? metrics.precision;
  const recall = metrics.recallByThreshold?.[iouThreshold] ?? metrics.recall;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">評価指標 (Metrics)</h3>
        <button onClick={onCalculate}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold shadow-sm">
          mAP を計算
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label="mAP@50:95" value={pct(metrics.map5095)} color="indigo" />
        <MetricCard label="mAP@50" value={pct(metrics.map50)} color="blue" />
        <MetricCard label="mAP@75" value={pct(metrics.map75)} color="purple" />
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-bold text-gray-700">IoU 閾値</span>
          <select
            value={iouThreshold}
            onChange={e => onIouThresholdChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 bg-white font-mono"
          >
            {EVAL_THRESHOLDS.map(t => (
              <option key={t} value={t.toFixed(2)}>{t.toFixed(2)}</option>
            ))}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {['0.50', '0.75'].map(t => (
              <button key={t} onClick={() => onIouThresholdChange(t)}
                className={`text-sm px-3 py-1.5 rounded-md font-mono transition-all font-medium
                  ${iouThreshold === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatusBadge label="TP" value={tp} color="blue" />
          <StatusBadge label="FP" value={fp} color="red" />
          <StatusBadge label="FN" value={fn} color="yellow" />
          <MetricCard label="Precision" value={pct(precision)} color="green" />
          <MetricCard label="Recall" value={pct(recall)} color="green" />
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm text-gray-500 font-bold mb-3">各IoU閾値のmAP</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2">
          {EVAL_THRESHOLDS.map(t => {
            const key = t.toFixed(2);
            return (
              <div key={key} className="flex justify-between text-sm bg-white px-3 py-1.5 rounded-md border border-gray-200">
                <span className="text-gray-500">IoU {key}</span>
                <span className="font-mono font-semibold text-gray-700">{pct(metrics.mapByThreshold[key] ?? 0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'indigo' | 'blue' | 'green' | 'purple' }) {
  const s = { 
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    blue: 'bg-blue-50 text-blue-700 border border-blue-100', 
    green: 'bg-green-50 text-green-700 border border-green-100', 
    purple: 'bg-purple-50 text-purple-700 border border-purple-100' 
  };
  return (
    <div className={`rounded-lg p-3 text-center shadow-sm ${s[color]}`}>
      <div className="text-xs font-bold opacity-70 mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: number; color: 'blue' | 'red' | 'yellow' }) {
  const s = { 
    blue: 'bg-blue-50 text-blue-800 border border-blue-200', 
    red: 'bg-red-50 text-red-800 border border-red-200', 
    yellow: 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
  };
  return (
    <div className={`rounded-lg py-3 text-center shadow-sm ${s[color]}`}>
      <div className="text-xs font-bold opacity-70 mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-extrabold leading-none">{value}</div>
    </div>
  );
}
