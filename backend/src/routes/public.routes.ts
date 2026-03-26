import { Router } from 'express';
import { db } from '../config/database';
import { getSettings } from '../services/settings.service';

const router = Router();

router.get('/app-config', async (_req, res) => {
  try {
    const [levelsRes, plansRes, faqRes, settings] = await Promise.all([
      db.query(`SELECT code, name, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color, description
                FROM qualification_levels WHERE is_active = TRUE ORDER BY sort_order ASC`),
      db.query(`SELECT id, slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, icon, banner_url
                FROM investment_plans WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC`),
      db.query(`SELECT question_it, answer_it, question_en, answer_en, sort_order
                FROM faq_entries WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC`),
      getSettings(),
    ]);

    res.json({
      levels: levelsRes.rows,
      plans: plansRes.rows,
      faqs: faqRes.rows,
      branding: {
        heroTitle: settings['hero_title'] || 'WAY ONE',
        heroSubtitle: settings['hero_subtitle'] || 'Invest. Grow. Succeed.',
        supportEmail: settings['email_from'] || 'noreply@wayone.io',
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
