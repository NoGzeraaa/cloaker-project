export default {
  check: async function(ctx) {
    const ua = (ctx.ua || '').toLowerCase();

    // block obvious crawlers / preview bots
    if (/bot|crawl|spider|bingpreview|facebookexternalhit|slackbot|telegrambot/i.test(ua)) {
      return { action: 'serve_decoy' };
    }

    // simple header checks
    const via = (ctx.headers['via'] || '') + '';
    if (/google/gi.test(via)) return { action: 'serve_decoy' };

    // allow by default
    return null;
  }
};
