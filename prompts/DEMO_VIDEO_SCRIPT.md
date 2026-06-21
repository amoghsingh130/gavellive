# GavelLive Demo Video Script

Target: under 3 minutes. Tone: quick, direct, Gen Z founder energy, but serious
when the database proof starts.

Core message:

> GavelLive is a luxury live-auction platform where Aurora DSQL guarantees
> correct bidding under real concurrency: zero lost writes, monotonic price, and
> exactly one winner.

---

## Recording Setup

- Record at 1080p or higher.
- Keep app zoom at 90-100% so UI text is readable.
- Use two browser windows or two tabs for the two-bidder moment.
- Open these before recording:
  - `http://localhost:3000/`
  - `http://localhost:3000/auctions`
  - Patek detail page for the stress proof.
  - Architecture diagram in `ARCHITECTURE.md` or an exported screenshot.
- Reseed the database before the final take so the catalog is clean and the
  Patek lot is live.

### Camera Choice

Use the iPhone 16 Pro, not the MacBook Pro M4 camera, for the talking-head
shots.

The iPhone rear camera will look sharper, handle contrast better, blur the
background more naturally, and make the video feel less like a Zoom recording.
The MacBook camera is fine for calls, but it usually reads flatter and less
intentional in a judged demo video. Judges may not consciously care what camera
you used, but they will feel the difference in polish.

Recommended setup:

- Use the iPhone 16 Pro rear camera, landscape orientation.
- Record in 4K if storage allows; export the final video at 1080p.
- Use 30 fps, not cinematic slow-motion. This should feel crisp and direct.
- Lock exposure/focus on your face before recording.
- Put the phone at eye level on a tripod, shelf, or stack of books.
- Stand or sit about 3-5 feet from the camera.
- Use the MacBook for screen recording and app demo footage.

Only use the MacBook camera if setup time is collapsing. If you do, put the
MacBook on books so the camera is at eye level, face a window, and do not shoot
from below.

### Lighting

Lighting matters more than the camera. The goal is clean, bright, and focused,
not cinematic.

Best simple setup:

- Face a window. Put the window in front of you or 45 degrees to one side.
- Do not sit with a bright window behind you.
- Turn off harsh overhead lights if they create shadows under your eyes.
- If the room is dim, put a lamp behind/next to the camera and diffuse it with
  a wall bounce, lampshade, or white paper nearby. Do not point a bare bulb at
  your face.
- Keep the background darker or calmer than your face so attention stays on
  you.
- Avoid RGB/gaming lights unless they are very subtle. This is Gen Z energy,
  not a Twitch intro.

Quick test:

- Take a 10-second sample clip.
- Your eyes should be visible.
- Your face should not be blown out.
- The background should not be brighter than you.
- The app screen recording should be much sharper than any over-the-shoulder
  camera shot, so record the app directly from the Mac.

### Framing And Background

- Shoot landscape, centered or slightly off-center.
- Frame from mid-chest to a little above your head.
- Leave a small amount of headroom.
- Keep the camera at eye level.
- Clean the background enough that it looks intentional, but do not make it
  sterile.
- A laptop, desk lamp, or neutral wall is fine. Clutter, laundry, and bright
  windows are not.
- Wear a solid shirt that contrasts with the background. Avoid tiny stripes or
  busy patterns.

### Audio

Bad audio hurts more than imperfect video.

- Record in a quiet room.
- Put the iPhone 2-4 feet away if using its mic.
- If you have AirPods or a wired mic, test both against the iPhone mic and use
  whichever sounds less echoey.
- Turn off fans, AC, dishwasher, and music.
- Clap once at the start if you record camera and screen separately; it makes
  syncing easier.
- Do one full test sentence and listen back before recording the final take.

### Shooting Style

Make the camera sections feel quick, human, and confident.

- Use jump cuts. You do not need one perfect take.
- Talk slightly faster than normal, but keep the database proof slower and
  clearer.
- Look into the lens, not at your own face on screen.
- Smile lightly on the humor lines, then become serious when explaining DSQL.
- Record each camera section separately: cold open, why it matters, close.
- Leave one second of silence before and after each take for easier editing.

Do not overdo the humor. The joke is: "online auctions are simple until
concurrency shows up." After that, the app needs to feel credible.

### Screen Recording

- Record the screen at 1080p or higher.
- Use the browser at 90-100% zoom so judges can read UI text.
- Hide bookmarks, unrelated tabs, messages, and notifications.
- Use one clean browser profile or incognito window.
- Keep the cursor movement calm and deliberate.
- Pause for half a second after important clicks so the viewer sees the result.
- Before recording, preload:
  - landing page
  - floor page
  - Patek detail page
  - architecture diagram
  - AWS DSQL screenshot
- If the stress proof takes a few seconds, keep it in. That actually helps
  credibility. Trim dead air, not the proof.

### Editing Style

- Use captions for the main point of each beat, not every word.
- Keep captions short: `300 bidders`, `one winner`, `OCC retries`,
  `Aurora DSQL`.
- Cut between camera and app footage every 8-15 seconds early in the video.
- During the stress proof, stay mostly on the screen recording so judges can
  inspect the result.
- Add very light background music only if it does not fight your voice. No
  copyrighted music.
- Export under 3 minutes. Judges are not required to watch beyond that.

---

## Edit Map

### 0:00-0:12 - Cold Open, Camera

Shot: direct-to-camera, jump cuts, captions.

Script:

> "Auctions are simple, right? Someone bids. Someone wins. Cool."
>
> "Except online, 300 people can click bid at the same time, and suddenly your
> database is fighting for its life."
>
> "So I built GavelLive: a live auction floor where the database has to prove it
> can handle the chaos."

