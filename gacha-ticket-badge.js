export function updateGachaTicketBadge(badge, wallet, failed = false) {
 if (failed) {
  badge.textContent = 'ガチャを再試行';
  badge.title = '読み込めませんでした。押すと再試行します。';
 } else {
  badge.replaceChildren(...[['通常', wallet?.tickets], ['特別', wallet?.premium]].map(([label, count]) => {
   const column = document.createElement('span'), name = document.createElement('small'), value = document.createElement('strong');
   column.className = 'gachaTicketBalance';name.textContent = label;value.textContent = `${count ?? '—'}枚`;
   column.append(name, value);return column;
  }));
  badge.title = `通常チケット ${wallet?.tickets ?? '確認中'}枚 / 特別チケット ${wallet?.premium ?? '確認中'}枚`;
 }
 badge.setAttribute('aria-label', badge.title);
}
