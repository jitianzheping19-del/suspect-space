export function preferredAdminHost(players, currentHost, adminUids) {
  const eligible = id => adminUids.has(id) && players[id]?.online === true && !players[id]?.bot;
  if (eligible(currentHost)) return currentHost;
  return [...adminUids].filter(eligible).sort()[0] || '';
}
