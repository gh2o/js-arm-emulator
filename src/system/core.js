#include "constants.inc"

#define INT(x) (x)|0
#define DBL(x) +(x)

#define PARAM_INT(x) x = x|0
#define PARAM_DBL(x) x = +x

#define STAT_OK (0)
#define STAT_ABT (1)
#define STAT_UND (2)
#define STAT_SWI (3)

/****************************************
 
 Core memory map:

   General purpose registers:

     0x0000 - 0x0040: current R0-R15
     0x0040 - 0x0054: R8-R12 for all modes except fiq
	 0x0054 - 0x0060: unused
     0x0060 - 0x0074: R8-R12 for mode fiq
	 0x0074 - 0x0080: unused
     0x0080 - 0x0088: R13-R14 for modes usr and sys
     0x0088 - 0x0090: R13-R14 for mode svc
     0x0090 - 0x0098: R13-R14 for mode abt
     0x0098 - 0x0100: R13-R14 for mode und
	 0x0100 - 0x0108: R13-R14 for mode irq
	 0x0108 - 0x0110: R13-R14 for mode fiq

   Program status registers (4 bytes each):
   
     0x0180: CPSR (current)
	 0x0184: SPSR (current)
	 0x0188: SPSR (svc)
	 0x018C: SPSR (abt)
	 0x0190: SPSR (und)
	 0x0194: SPSR (irq)
	 0x0198: SPSR (fiq)

   Control registers:

     0x0280: 

 ****************************************/

#define ADDR_CPSR (0x0180)

function Core (stdlib, foreign, heap)
{
	"use asm";

	var sview = new stdlib.Int32Array (heap);
	var uview = new stdlib.Uint32Array (heap);

	var memoffset = INT (foreign.memoffset);
	var log = foreign.log;
	var bail = foreign.bail;

	var memerr = 0;

	function reset ()
	{
		// reset working registers
		setCPSR (MODE_svc | PSR_I | PSR_F);
		setRegister (REG_PC, 0x0);
	}

	function getPC ()
	{
		return INT (sview[REG_PC]);
	}

	function setPC (value)
	{
		PARAM_INT (value);
		sview[REG_PC] = value;
	}

	function getRegister (reg)
	{
		PARAM_INT (reg);
		var value = 0, pcoffset = 0; /* pcoffset = 8 if reg is PC */
		value = INT (sview[reg << 2 >> 2]);
		pcoffset = ((reg + 1) >> 1) & 0x08;
		return INT (value + pcoffset);
	}

	function setRegister (reg, value)
	{
		PARAM_INT (reg);
		PARAM_INT (value);
		sview[reg << 2 >> 2] = value;
	}

	function getCPSR ()
	{
		return INT (sview[ADDR_CPSR >> 2]);
	}

	function setCPSR (value)
	{
		PARAM_INT (value);
		sview[ADDR_CPSR >> 2] = value;
	}

	function memoryAddressToHeapOffset (addr)
	{
		PARAM_INT (addr);
		return INT (addr - memoffset + MEMORY_START);
	}

	function readWord (addr)
	{
		PARAM_INT (addr);

		var offset = 0;
		var value = 0;

		// TODO: unaligned accesses
		if ((addr & 0x03) != 0)
			bail (2136);

		// TODO: MMU
		offset = memoryAddressToHeapOffset (addr);
		return INT (sview[offset >> 2]);
	}

	function writeWord (addr, value)
	{
		PARAM_INT (addr);
		PARAM_INT (value);

		// TODO: unaligned accesses
		if ((addr & 0x03) != 0)
			bail (2137);

		// TODO: MMU
		bail (54);
	}

	function tick (numInstructions)
	{
		PARAM_INT (numInstructions);

		var pc = 0;
		var inst = 0;
		var stat = 0;

		for (;numInstructions; numInstructions = INT (numInstructions - 1))
		{
			// get program counter
			pc = getPC ();

			// read instruction at PC
			inst = readWord (pc);
			if (memerr)
				bail (12980); // prefetch abort

			// execute the instruction
			stat = execute (inst);
			if (INT (stat) != STAT_OK)
				bail (13515); // some stupid error occurred
		}
	}

	function execute (inst)
	{
		PARAM_INT (inst);

		// check condition field
		log (LOG_HEX, INT (inst));
		bail (3134);

		return STAT_OK;
	}

	return {
		reset: reset,
		getPC: getPC,
		setPC: setPC,
		getRegister: getRegister,
		setRegister: setRegister,
		tick: tick
	};
}
