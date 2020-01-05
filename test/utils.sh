export EAL_DID_UTILS=1

# ==============================================================================
# 1. Generic utility functions
# ==============================================================================

# Terminate with an error message
# - Usage: die [reason] [exit-code=1]
die(){
	printf '%s\n' "$1"
	[ "$2" ] && exit "$2" || exit 1
}

# Indent each line of standard input
indent(){
	LC_ALL=C sed -e s/^/\	/g
}

# Verify that [executables] are installed and reachable from $PATH
# - Usage: need [...executables]
need(){
	while [ $# -gt 0 ]; do
		command -v "$1" >/dev/null 2>&1 || die "Unable to resolve path to $1" 2
		shift
	done
}

# Read the entirety of standard input and place it $1
# - Usage: slurp [var-name] < [input]
slurp(){
	while IFS= read -r line; do
		set -- "$1" "$2`printf '\n%s' "$line"`"
	done
	set -- "$1" "`printf '%s\n' "$2" | sed -n 's/^[[:blank:]]//; /[^ \t]/,$p;'`"
	eval $1=\$2
}


# ==============================================================================
# 2. Application-specific
# ==============================================================================

# Examine the stdout/stderr dumps from the last test
check_results(){
	set -- "$1" "$2"
	do_diff "$1" "$EAL_TEMP_DIR/tmp.out" || set -- "$1" "$2" $?
	do_diff "$2" "$EAL_TEMP_DIR/tmp.err" || set -- "$1" "$2" $?
	
	# Append a blank line after error output
	case $3 in 0);; ?) printf '\n';; esac
	return $3
}

# Assert the exit code is equal to zero
check_status(){
	case $1 in 0);; ?)
		printf '\t%s%s Exited with error code %s%s\n\n' "`sgr 31m`" "`sym fail`" "$1" "`sgr 0m`"
		if   [ -s "$EAL_TEMP_DIR/tmp.err" ]; then indent < "$EAL_TEMP_DIR/tmp.err"; printf '\n'
		elif [ -s "$EAL_TEMP_DIR/tmp.out" ]; then indent < "$EAL_TEMP_DIR/tmp.out"; printf '\n'
		fi
		return $1
	;; esac
}

# Use diff(1) to compare a string with the contents of a file
# - Usage: do_diff [input] [file]
do_diff(){
	set -- "$1" "$2" "`printf "$1" | diff -U4 "$2" -`" "$?"
	if [ "$4" -ne 0 ]; then
		case $2 in
			*.err) printf '\n\t%s/dev/stderr%s\n' "`sgr 1m`" "`sgr 0m`" ;;
			*.out) printf '\n\t%s/dev/stdout%s\n' "`sgr 1m`" "`sgr 0m`" ;;
		esac
		printf '%s\n' "$3" | fmt_diff | indent
		return $4
	fi
}

# Set the appropriate exit status depending on $TESTS_FAILED
end_test(){
	case $TESTS_FAILED in 0);; ?) exit 1;; esac
}

# Run a script, dumping its stdout/stderr streams to `${EAL_TEMP_DIR}/tmp.*`
# - Usage: run_file [command] [script-file]
run_file(){
	[ -d "$EAL_TEMP_DIR" ] || die 'Unable to access $EAL_TEMP_DIR' 2
	printf '%s %s %s\n' "$1" "$2" "$3"
	$1 "$2" $3 1>"$EAL_TEMP_DIR/tmp.out" 2>"$EAL_TEMP_DIR/tmp.err"
}

# Run a test comparing the stdout/stderr of a command
# - Usage: test_stdio [command] [script-file] [expected-stdout] [expected-stderr] [script-args]
test_stdio(){
	run_file "$1" "$2" $5 || check_status $? || track_failure
	check_results "$3" "$4" || track_failure
	track_pass
}

# Increment the $TESTS_FAILED environment variable
track_failure(){
	[ "$TESTS_FAILED" ] || TESTS_FAILED=0
	TESTS_FAILED=`expr "$TESTS_FAILED" + 1`
	export TESTS_FAILED
}

# Increment the $TESTS_PASSED environment variable
track_pass(){
	[ "$TESTS_PASSED" ] || TESTS_PASSED=0
	TESTS_PASSED=`expr "$TESTS_PASSED" + 1`
	export TESTS_PASSED
}


# Resolve functions that behave differently when stdout isn't a TTY
# - fmt_diff: Strip `---` and `+++` then add colour to headers and changed lines
# - sgr:      Emit ANSI control codes if TTY
if [ -t 1 ]; then
	eval "sgr(){ printf '\e[%s' \"\$@\"; }"
	eval 'fmt_diff(){
		sed -e '\''
			/^--- /,/^+++ /d;
			/^\\ No newline at end of file$/d;
			s/^-/'"`printf '\e'`"'[31m-/;
			s/^+/'"`printf '\e'`"'[32m+/;
			s/^@/'"`printf '\e'`"'[36m@/;
			s/$/'"`printf '\e'`"'[0m/;
		'\'';
	}'
else
	eval "sgr(){ :; }"
	eval 'fmt_diff(){
		sed -e '\''
			/^--- /,/^+++ /d;
			/^\\ No newline at end of file$/d;
		'\'';
	}'
fi

# Resolve function for printing Unicode symbols
if uname -s | grep -i 'win\(dows\)*32'; then
	eval 'sym(){
		case $1 in
			fail) printf "×" ;;
			pass) printf "√" ;;
			lquo) printf "\`" ;;
			rquo) printf "'\''" ;;
		esac
	}'
elif [ "$DISPLAY" ]; then
	eval 'sym(){
		case $1 in
			fail) printf "✘" ;;
			pass) printf "✓" ;;
			lquo) printf "‘" ;;
			rquo) printf "’" ;;
		esac
	}'
else
	# Assume no $DISPLAY means we're running from a text console.
	eval 'sym(){
		case $1 in
			fail) printf " X" ;;
			pass) printf "OK" ;;
			lquo) printf "\`" ;;
			rquo) printf "'\''" ;;
		esac
	}'
fi


# ==============================================================================
# 3. Case-specific
#    These functions are specific to this particular test-suite, and will need
#    updating if this library is re-used in similar projects.
# ==============================================================================

# Run `test_stdio` for all supported JavaScript interpreters
test_all(){
	test_stdio node        "$1" "$2" "$3" "$4"
	test_stdio 'deno -A'   "$1" "$2" "$3" "$4"
	test_stdio 'qjs --std' "$1" "$2" "$3" "$4"
	test_stdio d8          "$1" "$2" "$3" "$4"
	test_stdio electron    "$1" "$2" "$3" "$4"
}
