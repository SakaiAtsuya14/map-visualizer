import { MetricsResult, EVAL_THRESHOLDS } from '../utils/metrics';

interface Props {
  metrics: MetricsResult;
  onCalculate: () => void;
  iouThreshold: string;
  onIouThresholdChange: (threshold: string) => void;
  evalMethod: 'voc' | 'coco';
  onEvalMethodChange: (method: 'voc' | 'coco') => void;
}

export default function MetricsPanel({ metrics, onCalculate, iouThreshold, onIouThresholdChange, evalMethod, onEvalMethodChange }: Props) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  // Get threshold-specific metrics
  const tp = metrics.tpByThreshold?.[iouThreshold] ?? metrics.tp;
  const fp = metrics.fpByThreshold?.[iouThreshold] ?? metrics.fp;
  const fn = metrics.fnByThreshold?.[iouThreshold] ?? metrics.fn;
  const precision = metrics.precisionByThreshold?.[iouThreshold] ?? metrics.precision;
  const recall = metrics.recallByThreshold?.[iouThreshold] ?? metrics.recall;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">評価指標 (Metrics)</h3>
        <div className="flex gap-2">
          <select 
            value={evalMethod} 
            onChange={e => onEvalMethodChange(e.target.value as 'voc' | 'coco')}
            className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-gray-50 cursor-pointer"
            title="mAPの計算アルゴリズム (VOC=AUC, COCO=101点補間)"
          >
            <option value="voc">VOC (AUC)</option>
            <option value="coco">COCO (101-point)</option>
          </select>
          <button onClick={onCalculate}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold shadow-sm">
            mAP を計算
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
        {/* mAPs */}
        <div className="flex gap-2">
          <CompactMetric label="mAP@50:95" value={pct(metrics.map5095)} color="indigo" />
          <CompactMetric label="mAP@50" value={pct(metrics.map50)} color="blue" />
          <CompactMetric label="mAP@75" value={pct(metrics.map75)} color="purple" />
        </div>

        {/* Threshold & dynamic metrics */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
          <span className="text-xs font-bold text-gray-600 ml-1">IoU 閾値:</span>
          <select
            value={iouThreshold}
            onChange={e => onIouThresholdChange(e.target.value)}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 outline-none focus:border-indigo-400 bg-white font-mono cursor-pointer"
          >
            {EVAL_THRESHOLDS.map(t => (
              <option key={t} value={t.toFixed(2)}>{t.toFixed(2)}</option>
            ))}
          </select>
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          <div className="flex flex-wrap gap-1.5">
            <CompactMetric label="TP" value={tp} color="blue" />
            <CompactMetric label="FP" value={fp} color="red" />
            <CompactMetric label="FN" value={fn} color="yellow" />
            <CompactMetric label="Precision" value={pct(precision)} color="green" />
            <CompactMetric label="Recall" value={pct(recall)} color="green" />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 font-bold mb-2">各IoU閾値のmAP</p>
        <div className="flex flex-wrap gap-2">
          {EVAL_THRESHOLDS.map(t => {
            const key = t.toFixed(2);
            return (
              <div key={key} className="flex items-center gap-2 text-xs bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
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

function CompactMetric({ label, value, color }: { label: string; value: string | number; color: 'indigo' | 'blue' | 'green' | 'purple' | 'red' | 'yellow' }) {
  const s = { 
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200', 
    green: 'bg-green-50 text-green-700 border-green-200', 
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200' 
  };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border shadow-sm ${s[color]}`}>
      <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-extrabold">{value}</span>
    </div>
  );
}
