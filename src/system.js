#include "common.inc"

#define CORE_MEMORY 1024
#define MEMORY_START (CORE_MEMORY)

function System (options)
{
	/*****************************************
	 * DEFAULT OPTIONS                       *
	 *****************************************/

	DEFAULT_OPTION (options.memoryOffset, 0x10000000);
	DEFAULT_OPTION (options.memorySize, 32 * 1024 * 1024);

	/*****************************************
	 * OPTION CHECKING                       *
	 *****************************************/

	// memory should be multiple of page size
	options.memorySize = Math.ceil (options.memorySize / 4096) * 4096;

	/*****************************************
	 * PREPARATIONS                          *
	 *****************************************/

	var heap = new ArrayBuffer (MEMORY_START + options.memorySize);

	/*****************************************
	 * BRING IN THE CORE                     *
	 *****************************************/

	#include "system/core.js"
	this.core = Core (window, {}, heap);
}
