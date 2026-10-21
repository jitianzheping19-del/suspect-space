# Firebaseルールの反映

ゲームの公開とは別に、招待機能のために一度だけ反映してください。Node.jsは不要です。

1. [Firebase Console](https://console.firebase.google.com/project/among-us-c7bae/database)を開く。
2. 「Realtime Database」→「ルール」を開く。
3. 今のルールをコピーして手元に保存する。
4. [修正版のルール全文](https://raw.githubusercontent.com/jitianzheping19-del/suspect-space/main/database.rules.json)をコピーし、ルール欄全体を置き換える。
5. 「公開」を押す。

変更は、オンライン一覧と招待で必要な項目の許可、および招待のWebRTC接続用シグナリングです。シグナリングは送受信者に限定し、送信者とホスト、部屋の作成時刻を照合します。接続情報は接続終了時・切断時に削除し、古い通知は処理しません。

ルールの公開前でもゲームは動きますが、新しいWebRTC招待経路は使えません。通常の招待も、現在公開されているルールに左右されます。

作業環境にはFirebaseのルールを公開する認証情報がないため、ルールの公開は未実施です。

## 管理者の部屋削除

0人の部屋は管理者にだけ表示します。管理者の削除操作は、部屋本体と一覧用データを同時に削除します。

Firebase側の許可はWebページの更新だけでは変更されません。上記の手順で最新版のルール全文を公開すると、管理者UID `dUAYnvjlbvTUluFXyQkTsAFMs1c2` に限って `rooms/$room` と `roomSummaries/$room` の削除が許可されます。一般プレイヤーに部屋の強制削除権限は与えません。
