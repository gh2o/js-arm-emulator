#include "common.inc"
#include "system/system.inc"

#define CORE_MEMORY 4096
#define MEMORY_START (CORE_MEMORY)

#define LOG_ID (0)
#define LOG_HEX (1)
#define LOG_SIGNED (2)
#define LOG_UNSIGNED (3)

function System (options)
{
	/*****************************************
	 * DEFAULT OPTIONS                       *
	 *****************************************/

	DEFAULT_OPTION (options, {});
	DEFAULT_OPTION (options.memoryOffset, 0x10000000);
	DEFAULT_OPTION (options.memorySize, 32 * 1024 * 1024 - MEMORY_START);
	this.options = options;

	/*****************************************
	 * OPTION CHECKING                       *
	 *****************************************/

	if ((options.memoryOffset & 0x0FFF) != 0)
		throw new Error ("memoryOffset must be page aligned");

	var heapSize = MEMORY_START + options.memorySize;
	if ((heapSize & (heapSize - 1)) != 0)
		throw new Error ("MEMORY_START + memorySize must be power of two");

	/*****************************************
	 * PREPARATIONS                          *
	 *****************************************/

	this.heap = new ArrayBuffer (heapSize);

	/*****************************************
	 * BRING IN THE CORE                     *
	 *****************************************/

	#include "system/core.js"
	this.core = Core (window, this.createForeign (), this.heap);

	/*****************************************
	 * EXPORT CORE FUNCTIONS                 *
	 *****************************************/

	this.reset = this.core.reset;
	this.getPC = this.core.getPC;
	this.setPC = this.core.setPC;
	this.getRegister = this.core.getRegister;
	this.setRegister = this.core.setRegister;
	this.tick = this.core.tick;
}

System.prototype.needSwap = (function () {
	var arr = new Uint8Array (4);
	arr.set ([0xCA, 0xFE, 0xBA, 0xBE]);
	return 0xCAFEBABE === new Uint32Array (arr.buffer)[0];
})();

System.prototype.createForeign = function () {
	return {
		memorySize: this.options.memorySize,
		memoryOffset: this.options.memoryOffset,
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
						a = (v >>> 0).toString (16);
						while (a.length < 8)
							a = "0" + a;
						a = "0x" + a;
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
			throw new Error ("Bail! (" + code + ")");
		}
	};
};

System.prototype.loadImage = function (image, address) {

	// create source buffer
	var source = new Int32Array (image.slice (0));

	// swap bytes if needed
	if (this.needSwap)
	{
		for (var i = 0; i < source.length; i++)
		{
			var x = source[i];
			source[i] =
				((x & 0xFF000000) >>> 24) |
				((x & 0x00FF0000) >>> 8) |
				((x & 0x0000FF00) << 8) |
				((x & 0x000000FF) << 24);
		}
	}

	// copy to heap buffer
	var heapOffset = address - this.options.memoryOffset + MEMORY_START;
	var target = new Int32Array (this.heap, heapOffset, source.length);
	target.set (source);
};
