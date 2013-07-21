#include "common.inc"
#include "system.inc"

function System (options)
{
	/*****************************************
	 * DEFAULT OPTIONS                       *
	 *****************************************/

	DEFAULT_OPTION (options, {});
	DEFAULT_OPTION (options.memoryOffset, 0x20000000);
	DEFAULT_OPTION (options.memorySize, 64 * 1024 * 1024 - MEMORY_START);
	this.options = options;

	/*****************************************
	 * OPTION CHECKING                       *
	 *****************************************/

	if ((options.memoryOffset & 0x0FFF) != 0)
		throw new Error ("memoryOffset must be page aligned");

	var heapSize = this.options.heapSize = MEMORY_START + options.memorySize;
	if ((heapSize & (heapSize - 1)) != 0)
		throw new Error ("MEMORY_START + memorySize must be power of two");

	/*****************************************
	 * PREPARATIONS                          *
	 *****************************************/

	this.heap = new ArrayBuffer (heapSize);
	this.sd = new SD ();

	/*****************************************
	 * BRING IN THE CORE                     *
	 *****************************************/

	this.core = this.linkCore ();

	/*****************************************
	 * EXPORT CORE FUNCTIONS                 *
	 *****************************************/

	this.reset = this.core.reset;
	this.getPC = this.core.getPC;
	this.setPC = this.core.setPC;
	this.getRegister = this.core.getRegister;
	this.setRegister = this.core.setRegister;
	this.getCPSR = this.core.getCPSR;
	this.setCPSR = this.core.setCPSR;
	this.run = this.core.run;
	this.sd.doCommandCallback = this.core.sdCommandCallback;
	this.sd.doReadCallback = this.core.sdReadCallback;
	this.sd.dWriteCallback = this.core.sdWriteCallback;
}

System.prototype.needSwap = (function () {
	var arr = new Uint8Array (4);
	arr.set ([0xCA, 0xFE, 0xBA, 0xBE]);
	return 0xCAFEBABE === new Uint32Array (arr.buffer)[0];
})();

System.prototype.loadImage = function (image, address) {

	// pad if not word-aligned
	if (image.byteLength & 0x03)
	{
		var next = new ArrayBuffer ((image.byteLength + 3) & ~0x03);
		new Uint8Array (next).set (new Uint8Array (image));
		image = next;
	}

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

System.prototype.onConsoleByte = function () {
	throw new Error ("override onConsoleByte!");
};
