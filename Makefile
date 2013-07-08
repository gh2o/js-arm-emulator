all: output/debian.js

run: all
	xdotool search '^JS Debian - ' | xargs -I: xdotool key --window : F5

validate: all
	./js -c output/debian.js

output/debian.js: build/util.js build/system.js build/debian.js | output
	cat $^ > $@

build/%.js: src/%.js | build
	cpp -nostdinc -undef -P $< -o $@

build output:
	[ -d $@ ] || mkdir $@

.depends:
$(shell rm -f .depends)
depgen = $(shell cpp -nostdinc -MM -MT $(file:src/%.js=build/%.js) $(file) >> .depends)
$(foreach file,$(wildcard src/*.js),$(depgen))
include .depends
$(shell rm -f .depends)
