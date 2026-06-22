# GavelLive — Devpost pitch copy

**Track:** Track 3 — Million-scale global app (gaming / social / entertainment)
**Also targeting:** Best Technical Implementation (cross-cutting, judged across all tracks)

Positioning: **correctness is the hero; global scale is the arena that makes it
hard.** Lead every blurb with the proof, not the aspiration. The single-region
deployment and the 300-bid load test are the *evidence*; "millions / global" is the
*problem* and the *roadmap*, never claimed as a demonstrated deployment.

---

## One-line elevator pitch

> A live-commerce auction platform where a bid can't be lost, the price can only go
> up, and exactly one winner is guaranteed — proven on screen with a live
> concurrency test on Amazon Aurora DSQL, not asserted in a README.

## Thesis line (use it verbatim wherever there's room)

> Serving the traffic is the easy half of million-scale live commerce; keeping one
> shared price correct while thousands write to it at the same instant is the hard
> half — and that's the half GavelLive proves.

## Inspiration / what it does (2–3 sentences, paste into Devpost)

> Live commerce — Whatnot, TikTok live drops, real-time bidding — is one of
> entertainment's fastest-growing formats and a brutal distributed-systems problem:
> many writers worldwide fighting over one shared price, money on the line, no room
> for error. GavelLive makes that correctness its core feature and *demonstrates*
> it: 300 concurrent bids fired at the live endpoint, every invariant — no lost
> writes, monotonic price, exactly one winner — verified directly against Aurora
> DSQL, with the same proof runnable in-app. The hard part of reaching millions
> isn't the read traffic; it's the one contended row, and that's the part we got
> right first.

## How we built it / scale story (if a longer field exists)

> Every bid runs as a single serializable transaction on Aurora DSQL, which uses
> optimistic concurrency control — no row locks. When bids race, DSQL aborts
> whichever commit would break serializability (SQLSTATE 40001); the handler
> re-reads the now-higher price and retries with jittered backoff. The write-path
> correctness guarantee is the same whether one region or many, which is what makes
> the scale-out path (read fanout via DynamoDB Streams → WebSockets, multi-region
> active-active DSQL — diagrammed as future work, not claimed as running) safe to
> build on top. Today's deployment is single-region us-east-1.

---

> Keep the quantified claims honest: only the proven numbers (300 bids, 414 OCC
> retries, invariants green) are stated as fact. Scale figures stay qualitative
> until backed by a real run.
