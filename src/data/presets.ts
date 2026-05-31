import { SamplePreset } from '../types';

export const presets: SamplePreset[] = [
  {
    id: 'single',
    name: '単一オブジェクト',
    bgColor: '#e0f2fe',
    canvasWidth: 880,
    canvasHeight: 580,
    gtBoxes: [
      { id: 'gt-s1', x: 240, y: 130, width: 400, height: 320, label: 'dog' },
    ],
  },
  {
    id: 'two-objects',
    name: '2つのオブジェクト',
    bgColor: '#dcfce7',
    canvasWidth: 880,
    canvasHeight: 580,
    gtBoxes: [
      { id: 'gt-t1', x: 60,  y: 140, width: 310, height: 300, label: 'dog' },
      { id: 'gt-t2', x: 510, y: 170, width: 290, height: 240, label: 'cat' },
    ],
  },
  {
    id: 'multi',
    name: '複数オブジェクト',
    bgColor: '#fdf4ff',
    canvasWidth: 880,
    canvasHeight: 580,
    gtBoxes: [
      { id: 'gt-m1', x: 40,  y: 60,  width: 190, height: 170, label: 'cat' },
      { id: 'gt-m2', x: 300, y: 80,  width: 210, height: 170, label: 'dog' },
      { id: 'gt-m3', x: 610, y: 50,  width: 200, height: 180, label: 'cat' },
      { id: 'gt-m4', x: 190, y: 310, width: 230, height: 210, label: 'dog' },
    ],
  },
];
