all: lint test

lint:
	jg lint

.PHONY: lint

test:
	for i in test/?-*.sh; do [ ! -x "$$i" ] || "$$i"; done

.PHONY: test
