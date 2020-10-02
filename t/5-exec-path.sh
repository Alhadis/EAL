#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

# Sanity check: ensure required programs are available
which "$SHELL" 2>&1 >/dev/null || {
	printf '%s\n' '`which` utility is broken or missing'
	exit 2
}
which realpath 2>&1 >/dev/null || {
	printf '%s\n' 'Unable to locate `realpath` command'
	exit 2
}

file='fixtures/5-exec-path.mjs'
temp='tmp/5-exec-path'
for cmd in node 'deno run -A' 'qjs --std'; do
	path=`which "${cmd%% *}"`
	path=`realpath "$path"`
	printf '%s\n' "$path" > "$temp.txt"
	cmd "$cmd" "$file"
	cmp "$temp.stdout" "$temp.txt"
	cmp "$temp.stderr" /dev/null
done

# Electron's `process.execPath` is modified when run from CLI
path=`which electron`
path=`realpath "$path"`
path="${path%/*}/index.js"
node -p "require(\"$path\");" > "$temp.txt"
cmd electron "$file"
cmp "$temp.stdout" "$temp.txt"
cmp "$temp.stderr" /dev/null

exit $status
