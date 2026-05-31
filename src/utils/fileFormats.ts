import { v4 as uuidv4 } from 'uuid';
import { BoundingBox, ClassDef } from '../types';

export type BoxFileType = 'gt' | 'predict';

function resolveClass(classes: ClassDef[], classNum: number, fallbackName: string) {
  const cls = classes.find(c => c.classId === classNum);
  return {
    classId: cls?.id,
    label: cls ? (cls.name || String(cls.classId)) : fallbackName,
  };
}

/** YOLO TXT: `class_id x_center y_center width height [confidence]` (normalized 0-1) */
export function parseYolo(
  text: string,
  type: BoxFileType,
  classes: ClassDef[],
  canvasW: number,
  canvasH: number,
): BoundingBox[] {
  const boxes: BoundingBox[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const classNum = parseInt(parts[0]);
    const xc = parseFloat(parts[1]) * canvasW;
    const yc = parseFloat(parts[2]) * canvasH;
    const w  = parseFloat(parts[3]) * canvasW;
    const h  = parseFloat(parts[4]) * canvasH;
    const conf = parts[5] ? parseFloat(parts[5]) : 1.0;
    if ([classNum, xc, yc, w, h].some(isNaN)) continue;
    const { classId, label } = resolveClass(classes, classNum, String(classNum));
    boxes.push({
      id: uuidv4(), x: xc - w / 2, y: yc - h / 2, width: w, height: h,
      label, classId,
      confidence: type === 'predict' ? Math.min(1, Math.max(0, conf)) : undefined,
      type,
    });
  }
  return boxes;
}

/** COCO JSON — GT: `{annotations:[{category_id,bbox:[x,y,w,h]}], categories:[{id,name}]}`
 *  Predictions: `[{category_id, bbox:[x,y,w,h], score}]` */
export function parseCoco(
  text: string,
  type: BoxFileType,
  classes: ClassDef[],
  scaleX: number,
  scaleY: number,
): BoundingBox[] {
  const data = JSON.parse(text);
  const boxes: BoundingBox[] = [];

  // Build category name map from embedded categories
  const catNameMap = new Map<number, string>();
  const cats: { id: number; name: string }[] = data.categories ?? [];
  for (const c of cats) catNameMap.set(c.id, c.name);

  const anns: { category_id: number; bbox: number[]; score?: number }[] =
    Array.isArray(data) ? data : (data.annotations ?? []);

  for (const ann of anns) {
    const [x, y, w, h] = ann.bbox;
    if ([x, y, w, h].some(isNaN)) continue;
    const catId = ann.category_id;
    const catName = catNameMap.get(catId) ?? String(catId);
    // Try to match by classId number, then by name
    const cls = classes.find(c => c.classId === catId) ?? classes.find(c => c.name === catName);
    boxes.push({
      id: uuidv4(),
      x: x * scaleX, y: y * scaleY, width: w * scaleX, height: h * scaleY,
      label: cls ? (cls.name || String(cls.classId)) : catName,
      classId: cls?.id,
      confidence: type === 'predict' ? Math.min(1, Math.max(0, ann.score ?? 1.0)) : undefined,
      type,
    });
  }
  return boxes;
}

/** Pascal VOC XML — absolute pixel coords; image size is read from `<size>` element */
export function parsePascalVoc(
  xmlText: string,
  type: BoxFileType,
  classes: ClassDef[],
  canvasW: number,
  canvasH: number,
): BoundingBox[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const sizeEl = doc.querySelector('size');
  const imgW = sizeEl ? Number(sizeEl.querySelector('width')?.textContent) || canvasW : canvasW;
  const imgH = sizeEl ? Number(sizeEl.querySelector('height')?.textContent) || canvasH : canvasH;
  const sx = canvasW / imgW;
  const sy = canvasH / imgH;

  const boxes: BoundingBox[] = [];
  for (const obj of doc.querySelectorAll('object')) {
    const name = obj.querySelector('name')?.textContent?.trim() ?? '';
    const bndbox = obj.querySelector('bndbox');
    if (!bndbox) continue;
    const xmin = Number(bndbox.querySelector('xmin')?.textContent) * sx;
    const ymin = Number(bndbox.querySelector('ymin')?.textContent) * sy;
    const xmax = Number(bndbox.querySelector('xmax')?.textContent) * sx;
    const ymax = Number(bndbox.querySelector('ymax')?.textContent) * sy;
    const scoreText = obj.querySelector('score')?.textContent;
    const cls = classes.find(c => c.name === name);
    boxes.push({
      id: uuidv4(), x: xmin, y: ymin, width: xmax - xmin, height: ymax - ymin,
      label: cls ? (cls.name || String(cls.classId)) : name,
      classId: cls?.id,
      confidence: type === 'predict' ? (scoreText ? Number(scoreText) : 1.0) : undefined,
      type,
    });
  }
  return boxes;
}

export function parseBoxFile(
  text: string,
  ext: string,
  type: BoxFileType,
  classes: ClassDef[],
  canvasW: number,
  canvasH: number,
  scaleX: number,
  scaleY: number,
): BoundingBox[] {
  if (ext === 'txt') return parseYolo(text, type, classes, canvasW, canvasH);
  if (ext === 'json') return parseCoco(text, type, classes, scaleX, scaleY);
  if (ext === 'xml') return parsePascalVoc(text, type, classes, canvasW, canvasH);
  throw new Error(`未対応の形式: .${ext}`);
}
