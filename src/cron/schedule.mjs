// Per master-scope §8 — cron schedule registration.
// Phase 1 (count < 60): 2 fresh articles/day at 09:00 + 17:00 UTC.
// Phase 2 (count >= 60): 1 release at 09:00, 1 refresh at 17:00.
// Quality gate is the final word.
import cron from 'node-cron';
import { generateOrReleaseArticle } from './publish-article.mjs';

let _registered = false;

export function registerCrons() {
  if (_registered) return;
  if (process.env.AUTO_GEN_ENABLED !== 'true') {
    console.log('[cron] AUTO_GEN_ENABLED!=true; cron disabled');
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[cron] OPENAI_API_KEY missing; cron registered but jobs will fail-soft');
  }

  // Both slots try the queue first then generate fresh in their phase.
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] 09:00 UTC slot start');
    try {
      const r = await generateOrReleaseArticle({});
      console.log('[cron] 09:00 result', r);
    } catch (err) {
      console.error('[cron] 09:00 error', err);
    }
  });

  cron.schedule('0 17 * * *', async () => {
    console.log('[cron] 17:00 UTC slot start');
    try {
      const r = await generateOrReleaseArticle({});
      console.log('[cron] 17:00 result', r);
    } catch (err) {
      console.error('[cron] 17:00 error', err);
    }
  });

  _registered = true;
  console.log('[cron] registered: 09:00 UTC + 17:00 UTC daily');
}
