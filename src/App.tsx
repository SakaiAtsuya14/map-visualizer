import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import PRCurveChart from './components/PRCurveChart';
import ExplanationSection from './components/ExplanationSection';
import Footer from './components/Footer';
import { BoundingBox, AppMode } from './types';
import { calculateMetrics } from './utils/metrics';
import { presets } from './data/presets';

const CANVAS_W = 640;
const CANVAS_H = 480;

export default function App() {
  const [mode, setMode] = useState<AppMode>('predict-add');
  const [gtBoxes, setGtBoxes] = useState<BoundingBox[]>([]);
  const [predictBoxes, setPredictBoxes] = useState<BoundingBox[]>([]);
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#e8eaf6');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const handlePresetSelect = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    setSelectedPresetId(id);
    setBgColor(preset.bgColor);
    setBgImage(null);
    setGtBoxes(preset.gtBoxes.map(b => ({ ...b, type: 'gt' as const })));
    setPredictBoxes([]);
    setSelectedBoxId(null);
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      setBgImage(e.target?.result as string);
      setSelectedPresetId(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddBox = useCallback((box: Omit<BoundingBox, 'id'>) => {
    const newBox: BoundingBox = { ...box, id: uuidv4() };
    if (box.type === 'gt') {
      setGtBoxes(prev => [...prev, newBox]);
    } else {
      setPredictBoxes(prev => [...prev, newBox]);
    }
    setSelectedBoxId(newBox.id);
  }, []);

  const handleUpdateBox = useCallback((id: string, updates: Partial<BoundingBox>) => {
    setGtBoxes(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    setPredictBoxes(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const handleDeleteBox = useCallback((id: string) => {
    setGtBoxes(prev => prev.filter(b => b.id !== id));
    setPredictBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  }, [selectedBoxId]);

  const handleConfidenceChange = useCallback((id: string, confidence: number) => {
    setPredictBoxes(prev => prev.map(b => b.id === id ? { ...b, confidence } : b));
  }, []);

  const handleDeletePredict = useCallback((id: string) => {
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
            このツールはバウンディングボックスの描画操作があるため、<br />
            <strong>PC・タブレットでのご利用を推奨</strong>しています。
          </p>
        </div>
      </div>

      {/* Desktop app */}
      <div className="hidden md:flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
          <div className="flex gap-5 items-start">
            {/* Canvas */}
            <div className="shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <Canvas
                  width={CANVAS_W}
                  height={CANVAS_H}
                  gtBoxes={gtBoxes}
                  predictBoxes={predictBoxes}
                  mode={mode}
                  bgColor={bgColor}
                  bgImage={bgImage}
                  iouMatrix={metrics.iouMatrix}
                  iouThreshold={iouThreshold}
                  selectedBoxId={selectedBoxId}
                  onSelectBox={setSelectedBoxId}
                  onAddBox={handleAddBox}
                  onUpdateBox={handleUpdateBox}
                  onDeleteBox={handleDeleteBox}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-72 shrink-0">
              <Sidebar
                mode={mode}
                onModeChange={setMode}
                presets={presets}
                selectedPresetId={selectedPresetId}
                onPresetSelect={handlePresetSelect}
                onImageUpload={handleImageUpload}
                iouThreshold={iouThreshold}
                onIouThresholdChange={setIouThreshold}
                predictBoxes={predictBoxes}
                onConfidenceChange={handleConfidenceChange}
                onDeletePredict={handleDeletePredict}
                metrics={metrics}
              />
            </div>
          </div>

          {/* PR Curve */}
          <div className="mt-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <PRCurveChart prCurve={metrics.prCurve} ap={metrics.ap} />
          </div>

          {/* Explanation */}
          <div className="mt-5">
            <ExplanationSection />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
