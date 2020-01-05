#!/bin/sh
set -e
cd "${0%/*}"
[ "$EAL_DID_SETUP" ] || . ./0-setup.sh

test_all '1.1-log.mjs' 'Foo\n' ''
end_test
