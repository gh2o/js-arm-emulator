COMMON := build/util.js build/system.js build/system/wrapper.js build/sd.js
OUTPUTS := output/www.js
CPPFLAGS := -nostdinc -undef -P

all: output/www.js output/node.js resources/devicetree.dtb

runwww: all
	xdotool search '^JS Debian - ' | xargs -I: xdotool key --window : F5

runnode: all
	node output/node.js

validate: all
	./js -c output/www.js

clean:
	rm -rf .depends build output

.depends:
	@echo > $@
	@{$(foreach file,$(COMMON), \
		cpp $(CPPFLAGS) -MM -MT $(file) $(file:build/%.js=src/%.js); \
	)} >> $@
	@{$(foreach file,$(OUTPUTS), \
		cpp $(CPPFLAGS) -MM -MT $(file:output/%.js=build/%.js) $(file:output/%.js=src/%.js); \
	)} >> $@
	@echo "$@: Makefile $(COMMON)" >> $@

ifneq ($(MAKECMDGOALS),clean)
-include .depends
endif

output/%.js: $(COMMON) build/%.js
	@mkdir -p output
	cat $^ > $@

build/%.js: src/%.js
	@mkdir -p $$(dirname $@)
	cpp $(CPPFLAGS) $< -o $@

resources/%.dtb: resources/%.dts
	./kbuild/scripts/dtc/dtc $< -o $@ -O dtb
