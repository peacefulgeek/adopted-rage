// Per master-scope §8 — cron schedule registration.
// Phase 1 (count < 60): 2 fresh articles/day at 09:00 + 17:00 UTC.
// Phase 2 (count >= 60): 1 release at 09:00, 1 refresh at 17:00.
// Plus monthly ASIN re-verification at 04:00 UTC on the 1st of each month.
// Quality gate is the final word.
import cron from 'node-cron';
import { generateOrReleaseArticle } from './publish-article.mjs';
import { runAsinVerificationJob } from './verify-asins.mjs';

let _registered = false;

export function registerCrons() {
  if (_registered) return;

  // ─── ASIN re-verification cron — independent of AUTO_GEN_ENABLED ───
  // This is a read-only health check; it has no AI cost and should always run
  // so the affiliate page stays trustworthy. Runs at 04:00 UTC on the 1st.
  if (process.env.ASIN_VERIFY_ENABLED !== 'false') {
    cron.schedule('0 4 1 * *', async () => {
      console.log('[cron] monthly ASIN verification starting');
      try {
        const r = await runAsinVerificationJob();
        console.log('[cron] ASIN verification done', {
          broken: r.broken_count,
          blocked: r.blocked_count,
          total: r.total,
        });
      } catch (err) {
        console.error('[cron] ASIN verification error', err);
      }
    });
    console.log('[cron] registered: 04:00 UTC on the 1st (monthly ASIN verify)');
  } else {
    console.log('[cron] ASIN_VERIFY_ENABLED=false; monthly verifier disabled');
  }

  if (process.env.AUTO_GEN_ENABLED !== 'true') {
    console.log('[cron] AUTO_GEN_ENABLED!=true; article cron disabled');
    _registered = true;
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
