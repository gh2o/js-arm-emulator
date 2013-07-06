#include "common.inc"

#define CORE_MEMORY 1024
#define MEMORY_START (CORE_MEMORY)

function System (options)
{
	/*****************************************
	 * DEFAULT OPTIONS                       *
	 *****************************************/

	DEFAULT_OPTION (options, {});
	DEFAULT_OPTION (options.memoryOffset, 0x10000000);
	DEFAULT_OPTION (options.memorySize, 32 * 1024 * 1024);
	this.options = options;

	/*****************************************
	 * OPTION CHECKING                       *
	 *****************************************/

	// memory offset and size must be page aligned
	if ((options.memoryOffset & 0x0FFF) != 0)
		throw new Error ("memoryOffset must be aligned");
	if ((options.memorySize & 0x0FFF) != 0)
		throw new Error ("memorySize must be aligned");

	/*****************************************
	 * PREPARATIONS                          *
	 *****************************************/

	this.heap = new ArrayBuffer (MEMORY_START + options.memorySize);

	/*****************************************
	 * BRING IN THE CORE                     *
	 *****************************************/

	#include "system/core.js"
	this.core = Core (window, {}, this.heap);
}

System.prototype.needSwap = (function () {
	var arr = new Uint8Array (4);
	arr.set ([0xCA, 0xFE, 0xBA, 0xBE]);
	return 0xCAFEBABE === new Uint32Array (arr.buffer)[0];
})();

System.prototype.loadImage = function (image, address) {

	// create source buffer
	var source = new Int32Array (image);

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
