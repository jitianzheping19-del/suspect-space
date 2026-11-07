# サッカーの高いシュートとバー際の判定

ベース: `2ae72b0`。2026-11-07の公開対象。

- コート床の「観戦・待機」を削除。
- 溜めるほどゴール上部へ向かうシュートに変更。十分に溜めた球は距離と空気抵抗を考慮して高さを合わせる。軽いシュートは低い軌道を維持。
- シュートの予測線にも同じ高さ計算を適用。
- キーパーが弾く球の横・前方向の速度と上方向の跳ねを弱める。
- オーバーヘッド・ボレーは左右の上部、ヘディングも高いコースを狙う。
- バー際でコート端の見えない壁が先に跳ね返す処理を修正。バーの実際の形状で反射し、球全体が枠内へ入った場合に得点。ゴール奥にも反発を設ける。

確認:

- `node tools/check-soccer-high-shots.mjs`: 両ゴール・通常/拡張コートの高さ、10/30/60Hzでバーに当たって入るオーバーヘッド、枠外・バー跳ね返りの非得点、キーパーの弱い弾き。
- `node tools/check-soccer-quality-scene.cjs`: 実際の3Dシュート予測線の高さ、床のラベル削除、キック描画と後処理。
- `node tools/check-soccer-quality.mjs`
- `node tools/check-soccer-goal-controls.mjs`
- `node tools/check-soccer-air.mjs`
- `node tools/check-soccer-finishes.mjs`
- `node tools/check-soccer-keeper-contact.mjs`
- `npm run build`
- `git diff --check`
