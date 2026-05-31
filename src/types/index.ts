export interface ClassDef {
  id: string;
  name: string;
  color: string;
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  classId?: string;
  confidence?: number;
  type: 'gt' | 'predict';
}

export type AppMode = 'select' | 'gt-add' | 'predict-add';

export interface SamplePreset {
  id: string;
  name: string;
  bgColor: string;
  canvasWidth: number;
  canvasHeight: number;
  gtBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; label: string }>;
}
