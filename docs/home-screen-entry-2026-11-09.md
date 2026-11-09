# スマホのホーム画面から起動する案内

スマホのブラウザでは、ログイン・部屋への復帰・縦画面の案内より先に追加手順を表示する。iPhone は「共有 → ホーム画面に追加」、Android は Chrome の「︙ → ホーム画面に追加／アプリをインストール」。追加後はホーム画面のアイコンから開く。

- OS の案内を自動選択し、手動でも切り替えられる。大きい文字、共有／メニューの図、最後に開くアイコンを表示する。
- `navigator.standalone` または `display-mode: standalone` で起動を確認する。インストール済みの保存フラグや `appinstalled` 通知だけではブラウザ内の起動を許可しない。
- ブラウザの全画面表示では解除しない。PC・iPad・Android タブレットは従来どおりブラウザで利用できる。
- 案内の表示・操作は HTML 内で完結し、ゲーム本体や CDN の読み込みを待たない。ゲーム初期化を待機させ、スマホの通常タブではログイン・部屋接続・主描画を始めない。
- 既存の PWA ID と起動 URL は維持する。端末のブラウザ判定は申告情報に基づくため、セキュリティ上のアクセス制御ではない。

編集元は `assets-source/home-screen-entry.html`。ビルドの最初に `tools/sync-home-screen-entry.mjs` で `index.html` へ反映する。

`tools/check-home-screen-entry.cjs` は本番ビルドを使い、iPhone／Android の UA、320px・390px・横向き844px、保存された部屋の復帰表示、外部スクリプト未読込、案内切り替え、Android の追加イベント、ホーム画面起動の模擬、iPad のブラウザ起動を確認する。公開前チェックにも含める。

本番ビルドで上記テストと公開前チェック41項目を通過。案内表示中も Service Worker が登録され、Chromium の `Page.getInstallabilityErrors` が空であることを別途確認した。

実機での Safari／Chrome の共有メニュー、OS のインストール操作そのものは自動テスト対象外。機種やブラウザによって項目名が異なるため、画面内に Safari／Chrome で開く補足を付けている。
