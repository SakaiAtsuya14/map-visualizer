import { BoundingBox } from '../types';

export interface PRPoint {
  recall: number;
  precision: number;
}

export interface MetricsResult {
  precision: number;
  recall: number;
  ap: number;
  mAP: number;
  prCurve: PRPoint[];
  tp: number;
  fp: number;
  fn: number;
  iouMatrix: Map<string, Map<string, number>>;
}

export function calculateIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const intersection = interW * interH;

  if (intersection === 0) return 0;

  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export function calculateMetrics(
  gtBoxes: BoundingBox[],
  predictBoxes: BoundingBox[],
  iouThreshold: number,
): MetricsResult {
  const iouMatrix = new Map<string, Map<string, number>>();
  for (const pred of predictBoxes) {
    const row = new Map<string, number>();
    for (const gt of gtBoxes) {
      row.set(gt.id, calculateIoU(pred, gt));
    }
    iouMatrix.set(pred.id, row);
  }

  if (predictBoxes.length === 0) {
    return { precision: 1, recall: 0, ap: 0, mAP: 0, prCurve: [], tp: 0, fp: 0, fn: gtBoxes.length, iouMatrix };
  }
  if (gtBoxes.length === 0) {
    return { precision: 0, recall: 1, ap: 0, mAP: 0, prCurve: [], tp: 0, fp: predictBoxes.length, fn: 0, iouMatrix };
  }

  const sortedPreds = [...predictBoxes].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));
  const matchedGTs = new Set<string>();
  const tpFlags: boolean[] = [];

  for (const pred of sortedPreds) {
    let bestIoU = iouThreshold;
    let bestGTId: string | null = null;

    for (const gt of gtBoxes) {
      if (matchedGTs.has(gt.id)) continue;
      const iou = iouMatrix.get(pred.id)?.get(gt.id) ?? 0;
      if (iou > bestIoU) {
        bestIoU = iou;
        bestGTId = gt.id;
      }
    }

    if (bestGTId) {
      matchedGTs.add(bestGTId);
      tpFlags.push(true);
    } else {
      tpFlags.push(false);
    }
  }

  const prCurve: PRPoint[] = [];
  let cumTP = 0;
  let cumFP = 0;

  for (let i = 0; i < tpFlags.length; i++) {
    if (tpFlags[i]) cumTP++;
    else cumFP++;
    prCurve.push({
      recall: cumTP / gtBoxes.length,
      precision: cumTP / (cumTP + cumFP),
    });
  }

  const tp = cumTP;
  const fp = cumFP;
  const fn = gtBoxes.length - tp;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp / gtBoxes.length;
  const ap = computeAP(prCurve);

  return { precision, recall, ap, mAP: ap, prCurve, tp, fp, fn, iouMatrix };
}

function computeAP(prCurve: PRPoint[]): number {
  if (prCurve.length === 0) return 0;

  const recalls = [0, ...prCurve.map(p => p.recall)];
  const precisions = [0, ...prCurve.map(p => p.precision)];

  // Monotonically decreasing precision from right
  for (let i = precisions.length - 2; i >= 0; i--) {
    precisions[i] = Math.max(precisions[i], precisions[i + 1]);
  }

  let ap = 0;
  for (let i = 1; i < recalls.length; i++) {
    if (recalls[i] !== recalls[i - 1]) {
      ap += (recalls[i] - recalls[i - 1]) * precisions[i];
    }
  }
  return ap;
}
