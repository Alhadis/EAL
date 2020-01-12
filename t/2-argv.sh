#!/bin/sh
cd "${0%/*}"
. ./test-header.sh

for cmd in node 'deno -A' 'qjs --std' d8 electron; do
	test='fixtures/2-argv.mjs'
	base="${test##*/}"
	base="${base%.mjs}"
	i=0
	for args in 'Foo Bar' 'Foo Bar Baz' '"Foo Bar" Baz'; do
		i=`expr "$i" + 1`
		case "${cmd%% *}" in deno|d8) args="-- $args";; esac
		cmd "$cmd" "$test" "$args" || continue
		cmp "tmp/$base.stdout" "fixtures/2.$i-argv.txt"
		cmp "tmp/$base.stderr" /dev/null
	done
done

exit $status