Captions:

- `300 bidders`
- `same item`
- `one winner`
- `no race-condition nonsense`

Edit notes:

- Punch in on "database is fighting for its life."
- Keep this brisk. Humor is here, not during the technical proof.

---

### 0:12-0:35 - Product Hook, Screen Recording

Shot: landing page, then `/auctions`.

Script:

> "This is GavelLive: a real-time luxury auction house for high-demand
> collectibles. Watches, classic cars, jewelry, rare books."
>
> "The kind of stuff where a race condition is not a cute bug. It is money
> disappearing."

Clicks:

1. Start on `/`.
2. Click `The floor` or `Enter the floor`.
3. Hover over the six lots.
4. Open `Gold Patek Philippe Chronograph, Geneva`.

Captions:

- `Luxury live auctions`
- `Real-time bidding`
- `Money-critical writes`

---

### 0:35-1:10 - Live Bidding Demo, Screen Recording

Shot: detail page and bidder picker.

Script:

> "I can pick a bidder, place a bid, and the current price updates."
>
> "In another tab, a second bidder can outbid me. I get feedback immediately."
>
> "And because sniping is annoying, a last-second bid extends the clock. Nobody
> wins just because they had better Wi-Fi for half a second."

Clicks:

1. Pick bidder A in the header.
2. Place a valid bid.
3. Switch to tab/window with bidder B.
4. Place a higher bid.
5. Show bidder A getting outbid feedback, if available.
6. If the short-clock chair lot is live, use it for the anti-snipe clock
   extension. If not, mention anti-snipe while showing the countdown UI.

Captions:

- `Bid accepted`
- `Outbid feedback`
- `Anti-snipe extension`

Backup line if anti-snipe is hard to capture:

> "The same transaction path also extends the auction clock when a bid lands in
> the final seconds, so the close is fair."

---

### 1:10-1:55 - Database Proof, Screen Recording

Shot: Patek detail page, stress panel.

Script:

> "But the real demo is this panel."
>
> "This fires hundreds of real concurrent bid transactions at the same auction.
> Not fake frontend loading bars. Actual Aurora DSQL transactions racing each
> other."
>
> "DSQL uses optimistic concurrency control, so conflicting commits get rejected,
> the app retries, and the auction still ends with exactly one valid high
> bidder."
>
> "That is the point: I am not claiming correctness. I am making the app prove it
> on screen."

Clicks:

1. On the Patek detail page, scroll to `Concurrency proof`.
2. Choose `300` concurrent bids if available and reliable. Use `150` if the
   production function feels slower while recording.
3. Click run.
4. Pause on:
   - throughput
   - OCC retries
   - p50 / p99 latency
   - invariant checks turning green

Captions:

- `Serializable transaction`
- `OCC retries`
- `Zero lost writes`
- `Exactly one winner`
- `All invariants hold`

Critical visual:

- The final green invariant state must appear clearly.

---

### 1:55-2:25 - Architecture, Screen Recording

Shot: architecture diagram, optionally brief code flash.

Script:

> "The frontend is Next.js on Vercel. The write path goes through Node route
> handlers into Aurora DSQL."
>
> "Every bid runs as a serializable transaction: read the auction, validate the
> minimum bid, insert the bid, update the high bidder, maybe extend the clock,
> then commit."
>
> "If DSQL detects a conflict, the app retries with backoff. That is why this
> database choice is intentional, not just a checkbox."

Visuals:

- Highlight Browser.
- Highlight Vercel route handlers.
- Highlight Aurora DSQL.
- Optional quick code flash of `placeBid()`, but do not dwell on code.

Caption:

- `Vercel Next.js -> Route Handler -> Aurora DSQL`

---

### 2:25-2:45 - Why It Matters, Camera

Shot: direct-to-camera.

Script:

> "A lot of hackathon apps connect to a database. GavelLive needs the database.
> If the database gets concurrency wrong, the product is wrong."
>
> "That is why Aurora DSQL is the hero here: global-scale auction bidding needs
> strong consistency, serializable writes, and a source of truth judges can
> inspect."

Visuals:

- Cut between camera and green invariant panel.
- If legible, flash AWS DSQL console screenshot for one second.

---

### 2:45-2:58 - Close, Screen Recording + Camera

Script:

> "GavelLive: live auctions, luxury lots, real concurrency, one winner. Built
> with Vercel, v0, and Amazon Aurora DSQL for the H0 Hackathon."

Visuals:

- Landing page.
- Final stress proof green state.
- End card:
  - `GavelLive`
  - `gavellive.vercel.app`
  - `Vercel + v0 + Amazon Aurora DSQL`

---

## Shorter Backup Cut

Use this if the full take runs long.

1. Camera cold open: 10 seconds.
2. Product tour: 25 seconds.
3. Bid/outbid demo: 25 seconds.
4. Stress proof: 55 seconds.
5. Architecture: 25 seconds.
6. Closing line: 10 seconds.

Total: about 2:30.

---

## Lines To Avoid

- "This is like eBay but..."
- "AI generated..."
- "Just a demo..."
- "The database stores stuff..."
- "Hopefully this works..."

Use instead:

- "The database is the correctness layer."
- "This is money-critical concurrency."
- "The app proves the invariant against the source of truth."

---

## Final Preflight

- `/` loads and shows the polished landing page.
- `/auctions` shows the luxury catalog, not old placeholder lots.
- Patek detail page is live and has the stress panel.
- Two bidder tabs are ready.
- Stress panel completes successfully once before recording.
- AWS DSQL screenshot is saved for Devpost.
- The final edit is under 3 minutes.
