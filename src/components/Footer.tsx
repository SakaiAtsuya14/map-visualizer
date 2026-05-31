export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <div>
          <span className="font-semibold text-gray-600">mAP Visualizer</span> — 物体検出 評価指標 学習ツール
        </div>
        <div className="flex gap-4">
          <a href="#privacy" className="hover:text-gray-600 transition-colors">プライバシーポリシー</a>
          <a href="#disclaimer" className="hover:text-gray-600 transition-colors">免責事項</a>
        </div>
      </div>
      <div id="privacy" className="max-w-screen-xl mx-auto px-4 pb-4 text-xs text-gray-400 leading-relaxed">
        <strong className="text-gray-500">プライバシーポリシー：</strong>
        本サービスはサーバーを持たない静的サイトです。アップロードされた画像はサーバーに送信されず、
        ブラウザ内のみで処理されます。Google AdSense 等の広告サービスが Cookie を使用する場合があります。
      </div>
      <div id="disclaimer" className="max-w-screen-xl mx-auto px-4 pb-6 text-xs text-gray-400 leading-relaxed">
        <strong className="text-gray-500">免責事項：</strong>
        本ツールは教育目的で提供しています。計算結果の正確性については保証しますが、
        本ツールの利用によって生じたいかなる損害についても責任を負いかねます。
      </div>
    </footer>
  );
}
