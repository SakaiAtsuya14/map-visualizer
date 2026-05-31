import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import Canvas from './components/Canvas';
import Sidebar, { CLASS_COLORS } from './components/Sidebar';
import PRCurveChart from './components/PRCurveChart';
import MetricsPanel from './components/MetricsPanel';
import ExplanationSection from './components/ExplanationSection';
import Footer from './components/Footer';
import { BoundingBox, AppMode, ClassDef, LabelDisplaySettings } from './types';
import { calculateMetrics, buildIouMatrix, MetricsResult, EVAL_THRESHOLDS } from './utils/metrics';
import { parseBoxFile } from './utils/fileFormats';


const DEFAULT_CLASSES: ClassDef[] = [
  { id: 'cls-1', classId: 0, name: 'dog',    color: '#f97316' },
  { id: 'cls-2', classId: 1, name: 'cat',    color: '#8b5cf6' },
  { id: 'cls-3', classId: 2, name: 'person', color: '#06b6d4' },
];

function classLabel(cls: ClassDef | undefined): string {
  if (!cls) return '';
  return cls.name || String(cls.classId);
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('predict-add');
  const [gtBoxes, setGtBoxes] = useState<BoundingBox[]>([]);
  const [predictBoxes, setPredictBoxes] = useState<BoundingBox[]>([]);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgImageSize, setBgImageSize] = useState<{ w: number; h: number } | null>(null);
  const [bgImageName, setBgImageName] = useState<string | null>(null);
  const [gtFileName, setGtFileName] = useState<string | null>(null);
  const [predictFileName, setPredictFileName] = useState<string | null>(null);
  const [canvasW, setCanvasW] = useState(880);
  const [canvasH, setCanvasH] = useState(580);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassDef[]>(DEFAULT_CLASSES);
  const [currentClassId, setCurrentClassId] = useState<string>('cls-1');
  const [currentConfidence, setCurrentConfidence] = useState(0.9);
  const [labelDisplay, setLabelDisplay] = useState<LabelDisplaySettings>({
    showClassId: false, showName: true, showConfidence: true,
  });
  const [metrics, setMetrics] = useState<MetricsResult>(() => calculateMetrics([], []));
  const [prThreshold, setPrThreshold] = useState('0.50');

  const handleAddClass = useCallback((classId: number, name: string) => {
    const id = uuidv4();
    const color = CLASS_COLORS[classes.length % CLASS_COLORS.length];
    setClasses(prev => [...prev, { id, classId, name, color }]);
  }, [classes.length]);

  const handleUpdateClass = useCallback((id: string, updates: Partial<Pick<ClassDef, 'classId' | 'name' | 'color'>>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (updates.name !== undefined) {
      const newLabel = updates.name;
      const syncLabel = (b: BoundingBox) => b.classId === id ? { ...b, label: newLabel } : b;
      setGtBoxes(prev => prev.map(syncLabel));
      setPredictBoxes(prev => prev.map(syncLabel));
    }
  }, []);

  const handleDeleteClass = useCallback((id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    if (currentClassId === id) setCurrentClassId('');
    const clearClass = (b: BoundingBox) =>
      b.classId === id ? { ...b, classId: undefined, label: '' } : b;
    setGtBoxes(prev => prev.map(clearClass));
    setPredictBoxes(prev => prev.map(clearClass));
  }, [currentClassId]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setBgImage(dataUrl);
      setBgImageName(file.name);
      const img = new Image();
      img.onload = () => {
        setBgImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        setCanvasW(img.naturalWidth);
        setCanvasH(img.naturalHeight);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadBoxes = useCallback(async (file: File, type: 'gt' | 'predict') => {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const scaleX = bgImageSize ? canvasW / bgImageSize.w : 1;
    const scaleY = bgImageSize ? canvasH / bgImageSize.h : 1;
    
    if (type === 'gt') setGtFileName(file.name);
    else setPredictFileName(file.name);

    // Parse boxes with empty classes to discard existing class definitions
    const newBoxes = parseBoxFile(text, ext, type, [], canvasW, canvasH, scaleX, scaleY);
    
    const nextGt = type === 'gt' ? newBoxes : gtBoxes;
    const nextPredict = type === 'predict' ? newBoxes : predictBoxes;
    
    // Extract unique labels from all current and new boxes
    const uniqueLabels = new Set<string>();
    [...nextGt, ...nextPredict].forEach(b => {
      if (b.label) uniqueLabels.add(b.label);
    });
    
    // Sort logically (numbers first, then alphabetical)
    const sortedLabels = Array.from(uniqueLabels).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    
    // Create new classes
    const newClasses: ClassDef[] = sortedLabels.map((label, i) => {
      // Determine numeric ID if the label is a number (e.g., from YOLO)
      const numLabel = parseInt(label);
      const cId = !isNaN(numLabel) ? numLabel : i;
      return {
        id: uuidv4(),
        classId: cId,
        name: label,
        color: CLASS_COLORS[i % CLASS_COLORS.length]
      };
    });
    
    // Update the boxes to reference the new ClassDef IDs
    const updateBoxes = (bxs: BoundingBox[]) => bxs.map(b => {
      const cls = newClasses.find(c => c.name === b.label);
      return { ...b, classId: cls?.id };
    });
    
    setClasses(newClasses);
    if (newClasses.length > 0 && !newClasses.find(c => c.id === currentClassId)) {
      setCurrentClassId(newClasses[0].id);
    }
    
    setGtBoxes(type === 'gt' ? updateBoxes(newBoxes) : updateBoxes(nextGt));
    setPredictBoxes(type === 'predict' ? updateBoxes(newBoxes) : updateBoxes(nextPredict));
  }, [bgImageSize, gtBoxes, predictBoxes, currentClassId, canvasW, canvasH]);

  const handleAddBox = useCallback((geom: { x: number; y: number; width: number; height: number; type: 'gt' | 'predict' }) => {
    const cls = classes.find(c => c.id === currentClassId);
    const newBox: BoundingBox = {
      id: uuidv4(), ...geom,
      label: classLabel(cls),
      classId: currentClassId || undefined,
      confidence: geom.type === 'predict' ? currentConfidence : undefined,
    };
    if (geom.type === 'gt') setGtBoxes(prev => [...prev, newBox]);
    else setPredictBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  }, [classes, currentClassId, currentConfidence]);

  const handleUpdateBox = useCallback((id: string, updates: Partial<BoundingBox>) => {
    const enriched = updates.classId !== undefined
      ? { ...updates, label: classLabel(classes.find(c => c.id === updates.classId)) }
      : updates;
    setGtBoxes(prev => prev.map(b => b.id === id ? { ...b, ...enriched } : b));
    setPredictBoxes(prev => prev.map(b => b.id === id ? { ...b, ...enriched } : b));
  }, [classes]);

  const handleDeleteBox = useCallback((id: string) => {
    setGtBoxes(prev => prev.filter(b => b.id !== id));
    setPredictBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  }, [selectedBoxId]);

  const handleConvertBox = useCallback((id: string) => {
    const gtBox = gtBoxes.find(b => b.id === id);
    if (gtBox) {
      setGtBoxes(prev => prev.filter(b => b.id !== id));
      setPredictBoxes(prev => [...prev, { ...gtBox, type: 'predict', confidence: currentConfidence }]);
      return;
    }
    const predBox = predictBoxes.find(b => b.id === id);
    if (predBox) {
      setPredictBoxes(prev => prev.filter(b => b.id !== id));
      setGtBoxes(prev => [...prev, { ...predBox, type: 'gt', confidence: undefined }]);
    }
  }, [gtBoxes, predictBoxes, currentConfidence]);

  const liveIouMatrix = useMemo(
    () => buildIouMatrix(gtBoxes, predictBoxes),
    [gtBoxes, predictBoxes],
  );

  const handleCalculate = useCallback(() => {
    setMetrics(calculateMetrics(gtBoxes, predictBoxes));
  }, [gtBoxes, predictBoxes]);

  const prCurve = metrics.prCurveByThreshold[prThreshold] ?? metrics.prCurve;
  const prAP = metrics.mapByThreshold[prThreshold] ?? metrics.map50;

  return (
    <>
      {/* Mobile fallback */}
      <div className="md:hidden flex items-center justify-center min-h-screen bg-indigo-50 p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-indigo-900 mb-2">mAP Visualizer</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            このツールは<strong>PC・タブレットでのご利用を推奨</strong>しています。
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 w-full px-4 py-6">
          <div className="mx-auto w-fit">
            <div className="flex flex-col gap-5">
              {/* Top Row: Canvas & Sidebar */}
              <div className="flex gap-5 items-start">
                <div className="shrink-0" style={{ width: canvasW }}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">キャンバスサイズ:</span>
                      <input type="number" value={canvasW} onChange={e => setCanvasW(Number(e.target.value) || 1)} className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 text-center font-mono focus:border-indigo-400 outline-none" />
                      <span className="text-gray-400 text-xs">×</span>
                      <input type="number" value={canvasH} onChange={e => setCanvasH(Number(e.target.value) || 1)} className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 text-center font-mono focus:border-indigo-400 outline-none" />
                    </div>
                    <Canvas
                      width={canvasW} height={canvasH}
                      gtBoxes={gtBoxes} predictBoxes={predictBoxes}
                      mode={mode} bgColor="#e8eaf6" bgImage={bgImage}
                      iouMatrix={liveIouMatrix}
                      selectedBoxId={selectedBoxId} onSelectBox={setSelectedBoxId}
                      onAddBox={handleAddBox} onUpdateBox={handleUpdateBox} onDeleteBox={handleDeleteBox}
                      classes={classes}
                      labelDisplay={labelDisplay}
                    />
                  </div>
                </div>

                <div 
                  className="w-72 shrink-0 overflow-y-auto" 
                  style={{ maxHeight: canvasH + 32 + 2 + 36 }} // match canvas container height (canvasH + 32px padding + 2px border + ~36px for size inputs)
                >
                  <Sidebar
                    mode={mode} onModeChange={setMode}
                    classes={classes}
                    onAddClass={handleAddClass}
                    onUpdateClass={handleUpdateClass}
                    onDeleteClass={handleDeleteClass}
                    currentClassId={currentClassId} onCurrentClassChange={setCurrentClassId}
                    currentConfidence={currentConfidence} onCurrentConfidenceChange={setCurrentConfidence}
                    onImageUpload={handleImageUpload}
                    onUploadBoxes={handleUploadBoxes}
                    bgImageName={bgImageName} gtFileName={gtFileName} predictFileName={predictFileName}
                    selectedBoxId={selectedBoxId}
                    gtBoxes={gtBoxes} onDeleteGT={handleDeleteBox}
                    predictBoxes={predictBoxes}
                    onUpdateBox={handleUpdateBox}
                    onConvertBox={handleConvertBox}
                    labelDisplay={labelDisplay} onLabelDisplayChange={setLabelDisplay}
                  />
                </div>
              </div>

              {/* Bottom Sections: Full Width */}
              <div className="flex flex-col gap-4" style={{ width: canvasW + 20 + 288 }}>
                <MetricsPanel 
                  metrics={metrics} onCalculate={handleCalculate}
                  iouThreshold={prThreshold} onIouThresholdChange={setPrThreshold}
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <PRCurveChart prCurve={prCurve} ap={prAP} iouThreshold={prThreshold} />
                </div>

                <div>
                  <ExplanationSection />
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
