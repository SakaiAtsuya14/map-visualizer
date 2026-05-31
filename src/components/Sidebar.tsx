import { useRef, useState } from 'react';
import type { BoundingBox, AppMode, ClassDef, LabelDisplaySettings } from '../types';
import type { MetricsResult } from '../utils/metrics';
import { EVAL_THRESHOLDS } from '../utils/metrics';

const CLASS_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#ec4899','#8b5cf6','#14b8a6','#84cc16',
];

interface Props {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  classes: ClassDef[];
  onAddClass: (classId: number, name: string) => void;
  onUpdateClass: (id: string, updates: Partial<Pick<ClassDef, 'classId' | 'name' | 'color'>>) => void;
  onDeleteClass: (id: string) => void;
  currentClassId: string;
  onCurrentClassChange: (id: string) => void;
  currentConfidence: number;
  onCurrentConfidenceChange: (v: number) => void;
  onImageUpload: (f: File) => void;
  onUploadBoxes: (file: File, type: 'gt' | 'predict') => void;
  selectedBoxId: string | null;
  gtBoxes: BoundingBox[];
  onDeleteGT: (id: string) => void;
  predictBoxes: BoundingBox[];
  onDeletePredict: (id: string) => void;
  onUpdateBox: (id: string, updates: Partial<BoundingBox>) => void;
  onConvertBox: (id: string) => void;
  labelDisplay: LabelDisplaySettings;
  onLabelDisplayChange: (ld: LabelDisplaySettings) => void;
  metrics: MetricsResult;
  onCalculate: () => void;
}

type Tab = 'draw' | 'data' | 'eval';

