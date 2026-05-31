export default function ExplanationSection() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* IoU */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            IoU（Intersection over Union）
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            予測ボックス（Predict）と正解ボックス（GT）の<strong>重なり具合</strong>を 0〜1 の数値で表した指標です。
            1.0 に近いほど完全に一致しています。
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-center text-gray-700 border border-gray-200">
            <div className="text-indigo-600 font-bold text-base">IoU = 積集合の面積 ÷ 和集合の面積</div>
            <div className="mt-2 text-gray-500 text-xs">= (Predict ∩ GT) / (Predict ∪ GT)</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-red-50 p-2 rounded-lg">
              <div className="font-bold text-red-600">IoU &lt; 閾値</div>
              <div className="text-gray-500">FP（誤検出）</div>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <div className="font-bold text-yellow-600">IoU = 閾値</div>
              <div className="text-gray-500">境界値</div>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="font-bold text-blue-600">IoU ≥ 閾値</div>
              <div className="text-gray-500">TP（正検出）</div>
            </div>
          </div>
        </section>

        {/* TP/FP/FN */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            TP / FP / FN の定義
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            各 Predict ボックスは IoU 閾値との比較で TP か FP に分類されます。
          </p>
          <div className="space-y-2">
            <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="font-bold text-blue-700 text-sm w-8 shrink-0">TP</span>
              <span className="text-sm text-gray-700"><strong>True Positive</strong>：IoU ≥ 閾値で GT にマッチした予測。正しく検出できた。</span>
            </div>
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <span className="font-bold text-red-700 text-sm w-8 shrink-0">FP</span>
              <span className="text-sm text-gray-700"><strong>False Positive</strong>：IoU &lt; 閾値、またはマッチ済み GT のみの予測。誤検出。</span>
            </div>
            <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <span className="font-bold text-yellow-700 text-sm w-8 shrink-0">FN</span>
              <span className="text-sm text-gray-700"><strong>False Negative</strong>：どの Predict にもマッチしなかった GT。見逃し。</span>
            </div>
          </div>
        </section>

        {/* Precision & Recall */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Precision と Recall
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Precision（適合率）と Recall（再現率）は、信頼度スコアの閾値によってトレードオフの関係にあります。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <div className="text-xs font-bold text-indigo-700 mb-1">Precision（適合率）</div>
              <div className="font-mono text-sm text-center text-gray-700 font-semibold">TP / (TP + FP)</div>
              <div className="text-xs text-gray-500 mt-2">「検出した中で正解だった割合」</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="text-xs font-bold text-green-700 mb-1">Recall（再現率）</div>
              <div className="font-mono text-sm text-center text-gray-700 font-semibold">TP / (TP + FN)</div>
              <div className="text-xs text-gray-500 mt-2">「全正解のうち検出できた割合」</div>
            </div>
          </div>
        </section>

        {/* AP & mAP */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            AP と mAP
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            <strong>AP（Average Precision）</strong>は PR 曲線の下側の面積（AUC）です。信頼度の高い順に評価した際の総合的な精度を表します。
          </p>
          <div className="space-y-3">
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <div className="text-xs font-bold text-indigo-700 mb-1">AP の計算手順</div>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Predict を信頼度（Confidence）の降順に並べる</li>
                <li>上から順に評価し、累積 TP / FP を計算</li>
                <li>各ステップで Precision と Recall を算出</li>
                <li>PR 曲線を描き、面積（AUC）を計算</li>
              </ol>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <div className="text-xs font-bold text-purple-700 mb-1">mAP（mean Average Precision）</div>
              <div className="font-mono text-sm text-center text-gray-700 font-semibold">mAP = Σ AP(クラス) / クラス数</div>
              <div className="text-xs text-gray-500 mt-2">各クラスの AP の平均値。複数クラスを持つモデルの総合評価指標として使われます。</div>
            </div>
          </div>
        </section>
      </div>

      {/* Tutorial */}
      <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">このツールの使い方</h3>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'クラスを定義', desc: 'サイドバーのクラス管理で dog・cat などを追加' },
            { step: 2, title: 'シーンを選択', desc: 'サンプルを選ぶか画像をアップロードして GT を配置' },
            { step: 3, title: 'Predict を追加', desc: '「Predict追加」モードでクラス・信頼度を設定して描画' },
            { step: 4, title: '指標を観察', desc: '信頼度や IoU 閾値を動かして指標の変化を確認' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">{step}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
