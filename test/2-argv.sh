#!/bin/sh
set -e
cd "${0%/*}"
[ "$EAL_DID_SETUP" ] || . ./0-setup.sh

test_all '2.1-argv.mjs' 'Foo\n' '' '"Foo Bar" Baz'
end_test
