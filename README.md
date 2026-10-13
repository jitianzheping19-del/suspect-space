# SPACE SUSPECT

ブラウザーで遊ぶオンライン人狼ゲームです。GitHub Pagesでは index.html を公開します。スマートフォンは横画面でのプレイを推奨します。

## GitHub Pagesで公開する

1. リポジトリの一番上にHTMLと関連ファイルを置きます。
2. Settings → Pages を開きます。
3. Deploy from a branch を選び、main ブランチと /(root) を指定して保存します。
4. Pagesに表示されたURLを開きます。

ビルドやnpmのインストールは不要です。

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

## 確認状況

全HTMLコピーと埋め込みスクリプトの構文を確認し、ブラウザーでゲーム本体と隔離した3Dロビーの起動を確認しました。Firebase Emulatorでdatabase.rules.jsonの読み込みも確認しました。実Firebaseのアカウントでの複数端末ログイン・部屋参加・会議対戦は未確認です。

## セキュリティ上の制約

- 4桁PINは総当たりに弱く、個人情報を守る認証には使えません。クライアント側だけでは試行回数を確実に制限できません。
- 現在の部屋ルールは、認証済みユーザーに部屋全体を読み取り許可しています。ゲーム状態に全員分の役職が含まれるため、参加者は開発者ツールから役職を読めます。役職を隠すには、プレイヤーごとの非公開データと信頼できるサーバー処理への再設計が必要です。
- ゲームの進行判定はホストのブラウザーで実行しています。ホストの改造や切断に耐える完全な不正対策には、サーバー権威型の処理が必要です。
- 管理者は特定のFirebase Auth UIDに限定し、画面側とRealtime Databaseルール側の両方で確認します。UIDは秘密情報ではなく、権限はFirebase Authenticationで検証したUIDに結び付いています。ルールの変更はFirebaseへ別途公開する必要があります。
- Firebase Web APIキーはブラウザー公開用です。Admin SDKの秘密鍵をHTMLやGitHubへ置かないでください。
- FirebaseのルールはGitHubへの更新だけでは変わりません。現在Consoleに設定されている公開ルールはFirebase ConsoleまたはFirebase CLIから別途更新してください。
