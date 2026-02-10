import { players } from './schema';

export async function seedPlayers(db: any): Promise<void> {
  await db
    .insert(players)
    .values({
      username: 'dev_player',
      displayName: 'Dev Player',
      status: 'active',
    })
    .onConflictDoNothing({ target: players.username });

  console.log('[module-players] Seeded 1 default player');
}
