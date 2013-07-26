#define ASM_JS
#define DECODER_FUNCTION _subexecute

#include "core.inc"
#include "instructions.inc"
#include "mmu.inc"
#include "peripherals.inc"
#include "irq.inc"
#include "../common.inc"
#include "../system.inc"

function Core (stdlib, foreign, heap)
{
	"use asm";

	var wordView = new stdlib.Int32Array (heap);
	var byteView = new stdlib.Uint8Array (heap);

	var needSwap = INT (foreign.needSwap);

	var heapSize = INT (foreign.heapSize);
	var memoryOffset = INT (foreign.memoryOffset);
	var memorySize = INT (foreign.memorySize);
	var memoryError = 0;
	var tickCount = 0;

	var _floor = stdlib.Math.floor;
	var _ceil = stdlib.Math.ceil;
	var _imul = stdlib.Math.imul;
	var _getMilliseconds = foreign.getMilliseconds;

	var log = foreign.log;
	var bail = foreign.bail;
	var print = foreign.print;

	var _sdCommand = foreign.sdCommand;
	var _sdRead = foreign.sdRead;
	var _sdWrite = foreign.sdWrite;

#define INCLUDE_VARIABLES
#include "cp15.js"
#include "peripherals.js"
#include "builtins.js"
#undef INCLUDE_VARIABLES

	function _reset ()
	{
		// reset system registers
		cp15_reset ();

		// reset CPSR (don't use setCPSR because current mode is invalid)
		wordView[ADDR_CPSR >> 2] = MODE_svc | PSR_I | PSR_F;

		// reset working registers
		setRegister (REG_PC, 0x0);
	}

	function _getPC ()
	{
		return INT (wordView[REG_PC]);
	}

	function _setPC (value)
	{
		PARAM_INT (value);
		wordView[REG_PC] = value;
	}

	function _getRegister (reg)
	{
		PARAM_INT (reg);
		var value = 0, pcoffset = 0; /* pcoffset = 4 if reg is PC */
		value = INT (wordView[reg << 2 >> 2]);
		pcoffset = ((reg + 1) >> 2) & 0x04;
		return INT (value + pcoffset);
	}

	function _setRegister (reg, value)
	{
		PARAM_INT (reg);
		PARAM_INT (value);
		wordView[reg << 2 >> 2] = value;
	}

	function _getCPSR ()
	{
		return INT (wordView[ADDR_CPSR >> 2]);
	}

	function _setCPSR (value)
	{
		PARAM_INT (value);

		var oldMode = 0;
		var newMode = 0;

		oldMode = getCPSR () & PSR_M;
		newMode = value & PSR_M;
		wordView[ADDR_CPSR >> 2] = value;

		if (S32 (oldMode) != S32 (newMode))
			_switchWorkingSet (oldMode, newMode);
	}

	function _getSPSR ()
	{
		return INT (wordView[ADDR_SPSR >> 2]);
	}

	function _setSPSR (value)
	{
		PARAM_INT (value);
		wordView[ADDR_SPSR >> 2] = value;
	}

	function _switchWorkingSet (oldMode, newMode)
	{
		PARAM_INT (oldMode);
		PARAM_INT (newMode);

		var oldG1 = 0;
		var oldG2 = 0;
		var newG1 = 0;
		var newG2 = 0;
		var base = 0;

		switch (S32 (oldMode))
		{
			case MODE_usr:
			case MODE_sys: oldG1 = 0; break;
			case MODE_svc: oldG1 = 1; break;
			case MODE_abt: oldG1 = 2; break;
			case MODE_und: oldG1 = 3; break;
			case MODE_irq: oldG1 = 4; break;
			case MODE_fiq: oldG1 = 5; oldG2 = 1; break;
			default: bail (32895017);
		}

		switch (S32 (newMode))
		{
			case MODE_usr:
			case MODE_sys: newG1 = 0; break;
			case MODE_svc: newG1 = 1; break;
			case MODE_abt: newG1 = 2; break;
			case MODE_und: newG1 = 3; break;
			case MODE_irq: newG1 = 4; break;
			case MODE_fiq: newG1 = 5; newG2 = 1; break;
			default: bail (32895018);
		}

		if (S32 (oldG1) != S32 (newG1))
		{
			// current to old
			base = INT (ADDR_GROUP1 + (oldG1 << SSHIFT_GROUP1));
			wordView[(base + 0) >> 2] = getRegister (REG_R13);
			wordView[(base + 4) >> 2] = getRegister (REG_R14);
			wordView[(base + 8) >> 2] = wordView[ADDR_SPSR >> 2];

			// new to current
			base = INT (ADDR_GROUP1 + (newG1 << SSHIFT_GROUP1));
			setRegister (REG_R13, INT (wordView[(base + 0) >> 2]));
			setRegister (REG_R14, INT (wordView[(base + 4) >> 2]));
			wordView[ADDR_SPSR >> 2] = wordView[(base + 8) >> 2];
		}

		if (S32 (oldG2) != S32 (newG2))
			bail (310184);
	}

	function _isPrivileged ()
	{
		return INT ((getCPSR () & PSR_M) != MODE_usr);
	}

	function _memoryAddressToHeapOffset (addr)
	{
		PARAM_INT (addr);
		return INT (addr - memoryOffset + MEMORY_START);
	}

	function _triggerException (mode, target)
	{
		PARAM_INT (mode);
		PARAM_INT (target);

		var cpsr = 0;
		var spsr = 0;

		cpsr = getCPSR ();
		spsr = cpsr;

		switch (S32 (mode))
		{
			case MODE_irq:
			case MODE_abt:
			case MODE_svc:
				cpsr = cpsr & ~(PSR_M | PSR_T) | (mode | PSR_I);
				break;
			default:
				bail (2904175);
				break;
		}

		target = target | ((cp15_SCTLR & CP15_SCTLR_V) ? 0xFFFF0000 : 0);

		setCPSR (cpsr);
		setSPSR (spsr);
		setRegister (REG_LR, INT (getPC () + 4));
		setRegister (REG_PC, target);
	}

	function _run (numInstructions)
	{
		PARAM_INT (numInstructions);

		var pc = 0;
		var inst = 0;
		var stat = 0;

		for (;numInstructions; numInstructions = INT (numInstructions - 1))
		{
			// increment tick counter, check for IRQs every few ticks
			if ((tickCount & 0xFF) == 0)
				irqPoll ();
			tickCount = INT (tickCount + 1);

			// get and read at program counter
			pc = getPC ();
			inst = readWord (pc, MMU_TRANSLATE_EXECUTE);
			if (memoryError)
			{
				triggerException (MODE_abt, 0x0C);
				continue;
			}

			// advance program counter before execution
			setPC (INT (pc + 4));

			// execute the instruction
			stat = execute (inst);
			switch (S32 (stat))
			{
				case STAT_OK:
					break;
				case STAT_ABT: // data abort
					triggerException (MODE_abt, 0x10);
					break;
				case STAT_SVC: // supervisor mode
					setPC (pc);
					triggerException (MODE_svc, 0x08);
					break;
				default:
					bail (13515); // some stupid error occurred
					break;
			}
		}
	}

	function _execute (inst)
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

#define INCLUDE_FUNCTIONS
#include "mmu.js"
#include "decoder.js"
#include "instructions.js"
#include "cp15.js"
#include "irq.js"
#include "peripherals.js"
#include "builtins.js"
#undef INCLUDE_FUNCTIONS

#define INCLUDE_TABLES
#include "decoder.js"
#include "peripherals.js"
#undef INCLUDE_TABLES

	return {
		// general
		getPC: _getPC,
		setPC: _setPC,
		getRegister: _getRegister,
		setRegister: _setRegister,
		getCPSR: _getCPSR,
		setCPSR: _setCPSR,
		reset: _reset,
#define INCLUDE_EXPORTS
#include "peripherals.js"
#include "builtins.js"
#undef INCLUDE_EXPORTS
		run: _run
	};
}
