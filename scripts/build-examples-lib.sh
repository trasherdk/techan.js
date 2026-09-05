#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
YEAR="$(date +%Y)"
BANNER="/*
 TechanJS v${VERSION}
 (c) 2014 - ${YEAR} Andre Dumas | https://github.com/andredumas/techan.js
*/"

mkdir -p "$ROOT/build"
echo "'use strict';module.exports='${VERSION}';" > "$ROOT/build/version.js"

npx browserify "$ROOT/src/techan.js" -s techan -x d3 -o "$ROOT/build/techan-nobanner.js"
printf '%s\n' "$BANNER" | cat - "$ROOT/build/techan-nobanner.js" > "$ROOT/examples/lib/techan.js"
npx uglify-js "$ROOT/examples/lib/techan.js" -c -m -o "$ROOT/build/techan.min.nobanner.js"
printf '%s\n' "$BANNER" | cat - "$ROOT/build/techan.min.nobanner.js" > "$ROOT/examples/lib/techan.min.js"

cp "$ROOT/examples/lib/techan.js" "$ROOT/dist/techan.js"
cp "$ROOT/examples/lib/techan.min.js" "$ROOT/dist/techan.min.js"

echo "Built examples/lib/techan.js and techan.min.js (v${VERSION})"
