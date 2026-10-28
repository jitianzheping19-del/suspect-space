# 課金スキン20種類・ガチャ演出・全役職確認（2026-10-28）

追加20種類をすべて、実際の試合用／ロビー用カプセル体形に合わせた衣装へ統一した。既に改良済みの先頭5種類も、専用の立体オーラを加えて今回の検証に含めている。元から存在する8種類のプレミアム装備は変更していない。

## モデルと演出

- 胴体に沿う布、顔を遮らない襟と帽子、実際の腕・脚への袖と靴の追従。
- 20種類ごとに異なる背面装備・素材・動く装飾・立体オーラ。DJは音の波、養蜂家は六角形、クラゲは触手、折鶴は折紙、車掌はランタンなど。
- 静止部分は材質別にまとめ、オーラは InstancedMesh を使用。スマホでは形状・粒子数を削減。衣装を外す際には instanceMatrix / instanceColor の解放を含めて dispose する。
- 通常ガチャに光の軌道と開封演出を追加。特別ガチャは黄金の装飾が開き、光の尾・光柱・紋章とともに、実際に当たったスキンが登場する。登場時には中心光と惑星の破片を薄くし、装備を白く覆わないようにした。
- 演出は既存のレンダラーと描画ループを共有する。結果・消費枚数・確率は変更しない。
- スマホ縦画面の抽選ボタンのはみ出しと、結果画面の横幅を修正。

## 確認範囲

`tools/check-all-roles.cjs` は、現在の index.html を起動し、実際の hostTick・役職フック・死亡・勝利処理を通す。通信先だけをメモリ内の Firebase 代替へ差し替える。74個の選択可能役職に、クルーメイト／通常インポスター／サイドキック／レヴェナントを加え、180項目を確認した。

- 全役職の表示、名称、クールダウンの有効値。
- 各能力の正常な発動と状態変化、観戦者からの能力拒否。
- シールドの消費、身代わり、投票時の勝利、猫の道連れ、ミニの成長防御、サイドキックの昇格。
- 捕獲・拉致・チャージ・遅延攻撃の完了、全員の5秒停止と解除、変身の終了、テレポート、時間切れの自滅、ドローン帰還。
- アーソニストとイーターの勝利、妖狐と神の終了時勝利。

追加役職24ケース、ミニ、コンジュラー、波動砲、試合開始／会議後の状態、キル演出の完了待ち、会議の3D描画も別テストで確認した。古いテストが想定していた「発動後もコンジュラーの陣が残る」「通常キルの演出で部屋全体を止める」などの期待値は現行の仕様に更新し、不足していたテスト用の初期化も補った。この対応で本体の役職仕様は変更していない。

スキンは20種類×試合／ロビーの両体形で正面・斜め・背面を撮影し、顔の遮蔽、歩行時の追従、形状の数値、繰り返し着替えた後のリソース数を確認。スマホ向けモデルは両体形のジャンプ姿勢とインスタンス数を含む描画量を別途確認。

端末向けの衣装だけを数えた最大値は47メッシュ、スマホ用はインスタンスを含め31,690三角形。GPUの解放は20種類すべてでイベントを確認した。

ガチャは390×844、844×390、1024×768、1366×768で操作、1連・10連、レアリティの上昇、結果順、開き直し、アカウントリセット、動きを減らす設定を確認する。演出の各段階は別の決定的な描画時計でも撮影する。

実際のFirebaseを介した複数端末での対戦、全役職の全組合せは未検証。本番へのデプロイは行っていない。

## 再実行

```sh
npm run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173
node tools/check-all-roles.cjs
node tools/check-role-expansion.mjs
node tools/check-role-mini.mjs
node tools/check-round-state.mjs
node tools/check-conjurer-ability.mjs
THREE_MODULE_PATH=/workspace/emergency-3d-revision/three.module.js node tools/check-wave-cannon.mjs
node tools/check-kill-presentations.mjs
node tools/check-role-expansion-browser.cjs
node tools/check-tailored-premium.cjs
node tools/check-gacha-planet.cjs
node tools/check-premium-ceremony.cjs
node tools/check-gacha-cinematic-frames.cjs
```

プレビューと検証ログ: `/workspace/artifacts/premium-complete-2026-10-28/`。
