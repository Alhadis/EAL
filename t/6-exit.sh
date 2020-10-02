#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

file='fixtures/6-exit.mjs'
temp='tmp/6-exit'
for cmd in node 'deno run -A' 'qjs --std' v8 electron; do
	for code in '' 0 1 2 3 10 64 127 255; do
		
		# V8 requires `--` before script arguments
		unset dash; case "${cmd%% *}" in v8) case $code in ?*) dash='-- ';; esac; esac
		
		# Echo a command that (sort of) represents what we're doing
		printf '\e[38;5;8m$ %s %s %s; [ $? -eq %i ]\e[0m\n' \
		"$cmd" "$file" "$dash$code" "$code" | sed -e 's/ ;/;/'
		
		# Run the command and record the exit status
		$cmd "$file" $dash $code 1>"$temp.stdout" 2>"$temp.stderr"
		actual_code=$?
		
		# Make sure no output was generated
		cmp "$temp.stdout" /dev/null && \
		cmp "$temp.stderr" /dev/null || continue
		
		# Unspecified exit codes default to 13 in Node 14.8+ (see: nodejs/node@e948ef3)
		[ "$code" ] || case "$cmd${actual_code##13}" in node) code=13;; *) code=0;; esac
		
		# Piggy-back on our existing comparison logic for prettier-looking errors
		[ "$actual_code" -eq "$code" ] || {
			status=1
			printf '%s' "$actual_code" > "$temp.status"
			printf '%s' "$code" | cmp "$temp.status" | sed -e 's|/dev/status|Exit code|'
			printf '\n'
		}
	done
done

exit $status
