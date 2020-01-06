#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

for test in fixtures/1.*.mjs; do
	for cmd in node 'deno -A' 'qjs --std' d8 electron; do
		base="${test##*/}"
		base="${base%.mjs}"
		printf '%s %s\n' "$cmd" "$test"
		$cmd "$test" 1>"tmp/$base.stdout" 2>"tmp/$base.stderr" || {
			err $? "tmp/$base.stderr" "tmp/$base.stdout"
			continue
		}
		cmp "tmp/$base.stdout" "fixtures/$base.stdout"
		cmp "tmp/$base.stderr" /dev/null
	done
done

exit $status
