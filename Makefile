depgen = $(eval $(shell cpp -undef -nostdinc -MM -MT $(file:src/%.js=build/%.js) $(file)))
$(foreach file,$(wildcard src/*.js),$(depgen))

all: build/core.js

build/%.js: src/%.js | build
	cpp -undef -nostdinc $< -o $@

build:
	mkdir $@
