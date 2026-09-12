# Examples

Examples are git submodules pointing to gists which are viewable http://bl.ocks.org/ gists. Full gallery of available
examples can be viewed in the wiki [Examples Gallery](https://github.com/andredumas/techan.js/wiki/Gallery).

## Developing

By default they will be using online version of techanjs and d3. For local development, `grunt serve` (`grunt watch`)
is configured to make local development copies in `build/examples` replacing remote references to techanjs and d3 with
local build and bower dependencies.

Browser examples load **D3 v5** from `/lib/d3/v5/d3.js` (matches `package.json`). Techan still relies on the D3 v5
`d3.event` API in plot drag/crosshair code; do not point examples at `/lib/d3/v7/` without migrating that usage.
Build the bundle with `npm run build:examples-lib` (D3 is externalised; the page supplies it).

## Creating An Example

[Let’s Make a Block](https://bost.ocks.org/mike/block/)

Key files for techan examples:
* README.md
* The example itself
  * index.html
  * supporting data files
* 230×120 thumbnail