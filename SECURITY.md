# Security reporting

Report vulnerabilities privately through [GitHub security advisories](https://github.com/ashrathdevx/place-ai/security/advisories/new) when private reporting is available. Otherwise contact the repository owner privately. Include the affected revision, impact, and enough information to reproduce using a disposable local environment. Remove secrets and student data before sharing logs.

The Docker Compose stack is intended for local development. The worker mounts the host Docker socket. Treat it as privileged infrastructure and keep the default loopback binding. Public deployment needs separate execution isolation, durable identity, private fixtures, and reviewed production credentials. The [launch audit](LAUNCH-AUDIT.md) tracks these gates.
