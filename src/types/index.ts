export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence?: number;
  type: 'gt' | 'predict';
}

export type AppMode = 'select' | 'gt-add' | 'predict-add';

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  canvasWidth: number;
  canvasHeight: number;
  gtBoxes: Omit<BoundingBox, 'type'>[];
}
