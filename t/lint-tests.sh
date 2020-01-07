#!/bin/sh
cd "${0%/*}"
status=0

# Make sure all tests terminate with the correct exit-status
forgot_status=`find . -type f -depth 1 \
| sed -e 's/^\.//; s|^/||' \
| grep '^[0-9].*\.sh$' \
| xargs grep -Le '^exit \$status$'`

if [ "$forgot_status" ]; then
	printf 'The following test(s) should with `exit $status`:\n'
	printf "%s\n" "$forgot_status" | sed -e 's/^/    /'
	status=1
fi

# Scan for portability issues
bashisms=`checkbashisms --posix *.sh 2>&1` || status=$?
bashisms=`printf '%s' "$bashisms" | sed -e '/#! interpreter line;$/ { N; d; }'`
if [ "$bashisms" ]; then
	[ ! "$forgot_status" ] || printf '\n'
	printf '%s\n' "$bashisms"
fi

exit $status
