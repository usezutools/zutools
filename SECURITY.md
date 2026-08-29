# Security policy

## Supported versions

Before the first npm release, security fixes are applied to the `main` branch.
After publication, only the latest minor release line will receive security
updates until a broader support policy is announced.

| Version | Supported |
|---|---|
| `main` / latest release | Yes |
| Older pre-release versions | No |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for
[`usezutools/zutools`](https://github.com/usezutools/zutools/security/advisories/new).
If that form is unavailable, email `opensource@usezutools.com` with
`SECURITY` in the subject.

Include:

- the affected package, version and export;
- reproduction steps or a proof of concept;
- the expected impact;
- any suggested mitigation;
- whether disclosure is time-sensitive.

You should receive an acknowledgement within seven days. Please allow time to
investigate and release a fix before public disclosure.

## Scope

Security issues include unexpected network transmission, unsafe parsing,
cross-site scripting, dependency compromise and transformations that expose
data outside the documented local-first boundary.
