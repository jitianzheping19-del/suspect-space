/**
 * SPACE SUSPECT のHTMLソースをGoogleドライブ上のDOCXに変換します。
 * HTML全体を1つのGoogleドキュメントに入れると文字数上限を超えるため、
 * ファイルごとに行単位で分割し、複数のDOCXとして保存します。
 *
 * 実行方法:
 * 1. script.google.com で新しいプロジェクトを作成
 * 2. このファイルの内容を Code.gs に貼り付け
 * 3. exportGameHtmlToDocx を実行し、Googleドライブへのアクセスを許可
 * 4. 実行ログに表示されたフォルダURLを開く
 */

var GAME_REPOSITORY = "jitianzheping19-del/suspect-space";
var GAME_BRANCH = "main";
var SOURCE_HTML_FILES = [
  "space-suspect-complete.html",
  "index.html",
  "space-suspect-final.html"
];

// Googleドキュメントの文字数上限より余裕を持たせて分割します。
var MAX_CHARS_PER_DOCX = 800000;
var WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function exportGameHtmlToDocx() {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  var folder = DriveApp.createFolder("SPACE SUSPECT HTML DOCX " + stamp);
  var createdFiles = [];

  SOURCE_HTML_FILES.forEach(function (fileName) {
    var source = fetchGameHtml_(fileName);
    var chunks = splitSourceByLines_(source, MAX_CHARS_PER_DOCX);

    chunks.forEach(function (chunk, index) {
      var part = index + 1;
      var title = fileName + " " + part + "-" + chunks.length;
      var tempDoc = DocumentApp.create(title);
      var body = tempDoc.getBody();
      body.setText(
        "SPACE SUSPECT HTMLソース\n" +
        "元ファイル: " + fileName + "\n" +
        "分割: " + part + " / " + chunks.length + "\n\n" +
        chunk
      );
      body.editAsText().setFontFamily("Courier New").setFontSize(7);
      tempDoc.saveAndClose();

      var docxName = fileName.replace(/\.html$/i, "") + "-" +
        String(part).padStart(2, "0") + "-of-" +
        String(chunks.length).padStart(2, "0") + ".docx";
      var blob = DriveApp.getFileById(tempDoc.getId())
        .getAs(WORD_MIME_TYPE)
        .setName(docxName);
      var outputFile = folder.createFile(blob);
      createdFiles.push({ name: docxName, url: outputFile.getUrl() });

      // DOCXを書き出した後、変換用のGoogleドキュメントは片付けます。
      DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    });
  });

  console.log("DOCX保存先: " + folder.getUrl());
  createdFiles.forEach(function (file) {
    console.log(file.name + "  " + file.url);
  });
  return folder.getUrl();
}

function fetchGameHtml_(fileName) {
  var url = "https://raw.githubusercontent.com/" + GAME_REPOSITORY + "/" +
    GAME_BRANCH + "/" + encodeURIComponent(fileName);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(fileName + " の取得に失敗しました (HTTP " +
      response.getResponseCode() + ")");
  }
  return response.getContentText("UTF-8");
}

function splitSourceByLines_(source, maxChars) {
  var lines = source.split("\n");
  var chunks = [];
  var currentLines = [];
  var currentLength = 0;

  lines.forEach(function (line) {
    var piece = line + "\n";
    if (currentLength > 0 && currentLength + piece.length > maxChars) {
      chunks.push(currentLines.join(""));
      currentLines = [];
      currentLength = 0;
    }

    // 今のHTMLでは最長行も上限より短いですが、将来の長い行にも対応します。
    while (piece.length > maxChars) {
      var take = piece.slice(0, maxChars);
      currentLines.push(take);
      chunks.push(currentLines.join(""));
      currentLines = [];
      currentLength = 0;
      piece = piece.slice(maxChars);
    }

    currentLines.push(piece);
    currentLength += piece.length;
  });

  if (currentLines.length || !chunks.length) chunks.push(currentLines.join(""));
  return chunks;
}
