export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">mAP Visualizer</h1>
            <p className="text-xs text-gray-500 mt-0.5">物体検出 評価指標 インタラクティブ学習ツール</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-sm inline-block"></span>GT（正解）
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
            <span className="w-2 h-2 bg-red-500 rounded-sm inline-block"></span>Predict（予測）
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            <span className="w-2 h-2 bg-blue-500 rounded-sm inline-block"></span>TP（正解予測）
          </span>
        </div>
      </div>
    </header>
  );
}
