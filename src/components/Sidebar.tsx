import { useRef, useState } from 'react';
import type { BoundingBox, AppMode, SamplePreset, ClassDef } from '../types';
import type { MetricsResult } from '../utils/metrics';

const CLASS_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#ec4899','#8b5cf6','#14b8a6','#84cc16',
];

interface Props {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  classes: ClassDef[];
  onAddClass: (name: string) => void;
  onDeleteClass: (id: string) => void;
  currentClassId: string;
  onCurrentClassChange: (id: string) => void;
  currentConfidence: number;
  onCurrentConfidenceChange: (v: number) => void;
  presets: SamplePreset[];
  selectedPresetId: string | null;
  onPresetSelect: (id: string) => void;
  onImageUpload: (f: File) => void;
  iouThreshold: number;
  onIouThresholdChange: (v: number) => void;
  gtBoxes: BoundingBox[];
  onDeleteGT: (id: string) => void;
  predictBoxes: BoundingBox[];
  onConfidenceChange: (id: string, v: number) => void;
  onDeletePredict: (id: string) => void;
  onUpdateBox: (id: string, updates: Partial<BoundingBox>) => void;
  metrics: MetricsResult;
}

export default function Sidebar({
  mode, onModeChange, classes, onAddClass, onDeleteClass,
  currentClassId, onCurrentClassChange, currentConfidence, onCurrentConfidenceChange,
  presets, selectedPresetId, onPresetSelect, onImageUpload,
  iouThreshold, onIouThresholdChange,
  gtBoxes, onDeleteGT, predictBoxes, onConfidenceChange, onDeletePredict, onUpdateBox,
  metrics,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [newClassName, setNewClassName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onImageUpload(f);
  };

  const handleAddClass = () => {
    const name = newClassName.trim();
    if (!name) return;
    onAddClass(name);
    setNewClassName('');
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const isDrawMode = mode === 'gt-add' || mode === 'predict-add';

  const ClassSelector = ({ box }: { box: BoundingBox }) => (
    <select
      value={box.classId ?? ''}
      onChange={e => onUpdateBox(box.id, {
        classId: e.target.value || undefined,
        label: classes.find(c => c.id === e.target.value)?.name ?? box.label,
      })}
      className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
    >
      <option value="">未設定</option>
      {classes.map(cls => (
        <option key={cls.id} value={cls.id}>{cls.name}</option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* Mode */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">描画モード</h3>
        <div className="grid grid-cols-3 gap-1">
          {([
            { v: 'select', label: '選択', icon: '↖' },
            { v: 'gt-add', label: 'GT追加', icon: '+' },
            { v: 'predict-add', label: 'Predict追加', icon: '+' },
          ] as { v: AppMode; label: string; icon: string }[]).map(({ v, label, icon }) => (
            <button key={v} onClick={() => onModeChange(v)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all border
                ${mode === v
                  ? v === 'gt-add' ? 'bg-green-50 border-green-400 text-green-700'
                    : v === 'predict-add' ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-indigo-50 border-indigo-400 text-indigo-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="text-base leading-none mb-0.5">{icon}</span>{label}
            </button>
          ))}
        </div>
      </section>

      {/* Class Management */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">クラス管理</h3>
        <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
          {classes.map(cls => (
            <div key={cls.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50">
              <span className="w-3 h-3 rounded-sm shrink-0 border border-white shadow-sm" style={{ background: cls.color }} />
              <span className="text-xs flex-1 font-medium text-gray-700">{cls.name}</span>
              <button onClick={() => onDeleteClass(cls.id)}
                className="text-gray-300 hover:text-red-500 transition-colors text-xs leading-none">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text" placeholder="クラス名を入力"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddClass()}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400"
          />
          <button onClick={handleAddClass}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition">
            追加
          </button>
        </div>
      </section>

      {/* Drawing settings (class + confidence) */}
      {isDrawMode && (
        <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">描画設定</h3>
          <p className="text-xs text-gray-400 mb-1.5">次に描くボックスのクラス</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {classes.map(cls => (
              <button key={cls.id} onClick={() => onCurrentClassChange(cls.id)}
                style={{
                  borderColor: cls.color,
                  backgroundColor: currentClassId === cls.id ? cls.color : 'transparent',
                  color: currentClassId === cls.id ? 'white' : cls.color,
                }}
                className="text-xs px-2 py-1 rounded border font-semibold transition-all">
                {cls.name}
              </button>
            ))}
            {classes.length === 0 && <span className="text-xs text-gray-400">クラスを追加してください</span>}
          </div>
          {mode === 'predict-add' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Confidence</span>
                <span className="font-mono font-semibold text-red-600">{currentConfidence.toFixed(2)}</span>
              </div>
              <input type="range" min="0.01" max="1.0" step="0.01"
                value={currentConfidence}
                onChange={e => onCurrentConfidenceChange(Number(e.target.value))}
                className="w-full" />
            </div>
          )}
        </section>
      )}

      {/* Sample scenes */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">サンプルシーン</h3>
        <div className="flex flex-col gap-1">
          {presets.map(p => (
            <button key={p.id} onClick={() => onPresetSelect(p.id)}
              className={`text-left px-3 py-2 rounded-lg text-xs border transition-all font-medium ${
                selectedPresetId === p.id
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="mt-2 border-t border-gray-100 pt-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition">
            画像をアップロード
          </button>
        </div>
      </section>

      {/* IoU Threshold */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">IoU 閾値</h3>
        <div className="flex items-center gap-2">
          <input type="range" min="0.1" max="0.9" step="0.05"
            value={iouThreshold} onChange={e => onIouThresholdChange(Number(e.target.value))}
            className="flex-1" />
          <span className="text-sm font-mono font-bold text-indigo-600 w-12 text-right">
            {iouThreshold.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">IoU ≥ この値 → TP と判定</p>
      </section>

      {/* GT box list */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          GT ボックス（{gtBoxes.length}個）
        </h3>
        {gtBoxes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">「GT追加」モードで描画</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {gtBoxes.map((box, i) => (
              <div key={box.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-green-50 rounded-lg border border-green-100">
                <span className="text-xs text-green-600 font-bold w-5 shrink-0">#{i+1}</span>
                <ClassSelector box={box} />
                <button onClick={() => onDeleteGT(box.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Predict box list */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Predict ボックス（{predictBoxes.length}個）
        </h3>
        {predictBoxes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">「Predict追加」モードで描画</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
            {[...predictBoxes].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1)).map((box, i) => (
              <div key={box.id} className="px-2 py-1.5 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-red-500 font-bold w-5 shrink-0">#{i+1}</span>
                  <ClassSelector box={box} />
                  <button onClick={() => onDeletePredict(box.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0">✕</button>
                </div>
                <div className="flex items-center gap-2 pl-5">
                  <input type="range" min="0.01" max="1.0" step="0.01"
                    value={box.confidence ?? 1}
                    onChange={e => onConfidenceChange(box.id, Number(e.target.value))}
                    className="flex-1" />
                  <span className="text-xs font-mono font-bold text-red-600 w-9 text-right">
                    {(box.confidence ?? 1).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Metrics */}
      <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">評価指標</h3>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <MetricCard label="Precision" value={pct(metrics.precision)} color="blue" />
          <MetricCard label="Recall" value={pct(metrics.recall)} color="green" />
          <MetricCard label="AP" value={pct(metrics.ap)} color="purple" />
        </div>
        <div className="bg-indigo-50 rounded-lg p-2.5 text-center mb-2">
          <div className="text-xs text-indigo-500 font-semibold uppercase">mAP</div>
          <div className="text-2xl font-bold text-indigo-700">{pct(metrics.mAP)}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <StatusBadge label="TP" value={metrics.tp} color="blue" />
          <StatusBadge label="FP" value={metrics.fp} color="red" />
          <StatusBadge label="FN" value={metrics.fn} color="yellow" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'purple' }) {
  const s = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', purple: 'bg-purple-50 text-purple-700' };
  return (
    <div className={`rounded-lg p-2 text-center ${s[color]}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: number; color: 'blue' | 'red' | 'yellow' }) {
  const s = { blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800' };
  return (
    <div className={`rounded-md py-1.5 text-center ${s[color]}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
    </div>
  );
}

export { CLASS_COLORS };
