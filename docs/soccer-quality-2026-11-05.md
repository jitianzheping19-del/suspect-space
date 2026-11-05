# サッカー品質改善（2026-11-05）

基準コード: d8a64f0。専用コピー `/workspace/soccer-quality-2026-11-05` 内で実装・検証。

eFootballの完全再現を裏付ける公開試合エンジンは今回の検索では確認できなかった。eFootball名義の管理ツール、紹介サイト、単純なデモは試合エンジンと区別した。固有のコード・モデル・モーションのコピーは行わず、このゲームのクルーとフットサルコート向けに実装している。

## 実際に読んだ参考資料

- Google Research Football: [humancontroller.cpp](https://github.com/google-research/football/blob/master/third_party/gfootball_engine/src/onthepitch/player/controller/humancontroller.cpp)。キック入力、キックの取り消し、接触待ち、プレスの入力を分ける設計を参照。
- 同 [ball.cpp](https://github.com/google-research/football/blob/master/third_party/gfootball_engine/src/onthepitch/ball.cpp)。回転による軌道変化の考え方を確認。本作では軽量な速度ベクトルの回転と減衰で独自実装。
- Tiny-Boatball: [enemy-boat.lua](https://github.com/sacemakesgame/Tiny-Boatball/blob/main/objects/enemy-boat.lua)、[ball.lua](https://github.com/sacemakesgame/Tiny-Boatball/blob/main/objects/ball.lua)。ボールとゴールの位置から接近位置を決める方式、力の付与と再使用待ち、接触に連動する演出を調査。
- agh-car-football: [script.js](https://github.com/wowu/agh-car-football/blob/master/js/script.js)。Three.js系物理ゲームの速度・角速度のリセット、インパルスを調査。人型のモーションの参考にはしていない。
- [eFootball v5.0公式更新説明](https://www.konami.com/efootball/ja/page/v5/versioninfo_v5-00)。キックキャンセル、フェイント中の守備反応、ドリブルの加速、マッチアップとプレスの使い分けを確認。

## 実装

- 左右の蹴り足をボールと狙いの位置関係から選ぶ。構え、振り抜き、回復とホストの接触時刻を共通化。軸足、上半身、両腕も連動。
- 接触前にボールを奪われた予約キックを取り消す。
- シュート操作を曲げるとカーブシュート。左右で鏡対称、回転が徐々に減衰し、速度の大きさに余計なエネルギーを足さない。ホストが回転値を検証。
- カーブの予測線は同じ回転・重力・減衰処理から計算。指を離すと消える。
- シュート準備中、または短いタップの送信待ち中にフェイントを押すとキックフェイント。後の指離しでキックを重複発動しない。
- フェイントの回避判定を実際に方向を変える時間帯に限定。
- プレスの追走目標を140ms間隔で更新。踏み込み中は目標を固定。入力による手動の方向調整は即時。
- ボットも同じ追走目標を使い、空振り・フェイントを受けた後は移動を抑えて回復する。
- セーブ、スライディング、ヘディング等の接触で前のキックの回転を消す。

## 検証

- `node tools/check-soccer-quality.mjs`: 左右の足、接触時計、奪取後の予約キック、入力検証、10/30/60Hzのカーブ、左右対称、エネルギー保存、回転の消失。
- `node tools/check-soccer-quality-input.cjs`: 390×844 / 844×390 / 1024×768の実タッチ。二本指のキックキャンセル、送信待ちキャンセル、カーブと直線、pointercancel。
- `node tools/check-soccer-quality-scene.cjs`: 実際のThree.jsシーンで両足の接触、姿勢復元、カーブ予測線、撮影。
- 既存のadvanced / press / air / finishes / defense / close-control / kickoffルール、input-network / press-network / charge / defense-ui / finishes-uiを確認。
- 初回公開ビルド成功。追加変更後に再検証予定。

`check-soccer-flick.cjs` は旧方式の画面全体フリックを前提にした古いテストなので、新しいボタン方式は上記の実タッチテストで検証。別作業コピーにある `check-soccer-aim.mjs` はこの基準コミットには含まれていない。


## 二巡目

- 同じ狙いのコーン内でパスコースの相手を評価し、空いている味方を優先する。明示した方向から外れる相手には補助しない。
- 味方ボットはパスの通りやすさ・相手との距離・味方との重なりから受ける位置を選ぶ。350msごとに判断し、細かな目標の揺れを抑える。
- キーパーもカーブの軌道を予測。描画ガイド・予測・実際のボールで重力、回転、減衰、バウンドを共用。
- 地上の強いパスを受けた際、短い足の引き込みと重心の動きを加える。直後のダイレクトパスは妨げない。
- [AIfunctions.cpp](https://github.com/google-research/football/blob/master/third_party/gfootball_engine/src/onthepitch/AIsupport/AIfunctions.cpp) の入力方向によるパス先評価と、受け手の動きを加味する考え方も調査。コードの取り込みはない。
- `check-soccer-tactics.mjs`、`check-soccer-quality-network.cjs` を追加。実際の2クライアントでWebRTC経由／Firebase代替経由のカーブと重複抑止を確認。
- `check-soccer-air-scene.cjs`、`check-soccer-press-scenes.cjs`、`check-soccer-skill-scenes.cjs` で既存の描画・追走・衝突・姿勢復元も確認。

## 三巡目

- 守備に「マッチアップ」を追加。長押しで相手との距離を保ち、近すぎると下がる。タックルは出さず、スティックによる位置取りができる。プレスに切り替えると接触を狙う。
- 追走・マッチアップの入力は既存の順序付き継続通知と期限で管理。指離し、画面を離れる、所持者変更で止まる。
- 相手をかわした後の回復中に守備モードを変えても、回復待ちを飛ばせない。疲労は時間の累積なので、モード変更で回復しない。
- 追加ボタンはプレス・スライディングと重ならない配置。390×844 / 844×390 / 568×320 / 1024×768で確認。
- 実際のシーンで間合い約2.2を維持し、奪取せず指離しで停止することを確認。
- `tools/render-soccer-quality-preview.cjs` から実シーンの動作確認動画を生成。

## 接触の効果音

- キック、プレスでの接触、スライディング、セーブ、ゴールの確定イベントから効果音を生成。外部の音源素材は使用していない。
- 既存の効果音音量スライダー／保存設定を参照。ユーザー操作後に音声を準備し、ミュート中・サッカー場外・非表示時は鳴らさない。
- 同じイベントの再受信、古い状態の再表示で二重再生しない。未来の接触時刻は待つ。

確認済みの記録: 2026-11-05。公開ビルドを再実行して成功。追加のWeb Audio実機APIテストも、ミュート、操作による有効化、重複・古いイベント抑止、終了時の解放まで成功。上記は自動ブラウザ・シミュレーションでの確認で、実端末を使った人間による対戦調整は未実施。


追加調査: [Unity Football Animation Demo](https://github.com/hyunjuc/unity-football-motion-demo)。README、PlayerMovement.cs、NPCFollower.csを確認。入力の大きさ・移動速度をアニメーションの歩行／走行に反映し、NPCにも同じモーションを使う構成を参照候補とした。Unity素材やアニメーションクリップの取り込みはない。[football-match-viewer](https://github.com/immament/football-match-viewer) はThree.jsによる試合データ再生、[football-game-animation-clips](https://github.com/elshereif/football-game-animation-clips) は選択式のアニメーション作品で、対戦エンジンとは区別して調査した。

実装の保存点: `d3e7617`。動画の元データ: `verification/soccer-quality/soccer-quality-preview.mp4`。

## 継続検証と公開用動画

- `node tools/check-soccer-long-match.mjs`: 2人・6人・20人で各2分間、10/30/60Hzを混在させて完走。ボールの座標・速度・得点の整合性と、状態をシリアライズした後の継続を確認。
- `SOCCER_NETWORK_JITTER=1 node tools/check-soccer-quality-network.cjs`: 2つのブラウザで実ランタイムを実行し、テスト用の通信経路に30〜180msの遅延・順序逆転・欠落・重複を注入。データベース代替経路にも90msの遅延を追加。
- 通信テストのWebRTC/Firebaseはテスト用トランスポートで再現。実サービスへの接続や実端末同士の対戦は未実施。
- 公開動画: [動作確認ページ](https://jitianzheping19-del.github.io/suspect-space/preview/soccer-quality-2026-11-05.html) / [MP4](https://jitianzheping19-del.github.io/suspect-space/preview/soccer-quality-2026-11-05.mp4)。キックフェイント、ダブルタッチ、ルーレット、ヒールリフト、カーブシュートを順に収録。
- 継続検証は成功。キック・守備の実タッチ、3D接触・姿勢復元、効果音、既存の空中操作・スライディング・キックオフも再確認し、公開用ビルドが成功。ビルド済み動画ページで10秒のMP4再生、途中への移動、スマホ幅の表示を確認。
