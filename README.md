# bot-absurdcorpslop

A Bluesky bot that writes absurdist fake advertisements. It pairs a random Wikipedia article with a random everyday object or concept, adds a number, a stake and a way for the narrator to fall apart, and asks Claude to write the result with complete corporate sincerity.

The humour comes from the gap between the earnestness of the format and the wrongness of the subject. A one-star Yelp review of the writer's own house because an asymptote keeps approaching the foundation. A Late Night TV segment delivered from inside a salad spinner. A Marketplace thread where every reply adds one more condition to a free hole punch.

Follow it at [@absurdcorpslop.bsky.social](https://bsky.app/profile/absurdcorpslop.bsky.social).

---

## How it works

Every 24 hours the bot:

1. Draws a random Wikipedia article and skips it if it is about a person, a tragedy or religion (up to 8 draws)
2. Draws Subject B: half the time an everyday object (a stapler, a wheelie bin, a salad spinner), otherwise a concept from a pool of 315 inanimate, non-proper-noun subjects
3. Picks one of 20 ad formats
4. Draws the seeds in code: a number that must appear in the ad, a stake (a refund, a parking space, a fence four centimetres over the line), a shape for the narrator's breakdown, and an ending shape for the punchline
5. Sends all of it to Claude Haiku, which writes a brand name, headline, body, punchline and image search term as JSON
6. Checks the result against the length limits and the brand name rule, and sends it back for up to two repairs if it fails
7. Fetches an image from Unsplash and posts a two-post thread on Bluesky
8. Deletes its own posts after 7 days

### Why the seeds come from code

Left alone, Haiku converges on the same answers: a spouse as the cause of the problem, the number 47, "Day 19", a polite plea as the last line. Every ad looked like the previous one. The fix is to draw the variety in code and give the model a fixed set of ingredients to cook with. The pools live in `pools.js` and are meant to be edited.

| Pool | Size |
|------|------|
| Formats | 20 |
| Concepts | 315 |
| Objects | 160 |
| Stakes | 64 |
| Breakdown shapes | 12 |
| Ending shapes | 14 |
| Sensitive-topic terms | 90 |

### Incidents

Some formats carry a premise that is stated outright in the headline. Marketplace always draws one (the buyer arrives at the wrong house, two buyers in one driveway, a swap that gets stranger with every message). Yelp draws one about a third of the time, and the best of them has the reviewer writing a one-star review of their own house. When an incident is drawn, it replaces the stake.

---

## Examples

**[LATE NIGHT TV]**
SpinHill Produce Systems
Local produce distributor reveals supply chain breakthrough using parliament-endorsed salad technology.

> I'm writing from inside a salad spinner. The MP's office ordered 359 receipts for our missing sock dispute. I've been trapped here three weeks.
> You have until next Tuesday's rotation to retrieve your documentation or I'm composting it.

---

**[YELP]**
Alphonse Asymptotic Properties
I'm leaving a one-star review of my own house because the asymptote won't stop approaching my foundation.

> I listed this place near the municipal quarry for income. The asymptote gets closer yearly, now within 59.6 centimetres of my bedroom.
> Please advise if I should disclose this in the listing, or just keep sleeping in the kitchen.

---

**[MARKETPLACE]**
RowPunch Holdings
FREE - Must go this weekend - Buyer wants hole punch swap for increasingly strange items.

> Me: Selling 2018 championships memorabilia. Them: Trade for hole punch plus $11.57 and your badminton racket? Me: Yes, pickup this Saturday.
> Thank you for understanding about the racket's missing strings.

---

**[WELLNESS]**
CaseTherapyWellness
Your body deserves the postural alignment only a historically-informed pillowcase can provide.

> I developed neck pain after losing my front-row seat dispute. The specialized pillowcase cost $346.29. I thank you for understanding my condition.
> I'm leaving a second review of this exact same pillowcase tomorrow.

Not every ad lands. That is part of the format.

---

## Safety

The bot writes plausible-sounding fiction from the raw material of a real encyclopedia, so most of the engineering effort goes into keeping the fiction away from real people and real tragedy.

1. **No real names.** The prompt forbids names of real people and real businesses, and real platforms and brands. A person in the source article becomes a role at most.
2. **No biographies.** Articles about people are skipped and redrawn. The check looks for birth and death dates, "was born", "died" and pronouns in the summary. The prompt also bans any mention of a real death, illness or injury.
3. **No tragedy or religion.** Articles whose title or summary match a list of violence, disaster, abuse and religion terms are skipped and redrawn. The list is `SENSITIVE_STEMS` and `SENSITIVE_WORDS` in `pools.js`.
4. **No Wikipedia words in the brand.** Brand names are checked in code for words from the article title and for long capitalised words in the summary, and sent back for repair on a hit.
5. **No addresses.** The prompt forbids street addresses, phone numbers and email addresses.
6. **Removed formats.** Political, Obituary, Dating, TripAdvisor, Academic and Church were removed because they structurally produce defamatory or misleading output.
7. **Labelled as satire.** Every thread carries `#satire #absurdcorpslop`, and no post credits the Wikipedia source.
8. **Short life.** Posts are deleted after 7 days.

If 8 articles in a row are rejected, the run is skipped and the bot tries again at the next interval.

### On misinformation and satire

This project started as a joke and became an accidental experiment in how easily large language models can be used, even unintentionally, against public information sources.

Wikipedia contains millions of articles about real people, real places, real events and real science. An LLM given random combinations of that content and instructed to write with sincerity will produce output that looks authoritative, sounds plausible and attributes fabricated claims to real subjects. During development this bot generated a fake political corruption accusation against a named choreographer, a fraudulent classified ad attributing dodgy goods to a named NFL player, and a fake academic finding stated as proven fact.

None of it was malicious. All of it was dangerous.

The mitigations above are effective but imperfect. The model occasionally slips, and keyword filters have gaps (the first version of the religion filter let a Buddhist temple through because it listed "church" and "Buddhist" and not "temple"). The formats that feel safest can still cause harm with the wrong subject combination.

If you are building something similar, the lesson is that absurdist intent does not produce absurdist output at scale. The same pipeline that generates a funny ad about a gelatin bloom will, given enough runs, generate something that looks like a real accusation about a real person. Design accordingly.

---

## Thread structure

Posts split across two posts to stay within Bluesky's 300 character limit.

Post 1 carries the format label, brand name, headline and satire tags, with the image:

    [YELP]
    Alphonse Asymptotic Properties
    I'm leaving a one-star review of my own house because the asymptote won't stop approaching my foundation.
    #satire #absurdcorpslop

Post 2 is a reply with the body, then the punchline on its own line:

    I listed this place near the municipal quarry for income. The asymptote gets closer yearly, now within 59.6 centimetres of my bedroom.
    Please advise if I should disclose this in the listing, or just keep sleeping in the kitchen.

Claude does not count characters reliably, so the prompt asks for word budgets and the code validates character limits: headline 140, body 195, punchline 100 (Marketplace gets a longer body of 215 and a shorter punchline of 80 for its Me/Them thread). Body plus punchline always fits in one post. If an ad is still too long after two repairs, the body is cut at the last whole sentence that fits and the punchline is never touched.

---

## Setup

Requires Node.js 18 or newer and curl.

Clone and install:

    git clone https://github.com/l11uke/bot-absurdcorpslop
    cd bot-absurdcorpslop
    npm install
    cp .env.example .env

Edit `.env` with your keys, then start with PM2:

    npm install -g pm2
    pm2 start bot.js --name absurdcorpslop --cwd $(pwd)
    pm2 save
    pm2 startup

The bot posts immediately on startup, then every 24 hours. If a run fails, it logs the error and waits for the next interval.

### Recommended hosting

A Raspberry Pi or similar always-on Linux machine. PM2 with systemd handles process management and reboot survival natively on Linux. Windows hosting is not recommended, because PM2's named pipe implementation is unreliable on Windows.

### Wikipedia fetch

The bot calls Wikipedia through curl as a subprocess, with a User-Agent that identifies the bot as Wikimedia's API policy asks. Node.js's TLS stack can stall on Wikimedia's servers depending on network configuration, and curl handles this cleanly. A failed fetch pauses 3 seconds and retries once.

### Bluesky App Password

Do not use your main account password. Generate one at https://bsky.app/settings/app-passwords

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

## Development

    npm test                           run the test suite (node:test, no network)
    npm run preview                    generate one ad and print it with its seeds, without posting
    npm run preview -- Marketplace     force a format
    npm run preview -- Yelp --incident force the incident premise
    npm run post-once                  generate and post one ad immediately (not tracked for the 7-day cleanup, so remove it with purge)
    npm run purge -- --older-than 7    list posts older than 7 days (dry run)
    npm run purge -- --older-than 7 --apply   delete them

`preview` prints the seeds that were drawn, how many repairs the ad needed, and which limits the first draft broke. It is the quickest way to judge a change to the prompt or the pools.

`purge` lists every post on the account, including any the bot no longer tracks, and deletes the old ones. Run it without `--apply` first.

### Layout

| File | Role |
|------|------|
| `bot.js` | Scheduler: clean up expired posts, generate, post, track |
| `generator.js` | Seed drawing, prompt, Claude call, validation and repair loop, Wikipedia fetch and filters |
| `pools.js` | Formats, concepts, objects, stakes, breakdowns, endings, incidents, limits, sensitive terms |
| `text.js` | Post text building, sentence-boundary truncation, AT URI parsing |
| `bluesky.js` | Session, posting, listing and deleting posts |
| `images.js` | Unsplash search and Bluesky blob upload |
| `cleanup.js` | Deletes expired posts and keeps failed deletions tracked for the next run |
| `store.js` | `posts.json` tracking (gitignored) |
| `scripts/` | `preview.js` and `purge.js` |
| `tests/` | The test suite |

---

## Ad formats

20 formats: Infomercial, Luxury, Tech Startup, Gov PSA, Late Night TV, Wellness, Financial, Legal, Real Estate, Job Posting, Warning, LinkedIn, Kickstarter, Supermarket, Insurance, Classified, Pyramid Scheme, Caution, Yelp, Marketplace.

Formats removed during development for defamation or misinformation risk: Political, Obituary, Dating, TripAdvisor, Academic, Church.

---

## Cost

- Claude Haiku: roughly half a cent per ad including repair calls
- Unsplash: free tier (50 requests per hour)
- At one post a day: about $0.15 a month

---

## Roadmap

- [ ] Engagement-based retention: check like and repost counts before deleting, and extend the life of posts above a threshold
- [ ] Mention triggers: let users tag the bot with a format name to request a specific ad type
- [ ] Ban specific numbers (47, 19) in any form, spelled out or not, with a repair on a hit
- [ ] More incident premises for Marketplace and Yelp, and incidents for other formats

---

## License

MIT
