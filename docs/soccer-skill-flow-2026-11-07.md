# 移動と方向入力を続けられるサッカーの技

2026-11-07の公開対象。高いシュート・キーパーの弾き・床ラベル削除と合わせて公開。

- ダブルタッチ、ルーレット、シザース、キックフェイント、ヒールリフト、股抜きの間も通常移動を有効にする。
- スティック/キー操作が入ったらその技の移動は入力で操作する。方向転換・後退・停止ができ、指を離した際に未消化の自動移動が発生しない。
- ボールのタッチとヒールリフトの放出方向は最新のプレイヤー姿勢へ追従。描画側も現在の向きへ技のポーズを重ねる。
- 初動のボール接触後は、回復ポーズの完了を待たずにパス・シュートへ移行できる。ダッシュも継続できる。
- 小さな接触補正で移動入力を消さない。地形・プレイヤーとの衝突判定は維持。
- ボールを奪われれば技を中断。スライディング・転倒・空中フィニッシュなどの制約は維持。
- 技の実行待ちの間に向きを変えた場合も、実行時点の向きを使用。操作ガイドにも説明を追加。

確認成功:

- `node tools/check-soccer-skill-flow.mjs`: 6技、60/20/10Hzの姿勢配送、向きとボール追従、早いパス/シュート移行、所持喪失。
- `node tools/check-soccer-skill-flow-scene.cjs`: スマホ縦/横・キーボードで移動中の開始、技途中の方向変更/後退/停止、ポーズ復元。
- `node tools/check-soccer-hold-stick.cjs`: 4画面サイズで2本指の移動とフェイント、実行時点の向き、ダッシュ長押し、ジョイスティック中央復帰。
- `node tools/check-soccer-skill-scenes.cjs`: 静止状態の技、ボール軌道、足の接地、描画復元、ゴールネット。
- `node tools/check-soccer-advanced.mjs`
- `node tools/check-soccer-bot-teamplay.mjs`
- `node tools/check-soccer-close-control.mjs`
- `node tools/check-soccer-press.mjs`
- `node tools/check-soccer-stamina-keepers.mjs`
- `node tools/check-soccer-finishes.mjs`
- `node tools/check-soccer-high-shots.mjs`
- `npm run build`
- `git diff --check`
