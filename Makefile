all: output/console.js

run: all
	./js output/console.js

output/console.js: build/system.js build/console.js | output
	if which js-beautify >/dev/null 2>&1; then \
		cat $^ | js-beautify -i > $@; \
	else \
		cat $^ > $@; \
	fi

build/%.js: src/%.js | build
	cpp -nostdinc -undef -P $< -o $@

build output:
	[ -d $@ ] || mkdir $@

depgen = $(eval $(shell cpp -nostdinc -MM -MT $(file:src/%.js=build/%.js) $(file)))
$(foreach file,$(wildcard src/*.js),$(depgen))
