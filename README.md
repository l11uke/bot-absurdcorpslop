# bot-absurdcorpslop

Bluesky bot that generates absurdist advertisements from random Wikipedia article combinations using Claude AI.

Every 24 hours, it:
1. Pulls two random Wikipedia articles
2. Picks a random ad format from 25 types
3. Generates a brand name, headline, and body copy via Claude — written with complete sincerity
4. Posts as a two-post thread on Bluesky

The humor comes from corporate earnestness applied to completely wrong subjects.

---

## Thread structure

Post 1 — format label, brand name, headline:

    [LINKEDIN THOUGHT LEADERSHIP]
    Trent & Bombardier Advisory Group
    Don't let your defensive mechanisms calcify before the doctrine does.

Post 2 (reply) — body copy and Wikipedia credits:

    Most people are watching three synods collapse because leadership refused
    to iterate. At Trent & Bombardier, we've spent fourteen years helping
    organisations secrete precisely the right chemical response at precisely
    the right moment.

    📡 Council of Trent + Bombardier beetle

---

## Setup

Clone and install:

    git clone https://github.com/l11uke/bot-absurdcorpslop
    cd bot-absurdcorpslop
    npm install
    cp .env.example .env

Edit .env with your keys, then:

    npm start

### Bluesky App Password

Do not use your main account password. Generate one at:
https://bsky.app/settings/app-passwords

### Environment variables

| Variable              | Required | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| ANTHROPIC_API_KEY     | Yes      | Claude API key                                   |
| BSKY_HANDLE           | Yes      | Your Bluesky handle (e.g. yourbot.bsky.social)   |
| BSKY_APP_PASSWORD     | Yes      | Bluesky App Password                             |
| POST_INTERVAL_HOURS   | No       | Posting frequency in hours (default: 24)         |

---

## One-off post

To post once without starting the scheduler:

    npm run post-once

---

## Cost

- Claude Haiku — approximately $0.0002 per generation
- At once daily: approximately $0.06/month

---

## Ad formats

25 formats including: Infomercial, Luxury brand, Tech startup, Government PSA, Late night TV, Wellness brand, Financial product, Political campaign, Legal disclaimer, Academic abstract, Dating profile, Real estate listing, Job posting, Warning label, Obituary as ad, TripAdvisor review, LinkedIn thought leadership, Kickstarter pitch, Supermarket bundle, Insurance claim, Classified ad, Church bulletin, Pyramid scheme, Caution label, Unhinged Yelp review.

---

## Roadmap

- [ ] Image embedding (Unsplash fetch -> Bluesky blob upload) — skeleton in images.js

---

## License

MIT