import { SamplePreset } from '../types';

export const presets: SamplePreset[] = [
  {
    id: 'single',
    name: '単一オブジェクト',
    description: '1つの犬が写っている場面。シンプルにTPとFPの違いを確認できます。',
    bgColor: '#e0f2fe',
    canvasWidth: 640,
    canvasHeight: 480,
    gtBoxes: [
      { id: 'gt-s1', x: 180, y: 110, width: 290, height: 260, label: 'dog' },
    ],
  },
  {
    id: 'two-objects',
    name: '2つのオブジェクト',
    description: '犬と猫が並んだ場面。Precision と Recall のトレードオフを観察できます。',
    bgColor: '#dcfce7',
    canvasWidth: 640,
    canvasHeight: 480,
    gtBoxes: [
      { id: 'gt-t1', x: 50, y: 130, width: 220, height: 220, label: 'dog' },
      { id: 'gt-t2', x: 380, y: 150, width: 200, height: 180, label: 'cat' },
    ],
  },
  {
    id: 'multi',
    name: '複数オブジェクト',
    description: '4つのオブジェクトがある複雑な場面。mAP 計算の理解に最適です。',
    bgColor: '#fdf4ff',
    canvasWidth: 640,
    canvasHeight: 480,
    gtBoxes: [
      { id: 'gt-m1', x: 30,  y: 50,  width: 150, height: 140, label: 'cat' },
      { id: 'gt-m2', x: 240, y: 70,  width: 160, height: 140, label: 'dog' },
      { id: 'gt-m3', x: 450, y: 40,  width: 160, height: 150, label: 'cat' },
      { id: 'gt-m4', x: 130, y: 270, width: 180, height: 170, label: 'dog' },
    ],
  },
];
