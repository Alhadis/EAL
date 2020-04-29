export ELECTRON_RUN_AS_NODE=1
export ELECTRON_ENABLE_LOGGING=true
export NODE_OPTIONS='--experimental-modules --no-warnings'
status=0

# Execute a command and dump its output to `tmp/*.std{err,out}`
cmd(){
	if [ -d "$COVERAGE" ]; then
		case "${1%% *}" in
			d8)   set -- "d8${1#d8} --lcov=$COVERAGE/d8.lcov" "$2" "$3";;
			node) export NODE_V8_COVERAGE="$COVERAGE/node";;
		esac
	fi
	set -- "$1" "$2" "$3" "${2##*/}"
	set -- "$1" "$2" "$3" "tmp/${4%.*}"
	printf '\e[38;5;8m$ %s %s %s\e[0m\n' "$1" "$2" "$3"
	eval "$1 \"$2\" $3 1>\"$4.stdout\" 2>\"$4.stderr\"" || err $? "$4.stderr" "$4.stdout"
}

# Compare two files and complain if they're different
cmp(){
	[ -t 0 ] \
	&& set -- "`diff -U4 "$1" "$2"`"    "$?" "/dev/${1##*.}" \
	|| set -- "`cat | diff -U4 "$1" -`" "$?" "/dev/${1##*.}"
	if [ $2 -ne 0 ]; then
		printf '\n%4s\e[1m%s\e[0m' \  "$3"
		printf '%s' "$1" | sed -f format-diff.sed
		status=$2
		return $2
	fi
}

# Handle an unexpected exit-code
err(){
	if [ "$1" -ne 0 ]; then
		printf '%4s\e[31mCommand exited with code %s\e[0m\n\n' \  "$1"
		{ [ -s "$2" ] && LC_ALL=C sed -f format-error.sed "$2" && printf '\n'; } || \
		{ [ -s "$3" ] && LC_ALL=C sed -f format-error.sed "$3" && printf '\n'; }
		return $1
	fi
}
