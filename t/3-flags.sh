#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

file='fixtures/3-flags.mjs'
out='tmp/3-flags.stdout'
err='tmp/3-flags.stderr'

# Node.js
cmd node "$file"
cmp "$out" fixtures/3.1-flags-node.txt
cmp "$err" /dev/null

# Deno
cmd 'deno -A' "$file"
cmp "$out" fixtures/3.2-flags-deno.txt
cmp "$err" /dev/null

# QuickJS
cmd qjs "$file"
cmp "$out" fixtures/3.3-flags-qjs.txt
cmp "$err" /dev/null
cmd 'qjs --std' "$file"
cmp "$out" fixtures/3.3-flags-qjs.txt
cmp "$err" /dev/null

# QuickJS with extensions
cmd qjsbn "$file"
cmp "$out" fixtures/3.4-flags-qjsbn.txt
cmp "$err" /dev/null
cmd 'qjsbn --std' "$file"
cmp "$out" fixtures/3.4-flags-qjsbn.txt
cmp "$err" /dev/null

# V8 shell
cmd d8 "$file"
cmp "$out" fixtures/3.5-flags-d8.txt
cmp "$err" /dev/null

# Electron
cmd electron "$file"
cmp "$out" fixtures/3.6-flags-electron.txt
cmp "$err" /dev/null

exit $status
