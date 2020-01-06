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
		case $cmd in d8) args="-- $args";; esac
		printf '%s %s %s\n' "$cmd" "$test" "$args"
		eval "$cmd \"$test\" $args 1>\"tmp/$base.stdout\" 2>\"tmp/$base.stderr\"" || {
			err $? "tmp/$base.stderr" "tmp/$base.stdout"
			continue
		}
		cmp "tmp/$base.stdout" "fixtures/$base.$i.stdout"
		cmp "tmp/$base.stderr" /dev/null
	done
done

exit $status
