// ===== AUM SITE SETTINGS — applies settings/general to the whole website =====
// Loads 'settings/general' from Firestore (public read) and applies live branding.
(function () {
  if (!window.AUM_DB) return;

  AUM_DB.collection('settings').doc('general').get().then(snap => {
    if (!snap.exists) return;
    const g = snap.data();
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];

    /* 1. Brand / accent color */
    if (g.accentColor) {
      document.documentElement.style.setProperty('--primary', g.accentColor);
    }

    /* 2. Announcement banner (top of every page) */
    if (g.announcementEnabled && g.announcementText) {
      const bar = document.createElement('div');
      bar.style.cssText = 'position:sticky;top:0;z-index:100000;background:linear-gradient(135deg,#7c3aed,#00d4ff);color:#fff;text-align:center;padding:10px 16px;font-size:.85rem;font-weight:600';
      bar.textContent = g.announcementText;
      document.body.prepend(bar);
    }

    /* 3. Company name in page titles */
    if (g.companyName) document.title = document.title.replace(/AUM Technology Company/g, g.companyName);

    /* 4. Contact info replacement (footer, contact page) */
    const replaceText = (oldTxt, newVal) => {
      if (!newVal) return;
      $$('*').forEach(el => {
        if (el.children.length === 0 && el.textContent.includes(oldTxt))
          el.textContent = el.textContent.replace(oldTxt, newVal);
      });
    };
    if (g.supportEmail) {
      replaceText('hello@aumtech.com', g.supportEmail);
      replaceText('support@aumtech.com', g.supportEmail);
      $$('a[href^="mailto:"]').forEach(a => a.href = 'mailto:' + g.supportEmail);
    }
    if (g.phone) {
      replaceText('+234 800 000 0000', g.phone);
      $$('a[href^="tel:"]').forEach(a => a.href = 'tel:' + g.phone.replace(/\s/g, ''));
    }
    if (g.address) replaceText('Sokoto, Nigeria', g.address);

    /* 5. Footer socials (order: Facebook, X, LinkedIn, Instagram, GitHub) */
    const socials = [g.social_facebook, g.social_twitter, g.social_linkedin, g.social_instagram, g.social_github];
    const footerSocials = $$('footer .socials a');
    footerSocials.forEach((a, i) => { if (socials[i]) { a.href = socials[i]; a.target = '_blank'; a.rel = 'noopener'; } });
  }).catch(err => console.warn('site-settings:', err.code || err));
})();
