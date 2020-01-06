export ELECTRON_RUN_AS_NODE=1
export ELECTRON_ENABLE_LOGGING=true
export NODE_OPTIONS='--experimental-modules --no-warnings'
status=0

# Compare two files and complain if they're different
cmp(){
	set -- "`diff -U4 "$1" "$2"`" "$?" "/dev/${1##*.}"
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
