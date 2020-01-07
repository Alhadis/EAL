#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

file='fixtures/7-warn.mjs'
set -- 'Foo' 'Foo Bar' 'Foo Bar Baz Quz Qul'

for cmd in node 'deno -A' 'qjs --std' d8 electron; do
	i=0
	for args in "$1" "$2" "$3"; do
		i=`expr "$i" + 1`
		case $cmd in d8) args="-- $args";; esac
		cmd "$cmd" "$file" "$args" || continue
		cmp "tmp/7-warn.stdout" /dev/null
		cmp "tmp/7-warn.stderr" "fixtures/7.$i-warn.txt"
	done
done

# QuickJS: Assert that `warn()` still works without stderr access
i=0
for args in "$1" "$2" "$3"; do
	i=`expr "$i" + 1`
	cmd qjs "$file" "$args" || continue
	cmp "tmp/7-warn.stdout" "fixtures/7.$i-warn.txt"
	cmp "tmp/7-warn.stderr" /dev/null
done

exit $status
