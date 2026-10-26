function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SPACE SUSPECT')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getUrl() {
  return ScriptApp.getService().getUrl();
}
