export interface ClassDef {
  id: string;       // internal UUID
  classId: number;  // user-visible numeric ID (used in YOLO etc.)
  name: string;     // display name (can be empty)
  color: string;
}

export interface LabelDisplaySettings {
  showClassId: boolean;
  showName: boolean;
  showConfidence: boolean;
  showType: boolean;
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
