# bot-absurdcorpslop

A Bluesky bot that generates absurdist fake advertisements by combining random Wikipedia articles with concepts from science, mathematics, architecture, ecology, and economics — then asking Claude AI to write them with complete corporate sincerity.

The humour comes from the gap between the earnestness of the format and the wrongness of the subject matter. A supermarket bundle promotion for intelligent design gravy. A LinkedIn thought leadership post about the Council of Trent and bombardier beetles. A legal disclaimer for a reduction sauce. A wellness brand built around a polar vortex displacement.

Follow it at [@absurdcorpslop.bsky.social](https://bsky.app/profile/absurdcorpslop.bsky.social).

---

## How it works

Every 24 hours the bot:

1. Pulls a random Wikipedia article
2. Pairs it with a randomly selected concept from a curated pool of 315 inanimate, non-proper-noun subjects across geology, food science, mathematics, astronomy, architecture, weather phenomena, physics, biology, and economics
3. Selects a random ad format from 19 types
4. Sends both subjects and the format to Claude with instructions to write with complete sincerity and zero acknowledgement that anything is wrong
5. Fetches a relevant image from Unsplash
6. Posts as a two-post thread on Bluesky
7. Automatically deletes posts after 7 days

The concept pool exists to reduce the risk of Wikipedia returning a real living person as a subject — inanimate concepts force Claude into stranger territory and produce more consistently absurd output.

---

## Examples

**[SUPERMARKET]**
Probable Reductions™
ELIMINATE CHANCE FROM YOUR DINNER WITH SMALL PROBABILITY SAUCE

> Buy one bottle of our patented reduction and get a SECOND bottle absolutely FREE when you purchase the companion doctoral dissertation framework. Our thickened pan juices have been scientifically formulated to infer intelligent agency in your beef bourguignon through elimination of competing naturalistic explanations. Natural and social situations taste BETTER when you've ruled out accident.

---

**[LINKEDIN]**
Trent & Bombardier Advisory Group
Don't let your defensive mechanisms calcify before the doctrine does.

> Most people are watching three synods collapse because leadership refused to iterate. At Trent & Bombardier, we've spent fourteen years helping organisations secrete precisely the right chemical response at precisely the right moment. The church didn't reform itself by being comfortable. Neither will you.

---

**[YELP]**
Tagore's Bulgarian Cinema Vault Ltd.
I don't normally do this but the 50,000 pieces of Bulgarian art are ACTUALLY Satyajit Ray films and nobody's talking about it.

> Look, I went to what I thought was a national gallery expecting paintings. Instead, a 1964 drama film about marital discord was mounted on every wall in chronological order. My wife won't stop watching them. We've been here 3 weeks. Please send help or more snacks to Tagore's Bulgarian Cinema Vault Ltd.

---

## On misinformation and satire

This project started as a joke and became an accidental experiment in how easily large language models can be weaponised — even unintentionally — against public information sources.

Wikipedia contains millions of articles about real people, real places, real events, and real science. An LLM given random combinations of that content and instructed to write with sincerity will produce output that looks authoritative, sounds plausible, and attributes fabricated claims to real subjects. During development this bot generated a fake political corruption accusation against a named choreographer, a fraudulent classified ad attributing dodgy goods to a named NFL player, and a fake academic finding stated as proven fact.

None of it was malicious. All of it was dangerous.

The mitigations applied here — removing formats that structurally produce defamatory output, instructing the model never to use real names, replacing Wikipedia subject credits with a satire disclaimer, and substituting one Wikipedia subject with a curated concept pool — are effective but imperfect. The model occasionally slips. The formats that feel safest can still cause harm with the wrong subject combination.

If you're building something similar, the lesson is that absurdist intent does not produce absurdist output at scale. The same pipeline that generates a funny ad about Ottoman Egypt and an Ohio courthouse will, given enough runs, generate something that looks like a real accusation about a real person. Design accordingly.

---

## Thread structure

Posts are split across two posts to work within Bluesky's 300 character limit:

Post 1 — format label, brand name, headline, satire tag:

    [WELLNESS]
    OrbitalNourish
    Your magnetosphere deserves better than what you've been giving it.
    #satire #absurdcorpslop

Post 2 (reply) — body copy:

    Most people are walking around with an undiagnosed solar wind deficiency
    and don't even know it. OrbitalNourish has spent eleven years mapping
    the gap between what your body absorbs and what it actually needs from
    the heliosphere.

---

## Setup

Clone and install:

    git clone https://github.com/l11uke/bot-absurdcorpslop
    cd bot-absurdcorpslop
    npm install
    cp .env.example .env

Edit .env with your keys, then:

    npm start

The bot posts immediately on startup, then every 24 hours.

### Bluesky App Password

Do not use your main account password. Generate one at:
https://bsky.app/settings/app-passwords

### Environment variables

| Variable            | Required | Description                                    |
|---------------------|----------|------------------------------------------------|
| ANTHROPIC_API_KEY   | Yes      | Claude API key                                 |
| BSKY_HANDLE         | Yes      | Your Bluesky handle (e.g. yourbot.bsky.social) |
| BSKY_APP_PASSWORD   | Yes      | Bluesky App Password                           |
| UNSPLASH_ACCESS_KEY | Yes      | Unsplash API key for images                    |
| POST_INTERVAL_HOURS | No       | Posting frequency in hours (default: 24)       |
| POST_MAX_AGE_DAYS   | No       | Post retention in days (default: 7)            |

---

## Ad formats

19 formats: Infomercial, Luxury, Tech Startup, Gov PSA, Late Night TV, Wellness, Financial, Legal, Real Estate, Job Posting, Warning, LinkedIn, Kickstarter, Supermarket, Insurance, Classified, Pyramid Scheme, Caution, Yelp.

Formats removed during development for defamation or misinformation risk: Political, Obituary, Dating, TripAdvisor, Academic, Church.

---

## Cost

- Claude Haiku — approximately $0.0002 per generation
- Unsplash — free tier (50 requests/hour)
- At once daily: approximately $0.06/month

---
## Roadmap

- [ ] Engagement-based retention — check like/repost counts before deleting, extend life of posts above a threshold
- [ ] Mention triggers — let users tag the bot with a format name to request a specific ad type
- [ ] Per-format character tuning — some formats consistently run long, worth tailoring limits per type

---
## License

MIT