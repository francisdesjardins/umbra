# Security

## What this package is

A browser library with **zero runtime dependencies** — nothing in `dist/` executes anything but
its own code, and the root resolves with no framework installed. It is **not published to npm**:
you get it by cloning this repository or lifting files out of `src/`, so there is no registry
artifact to typosquat and no transitive tree to poison. The supply-chain surface is this
repository itself.

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/francisdesjardins/umbra/security/advisories/new)
on this repository — not a public issue, so a fix can land before the report is readable.

Worth reporting here: anything where the library's own code turns a caller's ordinary inputs into
script execution or markup injection (the library never builds HTML from strings, and a report
that it started would be a good catch), focus or dismissal behaviour that could be used to trap a
user against their will, or a `scripts/` file doing something its header does not say.

Not a vulnerability in this library: XSS through content **you** render into a dialog — the
`render` callback is your code and the library never sanitises it, by design; and anything in
`playground/` dependencies, which are demo-only and never ship.

## Fixes

There are no release branches and no backports — `main` is the only line, and a fix lands there
as an ordinary commit with a CHANGELOG entry. If you pinned a commit (the README recommends it
when lifting code), the CHANGELOG is where a fix worth re-pinning for is announced.
