# Evidence integrations

Skill Passport groups judge-verified results, self-added projects, and linked external sources. Linked evidence and imported snapshots have different provenance. Synexis is a fictional sample Passport.

| Source | Current data |
| --- | --- |
| Place AI Arena | Distinct accepts, language and difficulty stats, and an accepted activity timeline tied to the signed browser session |
| GitHub | Public repositories and commit and pull request contributions from the past year after OAuth authorization |
| Codeforces | Public current and peak rating, distinct accepted problems, and topic breakdown from up to 250 recent submissions |
| LinkedIn | Member name from the OpenID Connect UserInfo endpoint after sign-in |
| LeetCode, HackerRank, CodeChef | Student-added profile or certificate links |

## Local configuration

1. Copy [`.env.example`](../.env.example) to `.env` if enabling optional connections. Basic Compose startup requires no OAuth configuration.
2. Set `EVIDENCE_PUBLIC_ORIGIN` to the exact origin used in the browser. Register `{origin}/api/evidence/github/callback` and `{origin}/api/evidence/linkedin/callback` with the respective providers.
3. Fill in the appropriate client credentials. Generate a separate signing secret with `openssl rand -hex 32`. Keep these values in the ignored `.env`.
4. Apply the config with `docker compose up -d web`. Open **Skill Passport → Platforms** to connect or import.

OAuth tokens are used server-side during import. The browser retains signed snapshots for 30 days. Removing a snapshot clears it locally. Manage provider-side authorization in that provider’s account settings.
