// Match assignment history uses Japan's calendar day for the daily priority.
const integer = value => Math.max(0, Math.trunc(Number(value) || 0));
export const rotationDay = at => new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function latestRotation(...records) {
  return records.filter(record => record && typeof record === 'object')
    .sort((a, b) => integer(b.updatedAt) - integer(a.updatedAt) || integer(b.games) - integer(a.games))[0] || {};
}

export function planImpostorRotation({humanIds, botIds = [], count, history = {}, profiles = {}, legacyStreak = {}, at, matchKey, randomInt}) {
  const day = rotationDay(at), records = {}, forcedCrewIds = [];
  for (const id of humanIds) {
    const previous = latestRotation(history[id], profiles[id]?.roleRotation);
    const streak = Math.min(2, integer(previous.streak ?? legacyStreak[id]));
    // Existing rooms with two consecutive assignments also receive a rest.
    const crewRemaining = Math.min(3, integer(previous.crewRemaining) || (streak >= 2 ? 1 + randomInt(3) : 0));
    records[id] = {day, games: previous.day === day ? integer(previous.games) : 0,
      impostorCount: previous.day === day ? integer(previous.impostorCount) : 0,
      streak, crewRemaining, updatedAt: integer(previous.updatedAt), lastMatch: String(previous.lastMatch || '')};
    if (crewRemaining) forcedCrewIds.push(id);
  }
  const pool = humanIds.filter(id => !records[id].crewRemaining), selectedIds = [];
  while (pool.length && selectedIds.length < count) {
    const fewest = Math.min(...pool.map(id => records[id].impostorCount));
    const candidates = pool.filter(id => records[id].impostorCount === fewest);
    const chosen = candidates[randomInt(candidates.length)];
    selectedIds.push(chosen); pool.splice(pool.indexOf(chosen), 1);
  }
  // Bots fill slots only when resting humans cannot be selected.
  const bots = [...botIds];
  while (bots.length && selectedIds.length < count) selectedIds.push(...bots.splice(randomInt(bots.length), 1));
  if (selectedIds.length < count) return {ok: false, selectedIds: [], forcedCrewIds, history};
  const next = {...history};
  for (const id of humanIds) {
    const previous = records[id], impostor = selectedIds.includes(id);
    const streak = impostor ? previous.streak + 1 : 0;
    next[id] = {...previous, games: previous.games + 1, impostorCount: previous.impostorCount + Number(impostor),
      streak, crewRemaining: impostor ? (streak >= 2 ? 1 + randomInt(3) : 0) : Math.max(0, previous.crewRemaining - 1),
      updatedAt: at, lastMatch: matchKey};
  }
  return {ok: true, selectedIds, forcedCrewIds, history: next};
}

export function rotationAllowsRole(id, role, forcedCrewIds) {
  return !forcedCrewIds.has(id) || (!!role && ['crew', 'angel', 'both'].includes(role.side)
    && !['madmate', 'madJester', 'blackCat'].includes(role.id));
}
