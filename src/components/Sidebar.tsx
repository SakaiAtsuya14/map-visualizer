import { useRef } from 'react';
import type { BoundingBox, AppMode, SamplePreset } from '../types';
import type { MetricsResult } from '../utils/metrics';

interface Props {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  presets: SamplePreset[];
  selectedPresetId: string | null;
  onPresetSelect: (id: string) => void;
  onImageUpload: (f: File) => void;
  iouThreshold: number;
  onIouThresholdChange: (v: number) => void;
  predictBoxes: BoundingBox[];
  onConfidenceChange: (id: string, v: number) => void;
  onDeletePredict: (id: string) => void;
  metrics: MetricsResult;
}

export default function Sidebar({
  mode, onModeChange, presets, selectedPresetId, onPresetSelect,
  onImageUpload, iouThreshold, onIouThresholdChange,
  predictBoxes, onConfidenceChange, onDeletePredict, metrics,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onImageUpload(f);
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-4">

      {/* Mode */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">描画モード</h3>
        <div className="grid grid-cols-3 gap-1">
          {([
            { v: 'select', label: '選択', icon: '↖' },
            { v: 'gt-add', label: 'GT追加', icon: '＋' },
            { v: 'predict-add', label: 'Predict追加', icon: '＋' },
          ] as { v: AppMode; label: string; icon: string }[]).map(({ v, label, icon }) => (
            <button
              key={v}
              onClick={() => onModeChange(v)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all border
                ${mode === v
                  ? v === 'gt-add'
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : v === 'predict-add'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-indigo-50 border-indigo-400 text-indigo-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <span className="text-base leading-none mb-0.5">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Presets & Upload */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">サンプルシーン</h3>
        <div className="flex flex-col gap-1.5">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p.id)}
              className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                selectedPresetId === p.id
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              <span className="block text-gray-400 mt-0.5 leading-snug">{p.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-2 text-xs text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-all"
          >
            画像をアップロード
          </button>
        </div>
      </section>

      {/* IoU Threshold */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">IoU 閾値</h3>
        <div className="flex items-center gap-3">
          <input
            type="range" min="0.1" max="0.9" step="0.05"
            value={iouThreshold}
            onChange={e => onIouThresholdChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono font-semibold text-indigo-600 w-12 text-right">
            {iouThreshold.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">IoU ≥ この値 → TP と判定</p>
      </section>

      {/* Predict Boxes */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Predict ボックス（{predictBoxes.length} 個）
        </h3>
        {predictBoxes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            「Predict追加」モードでボックスを描画してください
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {[...predictBoxes]
              .sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1))
              .map((box, i) => (
                <div key={box.id} className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs font-mono text-red-600 font-semibold">
                        {(box.confidence ?? 1).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range" min="0.01" max="1.0" step="0.01"
                      value={box.confidence ?? 1}
                      onChange={e => onConfidenceChange(box.id, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={() => onDeletePredict(box.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm shrink-0"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Metrics */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">評価指標</h3>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricCard label="Precision" value={pct(metrics.precision)} color="blue" />
          <MetricCard label="Recall" value={pct(metrics.recall)} color="green" />
          <MetricCard label="AP" value={pct(metrics.ap)} color="purple" />
        </div>

        <div className="bg-indigo-50 rounded-lg p-3 text-center mb-3">
          <div className="text-xs text-indigo-500 font-semibold uppercase">mAP</div>
          <div className="text-2xl font-bold text-indigo-700">{pct(metrics.mAP)}</div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <StatusBadge label="TP" value={metrics.tp} color="blue" />
          <StatusBadge label="FP" value={metrics.fp} color="red" />
          <StatusBadge label="FN" value={metrics.fn} color="yellow" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'purple' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-lg p-2 text-center ${styles[color]}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: number; color: 'blue' | 'red' | 'yellow' }) {
  const styles = {
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <div className={`rounded-md py-1.5 text-xs font-semibold ${styles[color]}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
    </div>
  );
}
