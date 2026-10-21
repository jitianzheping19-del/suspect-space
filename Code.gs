// Google Apps ScriptでゲームHTMLをDOCXに変換して、Google Driveへ保存します。
function exportGameHtmlToDocx() {
  var url = "https://raw.githubusercontent.com/jitianzheping19-del/suspect-space/main/space-suspect-complete.html";
  var html = UrlFetchApp.fetch(url).getContentText("UTF-8");
  var folder = DriveApp.createFolder("SPACE SUSPECT DOCX");
  var parts = splitHtml_(html, 800000);

  parts.forEach(function (text, i) {
    var doc = DocumentApp.create("SPACE SUSPECT HTML " + (i + 1));
    var body = doc.getBody();
    body.setText(text);
    body.editAsText().setFontFamily("Courier New").setFontSize(7);
    doc.saveAndClose();

    var name = "space-suspect-complete-" + (i + 1) + ".docx";
    var blob = DriveApp.getFileById(doc.getId())
      .getAs("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      .setName(name);
    folder.createFile(blob);
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  });

  Logger.log("作成したDOCX: " + folder.getUrl());
}

function splitHtml_(text, limit) {
  var parts = [];
  while (text.length > limit) {
    var cut = text.lastIndexOf("\n", limit);
    if (cut < 1) cut = limit;
    parts.push(text.slice(0, cut + 1));
    text = text.slice(cut + 1);
  }
  parts.push(text);
  return parts;
}
