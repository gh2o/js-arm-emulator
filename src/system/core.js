#include "constants.inc"

#define INT(x) ((x)|0)
#define S32(x) ((x)|0)
#define U32(x) ((x)>>>0)
#define DBL(x) (+(x))

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

	var wordView = new stdlib.Int32Array (heap);
	var byteView = new stdlib.Uint8Array (heap);

	var memoryOffset = INT (foreign.memoryOffset);
	var memorySize = INT (foreign.memorySize);
	var memoryError = 0;

	var log = foreign.log;
	var bail = foreign.bail;

	function reset ()
	{
		// reset CPSR (don't use setCPSR because current mode is invalid)
		wordView[ADDR_CPSR >> 2] = MODE_svc | PSR_I | PSR_F;

		// reset working registers
		setRegister (REG_PC, 0x0);
	}

	function getPC ()
	{
		return INT (wordView[REG_PC]);
	}

	function setPC (value)
	{
		PARAM_INT (value);
		wordView[REG_PC] = value;
	}

	function getRegister (reg)
	{
		PARAM_INT (reg);
		var value = 0, pcoffset = 0; /* pcoffset = 4 if reg is PC */
		value = INT (wordView[reg << 2 >> 2]);
		pcoffset = ((reg + 1) >> 2) & 0x04;
		return INT (value + pcoffset);
	}

	function setRegister (reg, value)
	{
		PARAM_INT (reg);
		PARAM_INT (value);
		wordView[reg << 2 >> 2] = value;
	}

	function getCPSR ()
	{
		return INT (wordView[ADDR_CPSR >> 2]);
	}

	function setCPSR (value)
	{
		PARAM_INT (value);

		var oldMode = 0;
		var newMode = 0;

		oldMode = getCPSR () & PSR_M;
		newMode = value & PSR_M;
		wordView[ADDR_CPSR >> 2] = value;

		if (S32 (oldMode) != S32 (newMode))
		{
			// copy current to old
			log (LOG_ID, 12334, LOG_HEX, INT (oldMode), LOG_HEX, INT (newMode));
			bail (13551345);
		}
	}

	function isPrivileged ()
	{
		return INT ((getCPSR () & PSR_M) != MODE_usr);
	}

	function memoryAddressToHeapOffset (addr)
	{
		PARAM_INT (addr);
		return INT (addr - memoryOffset + MEMORY_START);
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
		if (U32 (offset) >= U32 (memorySize))
			bail (2138);
		return INT (wordView[offset >> 2]);
	}

	function writeWord (addr, value)
	{
		PARAM_INT (addr);
		PARAM_INT (value);

		var offset = 0;

		// TODO: unaligned accesses
		if ((addr & 0x03) != 0)
			bail (2137);

		// TODO: MMU
		offset = memoryAddressToHeapOffset (addr);
		if (U32 (offset) >= U32 (memorySize))
			bail (2138);
		wordView[offset >> 2] = value;
	}

	function tick (numInstructions)
	{
		PARAM_INT (numInstructions);

		var pc = 0;
		var inst = 0;
		var stat = 0;

		for (;numInstructions; numInstructions = INT (numInstructions - 1))
		{
			// get and advance program counter
			pc = getPC ();
			setPC (INT (pc + 4));

			// read instruction at PC
			inst = readWord (pc);
			if (memoryError)
				bail (12980); // prefetch abort

			// execute the instruction
			stat = execute (inst);
			if (S32 (stat) != STAT_OK)
				bail (13515); // some stupid error occurred
		}
	}

	function execute (inst)
	{
		PARAM_INT (inst);

		var cpsr = 0;
		var condflag = 0;

		// setup condition flag
		cpsr = getCPSR ();
		switch ((inst >>> 28) & 0x0F)
		{
			case 0: condflag =  cpsr & PSR_Z; break;
			case 1: condflag = ~cpsr & PSR_Z; break;
			case 2: condflag =  cpsr & PSR_C; break;
			case 3: condflag = ~cpsr & PSR_C; break;
			case 4: condflag =  cpsr & PSR_N ; break;
			case 5: condflag = ~cpsr & PSR_N; break;
			case 6: condflag =  cpsr & PSR_V ; break;
			case 7: condflag = ~cpsr & PSR_V; break;
			case 8: condflag = (~cpsr &  (cpsr << 1)) & PSR_Z; break;
			case 9: condflag = ( cpsr | ~(cpsr << 1)) & PSR_Z; break;
			case 10: condflag = ~(cpsr ^ (cpsr << 3)) & PSR_N; break;
			case 11: condflag =  (cpsr ^ (cpsr << 3)) & PSR_N; break;
			case 12: condflag = ((~cpsr << 1) & ~(cpsr ^ (cpsr << 3))) & PSR_N; break;
			case 13: condflag = (( cpsr << 1) |  (cpsr ^ (cpsr << 3))) & PSR_N; break;
			case 14: condflag = 1; break;
			case 15: return STAT_UND;
		}

		// execute if necessary
		if (condflag)
			return subexecute (inst);
		else
			return STAT_OK;

		// should not reach here, only for annotation
		return STAT_OK;
	}

#define DECODER_FUNCTION subexecute
#include "decoder.js"
#undef DECODER_FUNCTION

#include "instructions.js"

	return {
		getPC: getPC,
		setPC: setPC,
		getRegister: getRegister,
		setRegister: setRegister,
		reset: reset,
		tick: tick
	};
}
