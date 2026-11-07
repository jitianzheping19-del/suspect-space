# ロード画面・サッカー操作修正（2026-11-07）

作業場所: `/workspace/soccer-ui-controls-2026-11-07`
ベース: `b65904a`（`/workspace/deploy-photo-nov1` から独立したコピー）
公開状況は GitHub Actions の対応するコミットの実行結果で確認。

## 変更

- ロード画面表示中は「使用」ボタンとその3D表示を隠す。完了済みの準備段階に合わせてゲージを滑らかに伸ばし、100%表示後に閉じる。
- サッカーの3D人数ディスプレイは青・赤の大きな数字に変更。「合計」「GK」行を削除し、画面上の `BOT 青…／赤…` 表示も削除。
- スタミナ表示の内側が `border-box` と余白で高さ0になっていた問題を修正。
- 攻撃時・ボールがない時の両方のダッシュボタンについて、持ち主変更で長押しを解除しない。スタミナ回復中も指の保持を維持し、回復後に再開。指を離す・キャンセル・退出時は停止。
- ボットは近い敵に塞がれたパスや、受取地点がマークされたパスを避ける。安全な遠距離・ゴール前へのフライパスは維持。
- ジョイスティックの中央位置をノブの実寸に合わせ、画面サイズ・設定サイズが変わっても中央に戻す。
- ジャンピングボレーは左足側を軸に溜め、腰と右足を回して蹴り、着地する動きへ変更。右足のボール接触補正を維持。

## 確認

以下は成功。

- `node tools/check-lobby-loading.cjs`
- `node tools/check-soccer-stamina-keepers.mjs`
- `node tools/check-soccer-bot-teamplay.mjs`
- `node tools/check-soccer-finishes.mjs`
- `node tools/check-soccer-hold-stick.cjs`
- `node tools/check-soccer-object-controls.cjs`
- `VISUAL_SHOTS=verification/volley node tools/check-soccer-stamina-scene.cjs`
- `node tools/check-soccer-world-controls.cjs`
- `npm run build`
- `git diff --check`

タッチ操作は390×844、844×390、568×320、1024×768相当で確認。
ボレーの描画画像は `verification/volley/`、コートの描画画像は `verification/arena-release/court.png`。
生成された全4エントリは同一。埋め込みデータの変更はロビーのみ。
