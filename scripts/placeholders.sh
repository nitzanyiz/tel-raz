#!/usr/bin/env bash
# Lists every "[למילוי]" placeholder left in the site content (file:line:text).
# Run before launch: everything listed should be filled in or removed.
cd "$(dirname "$0")/.."
grep -rn --include='*.md' --include='*.json' '\[למילוי' src/pages src/content || true
