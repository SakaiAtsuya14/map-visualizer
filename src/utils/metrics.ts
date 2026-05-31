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

export function buildIouMatrix(
  gtBoxes: BoundingBox[],
  predictBoxes: BoundingBox[],
): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const pred of predictBoxes) {
    const row = new Map<string, number>();
    for (const gt of gtBoxes) {
      row.set(gt.id, calculateIoU(pred, gt));
    }
    m.set(pred.id, row);
  }
  return m;
}

export function calculateMetrics(
  gtBoxes: BoundingBox[],
  predictBoxes: BoundingBox[],
  iouThreshold: number,
): MetricsResult {
  const iouMatrix = buildIouMatrix(gtBoxes, predictBoxes);

  if (predictBoxes.length === 0 || gtBoxes.length === 0) {
    return {
      precision: predictBoxes.length === 0 ? 1 : 0,
      recall: 0, ap: 0, mAP: 0, prCurve: [],
      tp: 0, fp: predictBoxes.length, fn: gtBoxes.length,
      iouMatrix,
    };
  }

  // Per-class AP (PASCAL VOC style)
  const gtLabels = [...new Set(gtBoxes.map(b => b.label))];
  const classAPs: number[] = [];
  let totalTP = 0, totalFP = 0, totalFN = 0;
  const allPRPoints: PRPoint[] = [];

  for (const label of gtLabels) {
    const classGTs = gtBoxes.filter(b => b.label === label);
    // Only consider same-class predictions, sorted by confidence desc
    const classPreds = [...predictBoxes.filter(b => b.label === label)]
      .sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));

    const matchedGTs = new Set<string>();
    const tpFlags: boolean[] = [];

    for (const pred of classPreds) {
      let bestIoU = iouThreshold;
      let bestGTId: string | null = null;
      for (const gt of classGTs) {
        if (matchedGTs.has(gt.id)) continue;
        const iou = iouMatrix.get(pred.id)?.get(gt.id) ?? 0;
        if (iou > bestIoU) { bestIoU = iou; bestGTId = gt.id; }
      }
      if (bestGTId) { matchedGTs.add(bestGTId); tpFlags.push(true); }
      else tpFlags.push(false);
    }

    const classPR: PRPoint[] = [];
    let cumTP = 0, cumFP = 0;
    for (let i = 0; i < tpFlags.length; i++) {
      if (tpFlags[i]) cumTP++; else cumFP++;
      classPR.push({ recall: cumTP / classGTs.length, precision: cumTP / (cumTP + cumFP) });
    }

    classAPs.push(computeAP(classPR));
    totalTP += tpFlags.filter(Boolean).length;
    totalFP += tpFlags.filter(f => !f).length;
    totalFN += classGTs.length - matchedGTs.size;
    allPRPoints.push(...classPR);
  }

  // Predictions of classes with no GT boxes → all FP (not in mAP average)
  const labelsWithGT = new Set(gtLabels);
  totalFP += predictBoxes.filter(b => !labelsWithGT.has(b.label)).length;

  const mAP = classAPs.length > 0
    ? classAPs.reduce((a, b) => a + b, 0) / classAPs.length
    : 0;
  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = gtBoxes.length > 0 ? totalTP / gtBoxes.length : 0;
  const prCurve = allPRPoints.sort((a, b) => a.recall - b.recall);

  return { precision, recall, ap: mAP, mAP, prCurve, tp: totalTP, fp: totalFP, fn: totalFN, iouMatrix };
}

function computeAP(prCurve: PRPoint[]): number {
  if (prCurve.length === 0) return 0;
  const recalls = [0, ...prCurve.map(p => p.recall)];
  const precisions = [0, ...prCurve.map(p => p.precision)];
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
