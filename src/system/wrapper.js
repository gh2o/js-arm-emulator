// define ASM_JS so that core will have access to asm.js specific macros
// can't define it later because of #pragma once
#define ASM_JS

#include "../system.inc"

System.prototype.linkCore = function () {

	var system = this;

	var foreign = {
		needSwap: Number (system.needSwap),
		heapSize: system.options.heapSize,
		memorySize: system.options.memorySize,
		memoryOffset: system.options.memoryOffset,
		log: function () {
			var nargs = [];
			for (var i = 0; i < arguments.length; i += 2)
			{
				var k = arguments[i];
				var v = arguments[i+1];
				var a;
				switch (k)
				{
					case LOG_ID:
						a = "<" + v + ">";
						break;
					case LOG_HEX:
						a = formatHex (v);
						break;
					case LOG_SIGNED:
						a = (v >> 0).toString (10);
						break;
					case LOG_UNSIGNED:
						a = (v >>> 0).toString (10);
						break;
				}
				nargs.push (a)
			}
			console.log.apply (console, nargs);
		},
		bail: function (code) {
			for (var i = 0; i < 16; i++)
			{
				var r = system.getRegister (i);
				console.error ("=== R" + i + ": " + formatHex (r));
			}
			console.error ("=== PC: " + formatHex (system.getPC () - 4));
			console.error ("=== CPSR: " + formatHex (system.getCPSR ()));
			throw new Error ("Bail! (" + code + ")");
		},
		print: function (b) {
			system.onConsoleByte (b & 0xFF);
		},
		getMilliseconds: getMilliseconds
	};

	var stdlib = (function () { return this; })();
	return Core (stdlib, foreign, system.heap);

	// include core here to avoid barrage of macros
	#include "core.js"
};
