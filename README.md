# SPACE SUSPECT

ブラウザーで遊ぶオンライン人狼ゲームです。GitHub Pagesで公開し、スマートフォンは横画面でのプレイを推奨します。

## GitHub Pagesで公開する

1. Settings → Pages → Build and deployment → Source を **GitHub Actions** にします。
2. Settings → Secrets and variables → Actions に次の Repository secrets を登録します。
   - `SKYWAY_APP_ID`
   - `SKYWAY_SECRET_KEY`
3. `main` ブランチへ更新をpushすると、`.github/workflows/pages.yml` がビルドしてGitHub Pagesへ公開します。
4. Pagesに表示されたURLを開きます。

ビルドはGitHub Actions上で行うため、開発者のPCにNode.jsを入れる必要はありません。公式SkyWay AI Noise Cancellerの取得にもActions Secretsを使います。キーはHTMLや公開ファイルに書きません。

## Firebaseの設定

Firebase Authenticationのメール／パスワード認証を有効にし、公開先の github.io ドメインを承認済みドメインへ追加してください。初回アカウント作成時だけ名前を入力し、次回から4桁PINでログインします。

Realtime Databaseのルールは database.rules.json にあります。GitHub Pagesへ置いただけではFirebaseへ反映されません。Firebase Consoleのルールが .read: true または .write: true なら、認証していない第三者を含めてデータの読み書きが可能です。database.rules.json の内容へ置き換えてください。

## ファイル

| ファイル | 用途 |
| --- | --- |
| index.html | GitHub Pagesで表示するゲーム本体 |
| index.docx | HTMLソースを収録したWordファイル |
| space-suspect-complete.html | 完成版HTML |
| space-suspect-complete.docx | 完成版HTMLのWordコピー |
| database.rules.json | Realtime Databaseルール |
| `.github/workflows/pages.yml` | GitHub Actionsのビルド・Pages公開設定 |

## 確認状況

全HTMLコピーと埋め込みスクリプトの構文を確認し、ブラウザーでゲーム本体と隔離した3Dロビーの起動を確認しました。Firebase Emulatorでdatabase.rules.jsonの読み込みも確認しました。実Firebaseのアカウントでの複数端末ログイン・部屋参加・会議対戦は未確認です。

## セキュリティ上の制約

- 4桁PINは総当たりに弱く、個人情報を守る認証には使えません。クライアント側だけでは試行回数を確実に制限できません。
- 現在の部屋ルールは、認証済みユーザーに部屋全体を読み取り許可しています。ゲーム状態に全員分の役職が含まれるため、参加者は開発者ツールから役職を読めます。役職を隠すには、プレイヤーごとの非公開データと信頼できるサーバー処理への再設計が必要です。
- ゲームの進行判定はホストのブラウザーで実行しています。ホストの改造や切断に耐える完全な不正対策には、サーバー権威型の処理が必要です。
- 管理者は特定のFirebase Auth UIDに限定し、画面側とRealtime Databaseルール側の両方で確認します。UIDは秘密情報ではなく、権限はFirebase Authenticationで検証したUIDに結び付いています。ルールの変更はFirebaseへ別途公開する必要があります。
- Firebase Web APIキーはブラウザー公開用です。Admin SDKの秘密鍵をHTMLやGitHubへ置かないでください。
- FirebaseのルールはGitHubへの更新だけでは変わりません。現在Consoleに設定されている公開ルールはFirebase ConsoleまたはFirebase CLIから別途更新してください。

## HTMLの軽量化と埋め込みデータの編集

歩行・使用ボタン・視界・The Skeld電気室の調整、および未使用コードの削除とアセット圧縮の内容は [更新・削減一覧](OPTIMIZATION-2026-10-16.md) を参照してください。

ゲームのソースは単一HTMLですが、SkyWay AI Noise Cancellerのnpmライブラリを取り込むため、公開時にGitHub Actions上でViteビルドします。埋め込みアニメーション等を編集する場合は、Node.jsの開発用ツールで展開できます。

```sh
node tools/embedded-assets.mjs unpack space-suspect-complete.html /tmp/space-suspect-assets
node tools/embedded-assets.mjs pack space-suspect-complete.html /tmp/space-suspect-assets updated.html
```

互換用のgzip展開処理に使用したfflateのライセンスは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記載しています。
