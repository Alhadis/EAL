1 a\
\
\ \ \ \ [32m+ expected [31m- actual[0m\
\

/^--- /, /^+++ /d
/^\\ No newline at end of file$/d

s/^-/[31m-/
s/^+/[32m+/
s/^@/[36m@/
s/$/[0m/
s/^/    /
$ a\
\
