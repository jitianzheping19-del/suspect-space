# フリック式サッカー

GitHub検索（2026-11-03）では、eFootballの試合システムを完全再現した公開プロジェクトは確認できなかった。
`Fair00z/eFootball-2025` はReactサイト、`albin-pious/efootball-clone-website` は紹介サイトで、試合エンジンの参考として採用していない。

参考資料：

- [Google Research Football](https://github.com/google-research/football)（Apache-2.0表示、Gameplay Footballベース）。[humancontroller.cpp](https://github.com/google-research/football/blob/master/third_party/gfootball_engine/src/onthepitch/player/controller/humancontroller.cpp) のキック種別・入力方向・パワーゲージ・接触待ちを分ける設計を参考にした。
- [Tiny-Boatball](https://github.com/sacemakesgame/Tiny-Boatball)（コードMIT、画像・モデルは別ライセンス）は物理サッカーの候補として調査。素材・コードの組み込みはなし。
- [eFootball v5.0公式説明](https://www.konami.com/efootball/ja/page/v5/versioninfo_v5-00) のルーレット、トラップ、パス・守備の説明を確認。

ゲーム固有のアニメーションやコードは流用せず、このゲームのクルー・コートに合わせた独自実装。

## 操作

画面右側を使用。アクションボタンは表示しない。

|入力|動作|
|---|---|
|短くまっすぐフリック|指定方向の味方へグラウンダーパス。味方がいなければその方向へ蹴る|
|280ms以上押してからフリック|シュート。押す長さでパワー、フリックで方向|
|横→上|ダブルタッチ（左右対応）|
|半円|ルーレット（左右回転）|
|下→上|ヒールリフト|

上記は本ゲームの操作割り当てで、eFootballの操作を完全再現したものではない。
PCでは操作領域へフォーカス後、X/Cでパス/シュート、Q/E/Rで各技、Shiftで左右切替。

## 同期と物理

ホストが所持・距離・クールダウン・入力値を検証し、技IDと開始時刻を配信する。
ボールは共通時刻の接触カーブに追従し、足から離れる時点で物理速度を与える。
相手に奪われる、離脱する、距離が離れると保持中の技を中止する。
ヒールリフトは後方へ寄せてから上方へ蹴り上げ、重力で落下する。
描画だけの足・腕・体の姿勢は描画後に戻し、移動・当たり判定を変えない。

検証：`node tools/check-soccer-advanced.mjs`、`node tools/check-soccer-flick.cjs`、既存のボール・写真ルール検証とThree.js描画確認。
