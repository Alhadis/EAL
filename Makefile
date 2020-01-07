all: lint test


# Check source for errors and style violations
lint: lint-js lint-tests

lint-js:
	jg lint

lint-tests:
	t/lint-tests.sh

.PHONY: lint lint-js lint-tests


# Run unit-tests
test: lint-tests
	@ for i in t/{1..9}*.sh; do \
		[ -x "$$i" ] || continue; \
		echo $$i; "$$i" || exit $?; \
	done

.PHONY: test


# Nuke artefacts generated by tests
clean:
	rm -rf t/tmp/*
