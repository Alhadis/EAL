#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

file='fixtures/4-script-path.mjs'
abspath="`pwd`/$file"

# Sanity check
[ -s "$abspath" ] || {
	printf 'File not found: %s\n' "$abspath"
	exit 2
}

temp='tmp/4-script-path'
printf '%s\n' "$abspath" > "$temp.txt"
for cmd in node 'deno -A' 'qjs --std' electron; do
	cmd "$cmd" "$file"
	cmp "$temp.stdout" "$temp.txt"
	cmp "$temp.stderr" /dev/null
done

# V8: No support for $0, assert `null` value instead
cmd d8 "$file"
printf 'null\n' > "$temp.txt"
cmp "$temp.stdout" "$temp.txt"
cmp "$temp.stderr" /dev/null

exit $status
