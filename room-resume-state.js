// A roster's x/z is its round spawn, while the presence profile carries the
// latest movement. Rejoining the same round must keep that movement sample.
export function matchResumePose(profile, player, startedAt, fallback) {
  const coordinate = n => n !== null && n !== '' && Number.isFinite(Number(n));
  const finitePose = p => p && coordinate(p.x) && coordinate(p.z);
  // Firebase's local write still contains this sentinel immediately after a
  // successful set(), until the corresponding server snapshot is delivered.
  const justConfirmed = profile?.updatedAt?.['.sv'] === 'timestamp';
  const fresh = justConfirmed || !Number(startedAt) || Number(profile?.updatedAt) >= Number(startedAt);
  const pose = finitePose(profile) && fresh ? profile : finitePose(player) ? player : finitePose(profile) ? profile : fallback;
  return {x:Number(pose.x), z:Number(pose.z)};
}

export function repairableOwnPresence({id, uid, profile, connected, leaving, disconnected}) {
  return id === uid && connected === true && !leaving && !disconnected &&
    profile?.online === false && profile?.disconnectMode === 'temporary';
}

export function isHostConnectionNotice(message) {
  const text=String(message ?? '');
  return /ホスト/.test(text) && /(接続|切断|受信|応答|復帰|コマンド|確認|取得)/.test(text);
}
