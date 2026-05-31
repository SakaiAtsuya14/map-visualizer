import { MetricsResult, EVAL_THRESHOLDS } from '../utils/metrics';

interface Props {
  metrics: MetricsResult;
  onCalculate: () => void;
}

export default function MetricsPanel({ metrics, onCalculate }: Props) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">評価指標 (Metrics)</h3>
        <button onClick={onCalculate}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold shadow-sm">
          mAP を計算
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 bg-indigo-50 rounded-xl p-4 text-center flex flex-col justify-center">
          <div className="text-sm text-indigo-500 font-bold uppercase tracking-wide mb-1">mAP@50:95</div>
          <div className="text-3xl font-extrabold text-indigo-700">{pct(metrics.map5095)}</div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2">
          <MetricCard label="mAP@50" value={pct(metrics.map50)} color="blue" />
          <MetricCard label="mAP@75" value={pct(metrics.map75)} color="purple" />
          <MetricCard label="Precision" value={pct(metrics.precision)} color="green" />
          <MetricCard label="Recall" value={pct(metrics.recall)} color="green" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500 font-bold mb-3">各IoU閾値のmAP</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {EVAL_THRESHOLDS.map(t => {
              const key = t.toFixed(2);
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-500">IoU {key}</span>
                  <span className="font-mono font-semibold text-gray-700">{pct(metrics.mapByThreshold[key] ?? 0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <StatusBadge label="TP" value={metrics.tp} color="blue" />
            <StatusBadge label="FP" value={metrics.fp} color="red" />
            <StatusBadge label="FN" value={metrics.fn} color="yellow" />
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">Precision / Recall / TP / FP / FN は IoU=0.50</p>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'purple' }) {
  const s = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', purple: 'bg-purple-50 text-purple-700' };
  return (
    <div className={`rounded-lg p-2.5 text-center ${s[color]}`}>
      <div className="text-xs font-semibold opacity-70 mb-0.5">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: number; color: 'blue' | 'red' | 'yellow' }) {
  const s = { blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800' };
  return (
    <div className={`rounded-lg py-2 text-center ${s[color]}`}>
      <div className="text-xs font-semibold opacity-70 mb-0.5">{label}</div>
      <div className="text-xl font-bold leading-none">{value}</div>
    </div>
  );
}
