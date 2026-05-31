import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PRPoint } from '../utils/metrics';

interface Props {
  prCurve: PRPoint[];
  ap: number;
}

export default function PRCurveChart({ prCurve, ap }: Props) {
  const data = [
    { recall: 0, precision: prCurve.length > 0 ? prCurve[0].precision : 1 },
    ...prCurve,
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">PR 曲線（Precision-Recall Curve）</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Predict ボックスを追加・信頼度を変更するとリアルタイムで更新されます
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">AP（曲線下面積）</div>
          <div className="text-2xl font-bold text-indigo-600">{(ap * 100).toFixed(1)}%</div>
        </div>
      </div>

      {prCurve.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
          Predict ボックスを追加すると PR 曲線が表示されます
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              label={{ value: 'Recall', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
            />
            <Tooltip
              formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]}
              labelFormatter={v => `Recall: ${(Number(v) * 100).toFixed(1)}%`}
            />
            <ReferenceLine
              x={0} y={ap}
              stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.4}
            />
            <Area
              type="stepAfter"
              dataKey="precision"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#prGrad)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              name="Precision"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
