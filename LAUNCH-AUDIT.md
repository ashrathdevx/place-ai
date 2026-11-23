# Place AI launch audit

## Findings addressed in this change

| Area | Weak point | Change |
| --- | --- | --- |
| Home and branding | The home page and Arena presented another general-purpose coding site, with a prominent list of competitor exercises. | Put Decode on the home page and in navigation. Removed the outbound exercise list from the Arena sidebar. |
| Practice discovery | Branch and topic controls could obscure the full challenge set. Service interruptions also made direct problem links unusable. | Start with all branches in mini practice and all levels and topics in Decode. The web server can serve public problem content without the judge. |
| Problem content | Decode previously described an approach but did not give students a program to repair. | Added 30 challenges with complete C17, C++20, and Python 3 programs with intentional logical errors. Each challenge includes a precise contract, a visible example, hidden checks, and an editorial. |
| Editor and console | Users had to copy a sample and mentally compare output. Leaving a problem could lose code. | Prefill the example, show actual and expected output, and save separate browser drafts. Reset asks before replacing edits. |
| Editorial | Review was unstructured and could reveal the explanation before a student tried the bug. | Style it as a compact document with failure analysis, verification and complexity. Unlock it after acceptance in the current signed session. |
| Typography and color | Small text and redundant labels reduced scanability. | Reused the shared type scale, used explicit verdict text and applied a restrained blue accent to actionable elements. |
| Profile and Evidence Engine | A single solved count obscured debugging outcomes; navigation could leave another open tab stale. | Count distinct accepted repairs by difficulty, show recent repairs, refresh after judge events in other tabs, and poll when visible. Unavailable progress is labeled as such. |
| Placements and Marketplace | Aspirational copy could make local checklists and drafts sound like published opportunities or listings. | Clarified browser-local storage, sample items and draft behavior on the relevant pages. |
| Operations | There was no automated check that a Decode bug actually failed a hidden case. | Exercise 90 starter/reference pairs in fixture tests. CI additionally checks three-language custom runs, compiler diagnostics, rejection, acceptance, editorial access, and cross-language deduplicated credit. |

## Release gates before a large public launch

1. **Execution infrastructure.** Deploy the judge separately from the web app and its data services. Replace local Compose credentials and the Docker socket architecture with a production-reviewed setup. Exercise quotas and recovery in staging before accepting public submissions.
2. **Identity and data.** Current identity and editable profile data are tied to a browser. Implement durable accounts, server-side profiles, portability and deletion flows before making cross-device or recruiter-sharing promises. Verify migrations and restore a backup in staging.
3. **Capacity and recovery.** Measure queue latency, attempts per second and concurrent verdict streams under an agreed traffic model. Add alerts, rehearse a worker outage and demonstrate that queued work recovers. An end-to-end CI pass gives no throughput guarantee.
4. **Challenge integrity.** The public development repository contains reference code and fixtures for review and CI. Move a launch-only bank to private delivery and rotate fixtures before introducing public scoring or prizes.
5. **Accessibility and browser coverage.** Run keyboard, zoom, reduced-motion and screen-reader checks on the deployed build, then verify Chrome, Safari and mobile layouts with real users.
6. **Student services.** Placement checklists and marketplace drafts remain local tools. Publish shared listings or enable payments only when their account, moderation, privacy and support flows are ready.

## Decode link regression

The downloaded standalone preview generated valid `#/arena/problems/…` links on the initial render. A general-purpose pass that converted ordinary section fragments to route-local fragments rewrote those links as `#/arena/decode#/arena/problems/…`. A topic change re-rendered the rows after that pass, which is why the new links worked. The native app uses ordinary path links and resolves problem details independently of catalog filters. Catalog filters now round-trip in the URL.
