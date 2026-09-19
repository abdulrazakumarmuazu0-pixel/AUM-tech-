# AUM Technology — Public Website

## Pages
- index.html — Home (hero, services, why us, process, testimonials, CTA)
- about.html — Story, timeline, team
- services.html — 5 detailed services + pricing + FAQ
- portfolio.html — Filterable project grid
- case-studies.html — Problem/Solution/Result stories
- blog.html — Article grid
- contact.html — Contact form (saves to Firebase `leads`)

## Setup (5 minutes)
1. Create a Firebase project at console.firebase.google.com
2. Add a Web App, copy config into `firebase/config.js`
3. Create Firestore Database
4. Deploy to Firebase Hosting: `firebase init hosting` → `firebase deploy`
   (or open index.html directly — everything works except form saving)

## Customize
- Phone/WhatsApp: search `2348000000000` in contact.html & footer
- Emails: search `hello@aumtech.com`
- Colors: edit `:root` variables at top of `css/style.css`
