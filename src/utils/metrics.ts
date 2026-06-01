import { BoundingBox } from '../types';

export interface PRPoint {
  recall: number;
  precision: number;
}

export const EVAL_THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

export interface MetricsResult {
  precision: number;
  recall: number;
  map50: number;
  map75: number;
  map5095: number;
  mapByThreshold: Record<string, number>;
  prCurve: PRPoint[];
  prCurveByThreshold: Record<string, PRPoint[]>;
  tp: number;
  fp: number;
  fn: number;
  tpByThreshold: Record<string, number>;
  fpByThreshold: Record<string, number>;
  fnByThreshold: Record<string, number>;
  precisionByThreshold: Record<string, number>;
  recallByThreshold: Record<string, number>;
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

interface ThresholdResult {
  mAP: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  prCurve: PRPoint[];
}

function computeAtThreshold(
  gtBoxes: BoundingBox[],
  predictBoxes: BoundingBox[],
  iouMatrix: Map<string, Map<string, number>>,
  iouThreshold: number,
  method: 'voc' | 'coco'
): ThresholdResult {
  const targetClasses = method === 'voc' 
    ? [...new Set(gtBoxes.filter(b => b.label).map(b => b.label))]
    : [...new Set([...gtBoxes, ...predictBoxes].filter(b => b.label).map(b => b.label))];

  const classAPs: number[] = [];
  let totalTP = 0, totalFP = 0, totalFN = 0;
  const allPRPoints: PRPoint[] = [];

  for (const label of targetClasses) {
    const classGTs = gtBoxes.filter(b => b.label === label);
    const classPreds = [...predictBoxes.filter(b => b.label === label)]
      .sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));

    if (classGTs.length === 0) {
      // This happens in COCO mode when there are predictions but no GT for a class
      classAPs.push(0);
      totalFP += classPreds.length;
      continue;
    }

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

    classAPs.push(computeAP(classPR, method));
    totalTP += tpFlags.filter(Boolean).length;
    totalFP += tpFlags.filter(f => !f).length;
    totalFN += classGTs.length - matchedGTs.size;
    allPRPoints.push(...classPR);
  }

  const evaluatedLabels = new Set(targetClasses);
  totalFP += predictBoxes.filter(b => !b.label || !evaluatedLabels.has(b.label)).length;

  const mAP = classAPs.length > 0
    ? classAPs.reduce((a, b) => a + b, 0) / classAPs.length
    : 0;
  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = gtBoxes.filter(b => b.label).length > 0 ? totalTP / gtBoxes.filter(b => b.label).length : 0;
  const prCurve = allPRPoints.sort((a, b) => a.recall - b.recall);

  return { mAP, tp: totalTP, fp: totalFP, fn: totalFN, precision, recall, prCurve };
}

export function calculateMetrics(
  gtBoxes: BoundingBox[],
  predictBoxes: BoundingBox[],
  method: 'voc' | 'coco' = 'voc'
): MetricsResult {
  const iouMatrix = buildIouMatrix(gtBoxes, predictBoxes);
  const emptyThresholds = Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), 0]));

  if (predictBoxes.length === 0 || gtBoxes.length === 0) {
    return {
      precision: predictBoxes.length === 0 ? 1 : 0,
      recall: 0,
      map50: 0, map75: 0, map5095: 0,
      mapByThreshold: emptyThresholds,
      prCurve: [],
      prCurveByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), []])),
      tp: 0, fp: predictBoxes.length, fn: gtBoxes.length,
      tpByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), 0])),
      fpByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), predictBoxes.length])),
      fnByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), gtBoxes.length])),
      precisionByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), predictBoxes.length === 0 ? 1 : 0])),
      recallByThreshold: Object.fromEntries(EVAL_THRESHOLDS.map(t => [t.toFixed(2), 0])),
      iouMatrix,
    };
  }

  const mapByThreshold: Record<string, number> = {};
  const prCurveByThreshold: Record<string, PRPoint[]> = {};
  const tpByThreshold: Record<string, number> = {};
  const fpByThreshold: Record<string, number> = {};
  const fnByThreshold: Record<string, number> = {};
  const precisionByThreshold: Record<string, number> = {};
  const recallByThreshold: Record<string, number> = {};
  let at50: ThresholdResult | null = null;

  for (const t of EVAL_THRESHOLDS) {
    const res = computeAtThreshold(gtBoxes, predictBoxes, iouMatrix, t, method);
    const key = t.toFixed(2);
    mapByThreshold[key] = res.mAP;
    prCurveByThreshold[key] = res.prCurve;
    tpByThreshold[key] = res.tp;
    fpByThreshold[key] = res.fp;
    fnByThreshold[key] = res.fn;
    precisionByThreshold[key] = res.precision;
    recallByThreshold[key] = res.recall;
    if (t === 0.5) at50 = res;
  }

  const map5095 = EVAL_THRESHOLDS.reduce((sum, t) => sum + mapByThreshold[t.toFixed(2)], 0) / EVAL_THRESHOLDS.length;

  return {
    precision: at50!.precision,
    recall: at50!.recall,
    map50: mapByThreshold['0.50'],
    map75: mapByThreshold['0.75'],
    map5095,
    mapByThreshold,
    prCurve: at50!.prCurve,
    prCurveByThreshold,
    tp: at50!.tp,
    fp: at50!.fp,
    fn: at50!.fn,
    tpByThreshold,
    fpByThreshold,
    fnByThreshold,
    precisionByThreshold,
    recallByThreshold,
    iouMatrix,
  };
}

function computeAP(prCurve: PRPoint[], method: 'voc' | 'coco'): number {
  if (prCurve.length === 0) return 0;
  
  if (method === 'coco') {
    let ap = 0;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100.0;
      const validP = prCurve.filter(p => p.recall >= t);
      if (validP.length > 0) {
        ap += Math.max(...validP.map(p => p.precision));
      }
    }
    return ap / 101.0;
  }
  
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
