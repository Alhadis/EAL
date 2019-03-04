#!/bin/sh
set -e

# Determine availability of required programs
command -v node 2>&1 >/dev/null || {
	>&2 printf 'This program requires Node.js to run.\n'
	>&2 printf 'Download from https://nodejs.org\n'
	exit 2
}

# Check if Node.js is recent enough (>= v8.5.0)
node --version | while IFS=. read -r major minor patch _; do
	unsupported=
	case ${major#v} in
		[0-7]) unsupported=1 ;;
		8) if [ "$minor" -lt 5 ]; then unsupported=1; fi ;;
	esac
	if [ "$unsupported" ]; then
		>&2 printf 'This program requires Node.js v8.5.0 or later.\n'
		exit 2
	fi
	break
done

# Determine if flags are needed to enter an ESM graph
if node --help 2>/dev/null | grep -q -- '^ *--experimental-modules'; then
	flags='--no-warnings --experimental-modules'
fi

node $flags "${0%/*}/../lib/index.mjs" "$@"