import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import Canvas from './components/Canvas';
import Sidebar, { CLASS_COLORS } from './components/Sidebar';
import PRCurveChart from './components/PRCurveChart';
import ExplanationSection from './components/ExplanationSection';
import Footer from './components/Footer';
import { BoundingBox, AppMode, ClassDef } from './types';
import { calculateMetrics } from './utils/metrics';

const CANVAS_W = 880;
const CANVAS_H = 580;

const DEFAULT_CLASSES: ClassDef[] = [
  { id: 'cls-1', name: 'dog',    color: '#f97316' },
  { id: 'cls-2', name: 'cat',    color: '#8b5cf6' },
  { id: 'cls-3', name: 'person', color: '#06b6d4' },
];

export default function App() {
  const [mode, setMode] = useState<AppMode>('predict-add');
  const [gtBoxes, setGtBoxes] = useState<BoundingBox[]>([]);
  const [predictBoxes, setPredictBoxes] = useState<BoundingBox[]>([]);
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassDef[]>(DEFAULT_CLASSES);
  const [currentClassId, setCurrentClassId] = useState<string>('cls-1');
  const [currentConfidence, setCurrentConfidence] = useState(0.9);

  const handleAddClass = useCallback((name: string) => {
    const id = uuidv4();
    const color = CLASS_COLORS[classes.length % CLASS_COLORS.length];
    setClasses(prev => [...prev, { id, name, color }]);
  }, [classes.length]);

  const handleDeleteClass = useCallback((id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    if (currentClassId === id) setCurrentClassId('');
  }, [currentClassId]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => setBgImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleAddBox = useCallback((geom: { x: number; y: number; width: number; height: number; type: 'gt' | 'predict' }) => {
    const cls = classes.find(c => c.id === currentClassId);
    const newBox: BoundingBox = {
      id: uuidv4(), ...geom,
      label: cls?.name ?? 'unknown',
      classId: currentClassId || undefined,
      confidence: geom.type === 'predict' ? currentConfidence : undefined,
    };
    if (geom.type === 'gt') setGtBoxes(prev => [...prev, newBox]);
    else setPredictBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  }, [classes, currentClassId, currentConfidence]);

  const handleUpdateBox = useCallback((id: string, updates: Partial<BoundingBox>) => {
    const enriched = updates.classId !== undefined
      ? { ...updates, label: classes.find(c => c.id === updates.classId)?.name ?? updates.label ?? '' }
      : updates;
    setGtBoxes(prev => prev.map(b => b.id === id ? { ...b, ...enriched } : b));
    setPredictBoxes(prev => prev.map(b => b.id === id ? { ...b, ...enriched } : b));
  }, [classes]);

  const handleDeleteBox = useCallback((id: string) => {
    setGtBoxes(prev => prev.filter(b => b.id !== id));
    setPredictBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  }, [selectedBoxId]);

  const metrics = useMemo(
    () => calculateMetrics(gtBoxes, predictBoxes, iouThreshold),
    [gtBoxes, predictBoxes, iouThreshold],
  );

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
            <div className="flex gap-5 items-start">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0">
                <Canvas
                  width={CANVAS_W} height={CANVAS_H}
                  gtBoxes={gtBoxes} predictBoxes={predictBoxes}
                  mode={mode} bgColor="#e8eaf6" bgImage={bgImage}
                  iouMatrix={metrics.iouMatrix} iouThreshold={iouThreshold}
                  selectedBoxId={selectedBoxId} onSelectBox={setSelectedBoxId}
                  onAddBox={handleAddBox} onUpdateBox={handleUpdateBox} onDeleteBox={handleDeleteBox}
                  classes={classes}
                />
              </div>

              <div className="w-72 shrink-0">
                <Sidebar
                  mode={mode} onModeChange={setMode}
                  classes={classes} onAddClass={handleAddClass} onDeleteClass={handleDeleteClass}
                  currentClassId={currentClassId} onCurrentClassChange={setCurrentClassId}
                  currentConfidence={currentConfidence} onCurrentConfidenceChange={setCurrentConfidence}
                  onImageUpload={handleImageUpload}
                  iouThreshold={iouThreshold} onIouThresholdChange={setIouThreshold}
                  selectedBoxId={selectedBoxId}
                  gtBoxes={gtBoxes} onDeleteGT={handleDeleteBox}
                  predictBoxes={predictBoxes}
                  onDeletePredict={handleDeleteBox}
                  onUpdateBox={handleUpdateBox}
                  metrics={metrics}
                />
              </div>
            </div>

            <div className="mt-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              style={{ width: CANVAS_W + 288 + 20 }}>
              <PRCurveChart prCurve={metrics.prCurve} ap={metrics.ap} />
            </div>

            <div className="mt-5" style={{ width: CANVAS_W + 288 + 20 }}>
              <ExplanationSection />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
