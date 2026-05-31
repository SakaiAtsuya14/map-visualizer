import { useRef, useState, useCallback } from 'react';
import type { BoundingBox, AppMode, ClassDef, LabelDisplaySettings } from '../types';


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
  bgImageName: string | null;
  gtFileName: string | null;
  predictFileName: string | null;
  selectedBoxId: string | null;
  gtBoxes: BoundingBox[];
  onDeleteGT: (id: string) => void;
  predictBoxes: BoundingBox[];
  onUpdateBox: (id: string, updates: Partial<BoundingBox>) => void;
  onConvertBox: (id: string) => void;
  labelDisplay: LabelDisplaySettings;
  onLabelDisplayChange: (ld: LabelDisplaySettings) => void;
}

type Tab = 'draw' | 'data';

function DropZone({
  accept, onFile, label, colorScheme,
}: {
  accept: string;
  onFile: (file: File) => void;
  label: string;
  colorScheme: 'indigo' | 'green' | 'red';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const [over, setOver] = useState(false);

  const colors = {
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:border-indigo-400 hover:text-indigo-600' },
    green:  { border: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-600',  hover: 'hover:border-green-400 hover:text-green-600' },
    red:    { border: 'border-red-400',    bg: 'bg-red-50',    text: 'text-red-600',    hover: 'hover:border-red-400 hover:text-red-600' },
  }[colorScheme];

  const handle = useCallback((file: File) => { onFile(file); }, [onFile]);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); counter.current++; setOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); counter.current--; if (counter.current === 0) setOver(false);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); counter.current = 0; setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handle(file);
  };

  return (
    <div
      className={`w-full py-2 px-3 text-xs border border-dashed rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 select-none
        ${over ? `${colors.border} ${colors.bg} ${colors.text}` : `border-gray-300 text-gray-500 ${colors.hover}`}`}
      onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { handle(f); e.target.value = ''; } }} />
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {over ? 'ドロップして読み込む' : label}
    </div>
  );
}

export default function Sidebar({
  mode, onModeChange, classes, onAddClass, onUpdateClass, onDeleteClass,
  currentClassId, onCurrentClassChange, currentConfidence, onCurrentConfidenceChange,
  onImageUpload, onUploadBoxes, bgImageName, gtFileName, predictFileName,
  selectedBoxId, gtBoxes, onDeleteGT, predictBoxes, onUpdateBox, onConvertBox,
  labelDisplay, onLabelDisplayChange,
}: Props) {
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

  const handleBoxFile = useCallback(async (file: File, type: 'gt' | 'predict') => {
    setUploadError(null);
    try {
      await onUploadBoxes(file, type);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '読み込みエラー');
    }
  }, [onUploadBoxes]);

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

  return (
    <div className="flex flex-col gap-3">

      {/* Tab bar */}
      <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm p-1 gap-0.5">
        {([
          { id: 'draw' as Tab, label: '描画', icon: '✏️' },
          { id: 'data' as Tab, label: 'クラス / ファイル', icon: '📁' },
        ]).map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'}`}>
            <span className="mr-1">{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* ── 描画タブ ── */}
      {activeTab === 'draw' && (
        <>
          {/* Mode */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">描画モード</h3>
            <div className="grid grid-cols-3 gap-1">
              {([
                { v: 'select',      label: '選択',    icon: '↖' },
                { v: 'gt-add',      label: 'GT追加',  icon: '+' },
                { v: 'predict-add', label: 'Predict', icon: '+' },
              ] as { v: AppMode; label: string; icon: string }[]).map(({ v, label, icon }) => (
                <button key={v} onClick={() => onModeChange(v)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all border
                    ${mode === v
                      ? v === 'gt-add'       ? 'bg-green-50 border-green-400 text-green-700'
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
                {classes.length === 0 && (
                  <span className="text-xs text-gray-400">クラスを追加してください</span>
                )}
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
        </>
      )}

      {/* ── データタブ ── */}
      {activeTab === 'data' && (
        <>
          {/* Class management */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">クラス管理</h3>
            <div className="space-y-1 mb-2 max-h-52 overflow-y-auto">
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
                <p className="text-xs text-gray-400 text-center py-2">クラスを追加してください</p>
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
            <DropZone accept="image/*" colorScheme="indigo" label="画像をアップロード / ドラッグ＆ドロップ"
              onFile={onImageUpload} />
            {bgImageName && <p className="text-[10px] text-gray-500 mt-1 mb-2 truncate" title={bgImageName}>📄 {bgImageName}</p>}
            <p className="text-xs text-gray-400 mt-3 mb-1">アノテーション / 予測結果</p>
            <p className="text-[10px] text-gray-400 mb-1.5">YOLO .txt　/ COCO .json　/ Pascal VOC .xml</p>
            <div className="flex flex-col gap-1.5">
              <div>
                <DropZone accept=".txt,.json,.xml" colorScheme="green" label="GT 読み込み / ドラッグ＆ドロップ"
                  onFile={f => handleBoxFile(f, 'gt')} />
                {gtFileName && <p className="text-[10px] text-gray-500 mt-1 truncate" title={gtFileName}>📄 {gtFileName}</p>}
              </div>
              <div className="mt-1">
                <DropZone accept=".txt,.json,.xml" colorScheme="red" label="Predict 読み込み / ドラッグ＆ドロップ"
                  onFile={f => handleBoxFile(f, 'predict')} />
                {predictFileName && <p className="text-[10px] text-gray-500 mt-1 truncate" title={predictFileName}>📄 {predictFileName}</p>}
              </div>
            </div>
            {uploadError && (
              <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded px-2 py-1">{uploadError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">※ 読み込むと既存ボックスは置換されます</p>
          </section>
        </>
      )}

    </div>
  );
}

export { CLASS_COLORS };
