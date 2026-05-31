import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { BoundingBox, AppMode } from '../types';

const GT_STROKE = '#16a34a';
const GT_FILL = 'rgba(22, 163, 74, 0.12)';
const PRED_STROKE = '#dc2626';
const PRED_FILL = 'rgba(220, 38, 38, 0.12)';
const TP_STROKE = '#2563eb';
const TP_FILL = 'rgba(37, 99, 235, 0.12)';
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
  iouThreshold: number;
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
  onAddBox: (box: Omit<BoundingBox, 'id'>) => void;
  onUpdateBox: (id: string, updates: Partial<BoundingBox>) => void;
  onDeleteBox: (id: string) => void;
}

interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export default function Canvas({
  width, height, gtBoxes, predictBoxes, mode, bgColor, bgImage,
  iouMatrix, iouThreshold, selectedBoxId, onSelectBox, onAddBox, onUpdateBox, onDeleteBox,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!bgImage) { setBgImageEl(null); return; }
    const img = new Image();
    img.onload = () => setBgImageEl(img);
    img.src = bgImage;
  }, [bgImage]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (selectedBoxId) {
      const node = stageRef.current?.findOne('#' + selectedBoxId);
      if (node) { tr.nodes([node]); }
      else { tr.nodes([]); }
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedBoxId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId) {
        e.preventDefault();
        onDeleteBox(selectedBoxId);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedBoxId, onDeleteBox]);

  const isDrawMode = mode === 'gt-add' || mode === 'predict-add';

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawMode) return;
    const name = (e.target as Konva.Node).name();
    const isStage = e.target === e.target.getStage();
    if (!isStage && name !== 'bg') return;
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    setDrawState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  }, [isDrawMode]);

  const handleMouseMove = useCallback(() => {
    if (!drawState || !isDrawMode) return;
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    setDrawState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
  }, [drawState, isDrawMode]);

  const handleMouseUp = useCallback(() => {
    if (!drawState || !isDrawMode) return;
    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    const w = Math.abs(drawState.currentX - drawState.startX);
    const h = Math.abs(drawState.currentY - drawState.startY);
    if (w > 10 && h > 10) {
      onAddBox({
        x, y, width: w, height: h,
        label: 'object',
        type: mode === 'gt-add' ? 'gt' : 'predict',
        confidence: mode === 'predict-add' ? 0.9 : undefined,
      });
    }
    setDrawState(null);
  }, [drawState, isDrawMode, mode, onAddBox]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDrawMode) return;
    const name = (e.target as Konva.Node).name();
    if (e.target === e.target.getStage() || name === 'bg') {
      onSelectBox(null);
    }
  }, [isDrawMode, onSelectBox]);

  // Determine TP predict boxes
  const tpIds = new Set<string>();
  if (predictBoxes.length > 0 && gtBoxes.length > 0) {
    const sorted = [...predictBoxes].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));
    const matched = new Set<string>();
    for (const pred of sorted) {
      let best = iouThreshold;
      let bestId: string | null = null;
      for (const gt of gtBoxes) {
        if (matched.has(gt.id)) continue;
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
    const node = ref.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onUpdateBox(id, {
      x: node.x(), y: node.y(),
      width: Math.max(10, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className="rounded-lg overflow-hidden border border-gray-200 shadow-inner"
        style={{ cursor: isDrawMode ? 'crosshair' : 'default' }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Background */}
            {bgImageEl ? (
              <KonvaImage
                image={bgImageEl}
                x={0} y={0} width={width} height={height}
                name="bg"
              />
            ) : (
              <Rect x={0} y={0} width={width} height={height} fill={bgColor} name="bg" />
            )}

            {/* GT Boxes */}
            {gtBoxes.map(box => (
              <GTBoxShape
                key={box.id}
                box={box}
                isSelected={selectedBoxId === box.id}
                draggable={!isDrawMode}
                onSelect={() => { if (!isDrawMode) onSelectBox(box.id); }}
                onDragEnd={makeDragEnd(box.id)}
                onTransformEnd={makeTransformEnd}
              />
            ))}

            {/* Predict Boxes */}
            {predictBoxes.map(box => (
              <PredictBoxShape
                key={box.id}
                box={box}
                isSelected={selectedBoxId === box.id}
                isTP={tpIds.has(box.id)}
                draggable={!isDrawMode}
                onSelect={() => { if (!isDrawMode) onSelectBox(box.id); }}
                onDragEnd={makeDragEnd(box.id)}
                onTransformEnd={makeTransformEnd}
              />
            ))}

            {/* Drawing preview */}
            {preview && (
              <Rect
                x={preview.x} y={preview.y}
                width={preview.width} height={preview.height}
                stroke={mode === 'gt-add' ? GT_STROKE : PRED_STROKE}
                strokeWidth={2}
                fill={mode === 'gt-add' ? GT_FILL : PRED_FILL}
                dash={[6, 4]}
                listening={false}
              />
            )}

            <Transformer
              ref={trRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>

      <p className="text-xs text-gray-400">
        {isDrawMode ? 'キャンバス上でドラッグしてボックスを描画' : 'ボックスをクリックで選択 / ドラッグで移動 / Delete で削除'}
      </p>
    </div>
  );
}

/* ----- sub-components ----- */

type MakeTransformEnd = (id: string, ref: React.RefObject<Konva.Rect | null>) => () => void;

interface BoxShapeProps {
  box: BoundingBox;
  isSelected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: MakeTransformEnd;
}

function GTBoxShape({ box, isSelected, draggable, onSelect, onDragEnd, onTransformEnd }: BoxShapeProps) {
  const ref = useRef<Konva.Rect>(null);
  return (
    <>
      <Rect
        ref={ref}
        id={box.id}
        x={box.x} y={box.y} width={box.width} height={box.height}
        stroke={isSelected ? SEL_STROKE : GT_STROKE}
        strokeWidth={isSelected ? 3 : 2}
        fill={GT_FILL}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd(box.id, ref)}
      />
      <Text
        x={box.x + 4} y={box.y + 4}
        text={`GT: ${box.label}`}
        fontSize={11} fill={GT_STROKE}
        listening={false}
      />
    </>
  );
}

interface PredictBoxShapeProps extends BoxShapeProps {
  isTP: boolean;
}

function PredictBoxShape({ box, isSelected, isTP, draggable, onSelect, onDragEnd, onTransformEnd }: PredictBoxShapeProps) {
  const ref = useRef<Konva.Rect>(null);
  const stroke = isSelected ? SEL_STROKE : (isTP ? TP_STROKE : PRED_STROKE);
  const fill = isTP ? TP_FILL : PRED_FILL;
  const conf = (box.confidence ?? 1).toFixed(2);
  const status = isTP ? 'TP' : 'FP';

  return (
    <>
      <Rect
        ref={ref}
        id={box.id}
        x={box.x} y={box.y} width={box.width} height={box.height}
        stroke={stroke}
        strokeWidth={isSelected ? 3 : 2}
        fill={fill}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd(box.id, ref)}
      />
      <Text
        x={box.x + 4} y={box.y + 4}
        text={`${status} ${conf}`}
        fontSize={11} fill={stroke}
        listening={false}
      />
    </>
  );
}
