import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { BoundingBox, AppMode, ClassDef, LabelDisplaySettings } from '../types';

const VIZ_IOU_THRESHOLD = 0.5;

const GT_STROKE = '#16a34a';
const GT_FILL = 'rgba(22, 163, 74, 0.10)';
const PRED_STROKE = '#dc2626';
const PRED_FILL = 'rgba(220, 38, 38, 0.10)';
const TP_STROKE = '#2563eb';
const TP_FILL = 'rgba(37, 99, 235, 0.10)';
const SEL_STROKE = '#f59e0b';

interface Props {
  width: number;
  height: number;
  gtBoxes: BoundingBox[];
  predictBoxes: BoundingBox[];
  mode: AppMode;
  bgColor: string;
  bgImage: string | null;
  iouMatrix: Map<string, Map<string, number>>;
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
  onAddBox: (geom: { x: number; y: number; width: number; height: number; type: 'gt' | 'predict' }) => void;
  onUpdateBox: (id: string, updates: Partial<BoundingBox>) => void;
  onDeleteBox: (id: string) => void;
  classes: ClassDef[];
  labelDisplay: LabelDisplaySettings;
}

interface DrawState {
  startX: number; startY: number; currentX: number; currentY: number;
}

export default function Canvas({
  width, height, gtBoxes, predictBoxes, mode, bgColor, bgImage,
  iouMatrix, selectedBoxId, onSelectBox, onAddBox, onUpdateBox, onDeleteBox, classes, labelDisplay,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const panLastPos = useRef({ x: 0, y: 0 });

  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [rightDragBox, setRightDragBox] = useState<{
    id: string; startCanvasX: number; startCanvasY: number; startBoxX: number; startBoxY: number;
  } | null>(null);

  const isDrawMode = mode === 'gt-add' || mode === 'predict-add';

  // Load background image
  useEffect(() => {
    if (!bgImage) { setBgImageEl(null); return; }
    const img = new Image();
    img.onload = () => setBgImageEl(img);
    img.src = bgImage;
  }, [bgImage]);

  // Attach transformer to selected node — hide in draw mode so anchors don't interfere
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (selectedBoxId && !isDrawMode) {
      const node = stageRef.current?.findOne('#' + selectedBoxId);
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedBoxId, isDrawMode]);

  // Keyboard handlers
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(true);
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId) {
        e.preventDefault();
        onDeleteBox(selectedBoxId);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(false);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedBoxId, onDeleteBox]);

  // Prevent context menu on canvas
  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    const prevent = (e: Event) => e.preventDefault();
    container.addEventListener('contextmenu', prevent);
    return () => container.removeEventListener('contextmenu', prevent);
  }, []);

  const getCanvasPos = useCallback(() => {
    const stage = stageRef.current!;
    const pos = stage.getPointerPosition()!;
    const scale = stage.scaleX();
    const sp = stage.position();
    return { x: (pos.x - sp.x) / scale, y: (pos.y - sp.y) / scale };
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const oldScale = stage.scaleX();
    const pos = stage.getPointerPosition()!;
    const pivot = { x: (pos.x - stage.x()) / oldScale, y: (pos.y - stage.y()) / oldScale };
    const dir = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.2, Math.min(5, oldScale * (1 + dir * 0.12)));
    stage.scale({ x: newScale, y: newScale });
    stage.position({ x: pos.x - pivot.x * newScale, y: pos.y - pivot.y * newScale });
  }, []);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse → pan
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panLastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    // Right click → move box (draw mode) or pan
    if (e.evt.button === 2) {
      e.evt.preventDefault();
      if (isDrawMode) {
        const targetId = (e.target as Konva.Node).id();
        const box = [...gtBoxes, ...predictBoxes].find(b => b.id === targetId);
        if (box) {
          const p = getCanvasPos();
          setRightDragBox({ id: box.id, startCanvasX: p.x, startCanvasY: p.y, startBoxX: box.x, startBoxY: box.y });
          return;
        }
      }
      setIsPanning(true);
      panLastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    // Only left click for drawing
    if (e.evt.button !== 0) return;
    if (!isDrawMode) return;
    const p = getCanvasPos();
    setDrawState({ startX: p.x, startY: p.y, currentX: p.x, currentY: p.y });
  }, [isDrawMode, getCanvasPos, gtBoxes, predictBoxes]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const stage = stageRef.current!;
      const dx = e.evt.clientX - panLastPos.current.x;
      const dy = e.evt.clientY - panLastPos.current.y;
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      panLastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      stage.batchDraw();
      return;
    }
    if (rightDragBox) {
      const p = getCanvasPos();
      onUpdateBox(rightDragBox.id, {
        x: rightDragBox.startBoxX + (p.x - rightDragBox.startCanvasX),
        y: rightDragBox.startBoxY + (p.y - rightDragBox.startCanvasY),
      });
      return;
    }
    if (!drawState || !isDrawMode) return;
    const p = getCanvasPos();
    setDrawState(prev => prev ? { ...prev, currentX: p.x, currentY: p.y } : null);
  }, [isPanning, rightDragBox, drawState, isDrawMode, getCanvasPos, onUpdateBox]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1) { setIsPanning(false); return; }
    if (e.evt.button === 2) { setIsPanning(false); setRightDragBox(null); return; }
    if (!drawState || !isDrawMode) return;
    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    const w = Math.abs(drawState.currentX - drawState.startX);
    const h = Math.abs(drawState.currentY - drawState.startY);
    if (w > 10 && h > 10) {
      onAddBox({ x, y, width: w, height: h, type: mode === 'gt-add' ? 'gt' : 'predict' });
    }
    setDrawState(null);
  }, [drawState, isDrawMode, mode, onAddBox]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    if (isDrawMode) return;
    const name = (e.target as Konva.Node).name();
    if (e.target === e.target.getStage() || name === 'bg') onSelectBox(null);
  }, [isDrawMode, onSelectBox]);

  const handleResetZoom = () => {
    const stage = stageRef.current!;
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
  };

  // Determine TP ids (class-aware, using fixed IoU=0.5 for visualization)
  const tpIds = new Set<string>();
  if (predictBoxes.length > 0 && gtBoxes.length > 0) {
    const sorted = [...predictBoxes].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));
    const matched = new Set<string>();
    for (const pred of sorted) {
      if (!pred.label) continue;
      let best = VIZ_IOU_THRESHOLD; let bestId: string | null = null;
      for (const gt of gtBoxes) {
        if (matched.has(gt.id)) continue;
        if (!gt.label || gt.label !== pred.label) continue;
        const iou = iouMatrix.get(pred.id)?.get(gt.id) ?? 0;
        if (iou > best) { best = iou; bestId = gt.id; }
      }
      if (bestId) { matched.add(bestId); tpIds.add(pred.id); }
    }
  }

  const preview = drawState ? {
    x: Math.min(drawState.startX, drawState.currentX),
    y: Math.min(drawState.startY, drawState.currentY),
    width: Math.abs(drawState.currentX - drawState.startX),
    height: Math.abs(drawState.currentY - drawState.startY),
  } : null;

  const makeDragEnd = (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
    onUpdateBox(id, { x: e.target.x(), y: e.target.y() });
  };
  const makeTransformEnd = (id: string, ref: React.RefObject<Konva.Rect | null>) => () => {
    const node = ref.current; if (!node) return;
    const sx = node.scaleX(); const sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    onUpdateBox(id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * sx), height: Math.max(10, node.height() * sy) });
  };

  const cursorStyle = isPanning || rightDragBox ? 'grabbing' : isDrawMode ? 'crosshair' : 'default';

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center justify-between w-full mb-1">
        <p className="text-xs text-gray-400">
          {isDrawMode
            ? '左ドラッグ: 描画　右クリック+ドラッグ: ボックス移動　ホイール押し: 画面移動　Scroll: ズーム'
            : '左クリック: 選択/移動　ホイール押し: 画面移動　Scroll: ズーム　Shift+リサイズ: 比率固定'}
        </p>
        <button onClick={handleResetZoom}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-100 transition">
          ズームリセット
        </button>
      </div>
      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-inner"
        style={{ width, height, cursor: cursorStyle }}>
        <Stage ref={stageRef} width={width} height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onWheel={handleWheel}
        >
          <Layer>
            {bgImageEl
              ? <KonvaImage image={bgImageEl} x={0} y={0} width={width} height={height} name="bg" />
              : <Rect x={0} y={0} width={width} height={height} fill={bgColor} name="bg" />
            }

            {gtBoxes.map(box => (
              <GTBoxShape key={box.id} box={box} isSelected={selectedBoxId === box.id}
                draggable={!isDrawMode}
                onSelect={() => { if (!isDrawMode) onSelectBox(box.id); }}
                onDragEnd={makeDragEnd(box.id)}
                onTransformEnd={makeTransformEnd}
                classes={classes} labelDisplay={labelDisplay}
              />
            ))}

            {predictBoxes.map(box => (
              <PredictBoxShape key={box.id} box={box} isSelected={selectedBoxId === box.id}
                isTP={tpIds.has(box.id)} draggable={!isDrawMode}
                onSelect={() => { if (!isDrawMode) onSelectBox(box.id); }}
                onDragEnd={makeDragEnd(box.id)}
                onTransformEnd={makeTransformEnd}
                classes={classes} labelDisplay={labelDisplay}
              />
            ))}

            {preview && (
              <Rect x={preview.x} y={preview.y} width={preview.width} height={preview.height}
                stroke={mode === 'gt-add' ? GT_STROKE : PRED_STROKE}
                strokeWidth={2} fill={mode === 'gt-add' ? GT_FILL : PRED_FILL}
                dash={[6, 4]} listening={false}
              />
            )}

            <Transformer ref={trRef} rotateEnabled={false} keepRatio={shiftPressed}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function BoxLabel({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const fs = 10; const pad = 3;
  const w = text.length * 6.2 + pad * 2;
  const h = fs + pad * 2;
  const ly = y - h - 2;
  const ry = ly < 0 ? y + 2 : ly;
  return (
    <>
      <Rect x={x} y={ry} width={w} height={h} fill={color} opacity={0.88} cornerRadius={2} listening={false} />
      <Text x={x + pad} y={ry + pad} text={text} fontSize={fs} fill="white" fontStyle="bold" listening={false} />
    </>
  );
}

type MakeTransformEnd = (id: string, ref: React.RefObject<Konva.Rect | null>) => () => void;

interface BoxShapeProps {
  box: BoundingBox; isSelected: boolean; draggable: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: MakeTransformEnd;
  classes: ClassDef[];
  labelDisplay: LabelDisplaySettings;
}

function buildGTLabel(box: BoundingBox, classes: ClassDef[], ld: LabelDisplaySettings): string {
  const cls = classes.find(c => c.id === box.classId);
  const info: string[] = [];
  if (ld.showClassId && cls !== undefined) info.push(`#${cls.classId}`);
  if (ld.showName) info.push(box.label || '未設定');
  return info.length > 0 ? `GT ${info.join(' ')}` : 'GT';
}

function buildPredLabel(box: BoundingBox, classes: ClassDef[], ld: LabelDisplaySettings, isTP: boolean): string {
  const cls = classes.find(c => c.id === box.classId);
  const prefix = isTP ? 'TP' : 'FP';
  const info: string[] = [];
  if (ld.showClassId && cls !== undefined) info.push(`#${cls.classId}`);
  if (ld.showName) info.push(box.label || '未設定');
  if (ld.showConfidence) info.push((box.confidence ?? 1).toFixed(2));
  return info.length > 0 ? `${prefix} ${info.join(' ')}` : prefix;
}

function GTBoxShape({ box, isSelected, draggable, onSelect, onDragEnd, onTransformEnd, classes, labelDisplay }: BoxShapeProps) {
  const ref = useRef<Konva.Rect>(null);
  const cls = classes.find(c => c.id === box.classId);
  const stroke = isSelected ? SEL_STROKE : (cls?.color ?? GT_STROKE);
  return (
    <>
      <Rect ref={ref} id={box.id} x={box.x} y={box.y} width={box.width} height={box.height}
        stroke={stroke} strokeWidth={isSelected ? 3 : 2} fill={GT_FILL}
        draggable={draggable} onClick={onSelect} onTap={onSelect}
        onDragEnd={onDragEnd} onTransformEnd={onTransformEnd(box.id, ref)}
      />
      <BoxLabel x={box.x} y={box.y} text={buildGTLabel(box, classes, labelDisplay)} color={stroke} />
    </>
  );
}

interface PredictBoxShapeProps extends BoxShapeProps { isTP: boolean; }

function PredictBoxShape({ box, isSelected, isTP, draggable, onSelect, onDragEnd, onTransformEnd, classes, labelDisplay }: PredictBoxShapeProps) {
  const ref = useRef<Konva.Rect>(null);
  const cls = classes.find(c => c.id === box.classId);
  const stroke = isSelected ? SEL_STROKE : (isTP ? TP_STROKE : (cls?.color ?? PRED_STROKE));
  const fill = isTP ? TP_FILL : PRED_FILL;
  return (
    <>
      <Rect ref={ref} id={box.id} x={box.x} y={box.y} width={box.width} height={box.height}
        stroke={stroke} strokeWidth={isSelected ? 3 : 2} fill={fill}
        draggable={draggable} onClick={onSelect} onTap={onSelect}
        onDragEnd={onDragEnd} onTransformEnd={onTransformEnd(box.id, ref)}
      />
      <BoxLabel x={box.x} y={box.y} text={buildPredLabel(box, classes, labelDisplay, isTP)} color={stroke} />
    </>
  );
}
