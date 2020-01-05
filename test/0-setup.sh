export EAL_DID_SETUP=1
. ./utils.sh

export ELECTRON_RUN_AS_NODE=1
export ELECTRON_ENABLE_LOGGING=true
export NODE_OPTIONS='--experimental-modules --no-warnings'

# Resolve directory for temporary file-storage
[ -d "$EAL_TEMP_DIR" ] \
	|| export EAL_TEMP_DIR=`mktemp -d /tmp/Alhadis.EAL.XXXXXX` \
	|| die 'Failed to create temporary directory' 2

# Ensure JavaScript interpreters/environments are installed
need diff node deno qjs d8

[ "$TESTS_FAILED" -ge 0 ] 2>/dev/null || export TESTS_FAILED=0
[ "$TESTS_PASSED" -ge 0 ] 2>/dev/null || export TESTS_PASSED=0