export default function Sidebar({
  mode, onModeChange, classes, onAddClass, onUpdateClass, onDeleteClass,
  currentClassId, onCurrentClassChange, currentConfidence, onCurrentConfidenceChange,
  onImageUpload, onUploadBoxes,
  selectedBoxId, gtBoxes, onDeleteGT, predictBoxes, onDeletePredict, onUpdateBox, onConvertBox,
  labelDisplay, onLabelDisplayChange,
  metrics, onCalculate,
}: Props) {
  const imageRef = useRef<HTMLInputElement>(null);
  const gtFileRef = useRef<HTMLInputElement>(null);
  const predFileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('draw');
  const [newClassNum, setNewClassNum] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const nextAutoId = classes.length > 0 ? Math.max(...classes.map(c => c.classId)) + 1 : 0;

  const handleAddClass = () => {
    const classId = newClassNum !== '' ? parseInt(newClassNum) : nextAutoId;
    if (isNaN(classId)) return;
    onAddClass(classId, newClassName.trim());
    setNewClassNum('');
    setNewClassName('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gt' | 'predict') => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError(null);
    try {
      await onUploadBoxes(f, type);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '読み込みエラー');
    }
    e.target.value = '';
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const isDrawMode = mode === 'gt-add' || mode === 'predict-add';
  const clampConf = (v: number) => Math.max(0.01, Math.min(1.0, v));

  const selectedBox = selectedBoxId
    ? [...gtBoxes, ...predictBoxes].find(b => b.id === selectedBoxId)
    : null;

  const ClassSelect = ({ box }: { box: BoundingBox }) => (
    <select value={box.classId ?? ''} onChange={e => onUpdateBox(box.id, {
      classId: e.target.value || undefined,
      label: classes.find(c => c.id === e.target.value)?.name ?? box.label,
    })} className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
      <option value="">未設定</option>
      {classes.map(cls => (
        <option key={cls.id} value={cls.id}>
          {cls.classId}: {cls.name || '(名前なし)'}
        </option>
      ))}
    </select>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'draw', label: '描画', icon: '✏️' },
    { id: 'data', label: 'データ', icon: '📁' },
    { id: 'eval', label: '評価', icon: '📊' },
  ];

  return (
    <div className="flex flex-col gap-0">

      {/* Tab bar */}
      <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-3 gap-0.5">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'}`}>
            <span className="mr-1">{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: 描画 ── */}
      {activeTab === 'draw' && (
        <div className="flex flex-col gap-3">

          {/* Mode */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">描画モード</h3>
            <div className="grid grid-cols-3 gap-1">
              {([
                { v: 'select',      label: '選択',   icon: '↖' },
                { v: 'gt-add',      label: 'GT追加', icon: '+' },
                { v: 'predict-add', label: 'Predict', icon: '+' },
              ] as { v: AppMode; label: string; icon: string }[]).map(({ v, label, icon }) => (
                <button key={v} onClick={() => onModeChange(v)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all border
                    ${mode === v
                      ? v === 'gt-add'      ? 'bg-green-50 border-green-400 text-green-700'
                        : v === 'predict-add' ? 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-indigo-50 border-indigo-400 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  <span className="text-base leading-none mb-0.5">{icon}</span>{label}
                </button>
              ))}
            </div>
          </section>

          {/* Label display */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ラベル表示</h3>
            <div className="flex gap-3 flex-wrap">
              {([
                { key: 'showClassId',    label: 'クラスID' },
                { key: 'showName',       label: 'クラス名' },
                { key: 'showConfidence', label: '信頼度' },
              ] as { key: keyof LabelDisplaySettings; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={labelDisplay[key]}
                    onChange={e => onLabelDisplayChange({ ...labelDisplay, [key]: e.target.checked })}
                    className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* Drawing settings (draw mode only) */}
          {isDrawMode && (
            <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">描画設定</h3>
              <p className="text-xs text-gray-400 mb-1.5">クラス</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {classes.map(cls => (
                  <button key={cls.id} onClick={() => onCurrentClassChange(cls.id)}
                    style={{
                      borderColor: cls.color,
                      backgroundColor: currentClassId === cls.id ? cls.color : 'transparent',
                      color: currentClassId === cls.id ? 'white' : cls.color,
                    }}
                    className="text-xs px-2 py-1 rounded border font-semibold transition-all">
                    {cls.classId}{cls.name ? `: ${cls.name}` : ''}
                  </button>
                ))}
                {classes.length === 0 && <span className="text-xs text-gray-400">クラスを追加してください</span>}
              </div>
              {mode === 'predict-add' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">信頼度 (Confidence)</p>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.01" max="1.0" step="0.01"
                      value={currentConfidence}
                      onChange={e => onCurrentConfidenceChange(Number(e.target.value))}
                      className="flex-1" />
                    <input type="number" min="0.01" max="1.0" step="0.01"
                      value={currentConfidence.toFixed(2)}
                      onChange={e => onCurrentConfidenceChange(clampConf(Number(e.target.value)))}
                      className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 text-right font-mono" />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Selected box panel */}
          {selectedBox && (
            <section className="bg-white rounded-xl border-2 border-amber-400 p-3 shadow-sm">
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                選択中: {selectedBox.type === 'predict' ? 'Predict' : 'GT'} ボックス
              </h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-gray-500 mb-1">クラス</p>
                  <ClassSelect box={selectedBox} />
                </div>
                {selectedBox.type === 'predict' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">信頼度 (Confidence)</p>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.01" max="1.0" step="0.01"
                        value={selectedBox.confidence ?? 1}
                        onChange={e => onUpdateBox(selectedBox.id, { confidence: clampConf(Number(e.target.value)) })}
                        className="flex-1" />
                      <input type="number" min="0.01" max="1.0" step="0.01"
                        value={(selectedBox.confidence ?? 1).toFixed(2)}
                        onChange={e => onUpdateBox(selectedBox.id, { confidence: clampConf(Number(e.target.value)) })}
                        className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 text-right font-mono" />
                    </div>
                  </div>
                )}
                <div className="flex gap-1.5 pt-0.5">
                  <button onClick={() => onConvertBox(selectedBox.id)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all
                      ${selectedBox.type === 'gt'
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                    {selectedBox.type === 'gt' ? '→ Predict に変換' : '→ GT に変換'}
                  </button>
                  <button onClick={() => onDeleteGT(selectedBox.id)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-gray-300 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all">
                    削除
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── TAB 2: データ ── */}
      {activeTab === 'data' && (
        <div className="flex flex-col gap-3">

          {/* Class management */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">クラス管理</h3>
            <div className="space-y-1 mb-2 max-h-44 overflow-y-auto">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-gray-50">
                  <input type="color" value={cls.color}
                    onChange={e => onUpdateClass(cls.id, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-gray-300 p-0 shrink-0"
                    title="色を変更" />
                  <input type="number" value={cls.classId} min={0}
                    onChange={e => onUpdateClass(cls.id, { classId: parseInt(e.target.value) || 0 })}
                    className="w-10 text-xs border border-gray-200 rounded px-1 py-0.5 font-mono text-center"
                    title="クラスID" />
                  <input type="text" value={cls.name}
                    onChange={e => onUpdateClass(cls.id, { name: e.target.value })}
                    placeholder="名前（任意）"
                    className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400" />
                  <button onClick={() => onDeleteClass(cls.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0">✕</button>
                </div>
              ))}
              {classes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-1">クラスを追加してください</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <input type="number" min={0} value={newClassNum}
                onChange={e => setNewClassNum(e.target.value)}
                placeholder={String(nextAutoId)} title="クラスID"
                className="w-12 text-xs border border-gray-200 rounded px-1.5 py-1.5 font-mono text-center outline-none focus:border-indigo-400" />
              <input type="text" value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                placeholder="名前（任意）"
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400" />
              <button onClick={handleAddClass}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition">追加</button>
            </div>
          </section>

          {/* File input */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ファイル入力</h3>
            <p className="text-xs text-gray-400 mb-1">背景画像</p>
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
            <button onClick={() => imageRef.current?.click()}
              className="w-full py-1.5 mb-3 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition">
              画像をアップロード
            </button>

            <p className="text-xs text-gray-400 mb-1">アノテーション / 予測結果</p>
            <p className="text-xs text-gray-400 mb-1.5">YOLO .txt　/ COCO .json　/ Pascal VOC .xml</p>
            <input ref={gtFileRef} type="file" accept=".txt,.json,.xml" className="hidden"
              onChange={e => handleFileUpload(e, 'gt')} />
            <input ref={predFileRef} type="file" accept=".txt,.json,.xml" className="hidden"
              onChange={e => handleFileUpload(e, 'predict')} />
            <div className="flex gap-1.5">
              <button onClick={() => gtFileRef.current?.click()}
                className="flex-1 py-1.5 text-xs text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition font-medium">
                GT 読み込み
              </button>
              <button onClick={() => predFileRef.current?.click()}
                className="flex-1 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition font-medium">
                Predict 読み込み
              </button>
            </div>
            {uploadError && (
              <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded px-2 py-1">{uploadError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">※ 読み込むと既存ボックスは置換されます</p>
          </section>

          {/* GT boxes list */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              GT ボックス（{gtBoxes.length}個）
            </h3>
            {gtBoxes.length === 0
              ? <p className="text-xs text-gray-400 text-center py-2">GT追加モードで描画 / ファイル読み込み</p>
              : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {gtBoxes.map((box, i) => (
                    <div key={box.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-green-50 rounded-lg border border-green-100">
                      <span className="text-xs text-green-600 font-bold w-5 shrink-0">#{i + 1}</span>
                      <ClassSelect box={box} />
                      <button onClick={() => onDeleteGT(box.id)} className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
          </section>

          {/* Predict boxes list */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Predict ボックス（{predictBoxes.length}個）
            </h3>
            {predictBoxes.length === 0
              ? <p className="text-xs text-gray-400 text-center py-2">Predict追加モードで描画 / ファイル読み込み</p>
              : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {predictBoxes.map((box, i) => (
                    <div key={box.id} className="px-2 py-1.5 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-red-500 font-bold w-5 shrink-0">#{i + 1}</span>
                        <ClassSelect box={box} />
                        <button onClick={() => onDeletePredict(box.id)} className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0">✕</button>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <input type="range" min="0.01" max="1.0" step="0.01"
                          value={box.confidence ?? 1}
                          onChange={e => onUpdateBox(box.id, { confidence: clampConf(Number(e.target.value)) })}
                          className="flex-1" />
                        <input type="number" min="0.01" max="1.0" step="0.01"
                          value={(box.confidence ?? 1).toFixed(2)}
                          onChange={e => onUpdateBox(box.id, { confidence: clampConf(Number(e.target.value)) })}
                          className="w-16 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        </div>
      )}

      {/* ── TAB 3: 評価 ── */}
      {activeTab === 'eval' && (
        <div className="flex flex-col gap-3">
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">評価指標</h3>
              <button onClick={onCalculate}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold shadow-sm">
                mAP を計算
              </button>
            </div>

            <div className="bg-indigo-50 rounded-lg p-2.5 text-center mb-2">
              <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">mAP@50:95</div>
              <div className="text-2xl font-bold text-indigo-700">{pct(metrics.map5095)}</div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <MetricCard label="mAP@50" value={pct(metrics.map50)} color="blue" />
              <MetricCard label="mAP@75" value={pct(metrics.map75)} color="purple" />
            </div>

            <div className="bg-gray-50 rounded-lg p-2 mb-2">
              <p className="text-xs text-gray-400 font-semibold mb-1.5">各IoU閾値のmAP</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {EVAL_THRESHOLDS.map(t => {
                  const key = t.toFixed(2);
                  return (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500">IoU {key}</span>
                      <span className="font-mono font-semibold text-gray-700">{pct(metrics.mapByThreshold[key] ?? 0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <MetricCard label="Precision" value={pct(metrics.precision)} color="green" />
              <MetricCard label="Recall" value={pct(metrics.recall)} color="green" />
            </div>

            <div className="grid grid-cols-3 gap-1 text-center">
              <StatusBadge label="TP" value={metrics.tp} color="blue" />
              <StatusBadge label="FP" value={metrics.fp} color="red" />
              <StatusBadge label="FN" value={metrics.fn} color="yellow" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">Precision / Recall / TP / FP / FN は IoU=0.50</p>
          </section>
        </div>
      )}
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
