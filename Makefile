all: output/debian.js

run: all
	xdotool search 'JS Debian - Mozilla Firefox' | xargs -I: xdotool key --window : F5

output/debian.js: build/system.js build/debian.js | output
	cat $^ > $@

build/%.js: src/%.js | build
	cpp -nostdinc -undef -P $< -o $@

build output:
	[ -d $@ ] || mkdir $@

depgen = $(eval $(shell cpp -nostdinc -MM -MT $(file:src/%.js=build/%.js) $(file)))
$(foreach file,$(wildcard src/*.js),$(depgen))
