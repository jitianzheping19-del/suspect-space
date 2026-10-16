# 歩行・視界・The Skeld・HTML整理 — 2026-10-16

| 指標 | 更新前 | 更新後 | 削減 |
| --- | ---: | ---: | ---: |
| HTML文字数（Unicode文字） | 2,999,294 | 2,200,294 | 26.6% |
| HTMLファイルサイズ（UTF-8） | 3,079,900 bytes | 2,272,559 bytes | 26.2% |

比較元はコミット `95b2dc4`。Git履歴から更新前の版へ戻せます。

## 削除した未使用のシステム

| 項目 | 削除の根拠と範囲 |
| --- | --- |
| 旧ローカル練習・チュートリアルのシミュレーション | 画面のHTMLが存在せず、起動判定も常にfalse。専用BOT、専用2Dタスク・会議、移動ループ、キー・タッチ監視と専用CSSを撤去。現行ゲームの入力は維持。 |
| 未使用のキルデモ `KILL_ATTACK_SRCDOC` | 宣言外に参照がない旧デモを削除。実際に表示する被害者用デモは維持。 |
| 停止済みのマップ上キル演出 | `createKillImpactVisual` と `updateCauseDeathVisuals` は冒頭returnで停止済み。その到達しない本体と空の演出管理マップ・更新ループを整理。呼び出し先は空関数として維持。 |
| 旧タスクの未参照起動関数6個 | `openReactorTask`、`openCardTask`、`openWireTask`、`openNumberTask`、`openUploadTask`、`openFuelTask`。現在の3Dタスク端末へ繋がる経路は維持。 |
| 未参照の役職UI・設定の重複 | `ssxControlOpenTargets`、`ssxControlOpenCurse`、`roleCategoryTotals`、`ssxIsNecromancer`、`MOD_ROLE_DEFAULTS`。現行の能力・詳細設定の処理は別に存在し、そのまま維持。 |
| その他の未参照ヘルパー・変数 | `spawnMapFx`、`applyCommandInboxPlayer`、`resetNamedProfile`、`isLobbyCircuitDoorSpawn`、`openLeaveConfirm`、`TASK_INSTRUCTIONS`、未使用Fog2個と旧クールタイム等の変数。宣言外の参照と文字列からの参照を照合して削除。 |

削除対象の判定はASTで参照箇所を調査し、文字列中の参照も追加照合。自動生成される画面やwindowへ公開される関数は、単に名前が少ないという理由では削除していません。

## 見た目を変えずに圧縮したデータ

ロビー、3D会議室、被害者用の役職演出、変装用コスチュームの共有コード、追放の予備演出、画面に表示するFirebaseルールを、1つのgzip形式JSONとしてHTML内へ埋め込みました。

- データ本体：892,269 bytes → gzip 195,693 bytes。HTMLへの埋め込みはBase64 260,924文字。
- 展開はブラウザー標準の `DecompressionStream` を優先。未対応・失敗時はHTML内のfflate gunzip処理を使用。
- 追加のネットワークリクエストや配信サーバーは不要。ゲームは従来どおり単一HTMLで動作。
- 圧縮前後の全9グループをSHA-256で照合。標準展開、互換展開、標準展開が失敗する場合の3経路で一致。
- マップ切り替え、レース、3Dタスク、現行アニメーション、オンライン同期、通話・認証、設定保存のコードは維持。
- WebGLが使えない場合などのタスク用フォールバックは削除していません。

## 動作と表示の変更

- 歩行の足運びを移動距離から計算。接地中は移動に逆らって足を戻し、滑りを抑制。歩行周期にあった固定の上限を削除。
- 手の振りは最大0.035 rad（約2度）。体を揺らさず、ズボンは脚の位置・向き・長さへ追従。
- iPadの使用ボタンは高さ68px、PCは64px。iPhoneは従来の高さを維持。ロビーの使用ボタンにも同じ調整。横向きiPhoneのロビーでは、ゲーム開始・部屋設定との重なりを避けて使用ボタンを右側へ配置。
- 使用ボタンのラベルは4文字まで。文字幅とボタン枠を測って文字サイズを調整。「バイタル」「カメラ」「車を出す」「着替え」などを表示。
- 視界マスクを最近傍補間・二値しきい値から線形補間・アンチエイリアス付き境界へ変更。円周のサンプルも128から256へ増やし、点・ギザギザの境界を滑らかに。
- The Skeld電気室に中央の配電盤バンクと配線を追加。家具の見た目・衝突判定・視界遮蔽を同じ寸法で構成。右側の回り込み通路とタスク・照明スイッチ・ベントへの接近を確認。

The Skeldの配置参考：[Yappy氏によるゲーム内スクリーンショット付きガイド](https://steamcommunity.com/sharedfiles/filedetails/?id=2209446270)。画像をゲーム素材として転載せず、自前のThree.jsオブジェクトで構成しています。

## 確認した範囲

- iPhone 844×390、iPad 1024×768、PC 1280×800のブラウザー表示：4文字の収まり、画面外へのはみ出し、使用ボタンと隣接ボタンの重なり。
- 通常マップ・ロビーの歩行：30・60・120fpsで歩行周期が一致。接地中の足の滑り、手の最大角度、停止姿勢、ズボン追従を確認。
- 電気室：配電盤の衝突と視界遮蔽、右通路の通行、タスク・スイッチ・ベントの位置。
- 視界：線形補間と滑らかな境界、ホークアイの広域描画。
- HTMLと埋め込みアセット内のスクリプト47個の構文。
- 圧縮済みのゲームHTMLを実際にブラウザーで読み込み、Three.jsとログイン画面がエラーなく起動。

端末表示の確認はChromiumでの画面サイズ・タッチ入力のエミュレーションです。実機Safariと、実Firebaseでの複数端末対戦・通話の再検証は今回の確認範囲に含みません。

## 埋め込みデータの編集

リポジトリの `tools/embedded-assets.mjs` は開発用です。Node.js以外の追加インストールは不要です。

```sh
node tools/embedded-assets.mjs unpack space-suspect-complete.html /tmp/space-suspect-assets
# 展開したHTML・JS・JSONを編集
node tools/embedded-assets.mjs pack space-suspect-complete.html /tmp/space-suspect-assets updated.html
```

展開→再圧縮を無編集で行った場合に、元HTMLとバイト単位で一致することを確認しています。
