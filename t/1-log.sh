#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

for test in fixtures/1.*.mjs; do
	for cmd in node 'deno -A' 'qjs --std' d8 electron; do
		base="${test##*/}"
		base="${base%.mjs}"
		cmd "$cmd" "$test" || continue
		cmp "tmp/$base.stdout" "fixtures/$base.txt"
		cmp "tmp/$base.stderr" /dev/null
	done
done

exit $status
