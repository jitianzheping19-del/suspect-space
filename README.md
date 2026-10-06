# SPACE SUSPECT

ブラウザで遊ぶオンライン人狼ゲームです。HTML・CSS・JavaScriptは `index.html` にまとめています。スマートフォンは横画面で使用してください。

## GitHub Pagesで公開する

1. GitHubでリポジトリを作成します。
2. このZIPを解凍し、中のファイルをリポジトリの一番上にアップロードします。ZIPそのものを置くだけでは公開されません。
3. リポジトリの **Settings → Pages** を開きます。
4. **Deploy from a branch** を選び、ブランチを `main`、フォルダーを `/ (root)` にして **Save** を押します。
5. Pagesに表示された公開URLを開きます。

npmのインストールやビルドは不要です。

## Firebaseの設定

ゲームには最新版HTMLに入っている既存のFirebase設定を引き継いでいます。Firebaseと外部ライブラリへ接続するため、インターネット接続が必要です。

- Firebase Authenticationの「メール／パスワード」認証を有効にしてください。ゲーム画面では名前だけを入力し、同じ名前は同じアカウントとして扱います。名前を知る人もそのアカウントを使用できます。
- Authenticationの設定にある「承認済みドメイン」に、公開先の `あなたのGitHubユーザー名.github.io` を追加してください。
- Realtime Databaseは、ゲーム内に収録した既存ルールを使用します。`database.rules.json` はそのルールをそのまま書き出したものです。GitHubへ置いてもFirebase側のルールは自動更新されません。
- 以前の匿名アカウントのデータは、まず元の端末で以前と同じ名前を使ってログインして引き継いでください。その後、別端末でも同じ名前でログインします。

## ファイル

| ファイル | 用途 |
| --- | --- |
| `index.html` | GitHub Pagesで表示するゲーム本体 |
| `index.docx` | HTMLと同じソースを収録したWordファイル |
| `database.rules.json` | ゲーム内の既存Realtime Databaseルール |
| `.nojekyll` | GitHub Pagesで静的ファイルをそのまま公開する指定 |

## 確認状況

最新版の画面・ゲーム処理・ソース構文・認証の模擬確認を実施しています。GitHubへのアップロード、Pagesでの公開、実Firebaseを使う別端末ログイン・オンライン対戦は、このパッケージ作成時には実行していません。
