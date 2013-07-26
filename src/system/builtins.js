#include "builtins.inc"
#include "mmu.inc"

#ifndef BUILTIN_TABLE
#	if defined(INCLUDE_VARIABLES)
#		define BUILTIN(func) var builtinAddr_##func = 0;
#	elif defined(INCLUDE_FUNCTIONS)
#		define BUILTIN(func) function _builtinSet_##func (x) { x=x|0; builtinAddr_##func = x|0; }
#	elif defined (INCLUDE_EXPORTS)
#		define BUILTIN(func) builtinSet_##func: _builtinSet_##func,
#	else
#		error "unknown builtin include!"
#	endif
#	define BUILTIN_TABLE
#	include "builtins.js"
#	undef BUILTIN_TABLE
#	undef BUILTIN
#endif

#ifdef BUILTIN_TABLE
BUILTIN (memcpy)
#endif

#ifndef BUILTIN_TABLE
#ifdef INCLUDE_FUNCTIONS

function _builtinFunc_memcpy ()
{
	var dst = 0, src = 0, size = 0, tmp = 0;

	dst = getRegister (REG_R0);
	src = getRegister (REG_R1);
	size = getRegister (REG_R2);

	if (!((dst | src | size) & 0x03))
	{
		// copy data aligned
		while (size)
		{
			tmp = readWord (src, 0);
			if (memoryError)
				bail (190823);

			writeWord (dst, tmp, 0);
			if (memoryError)
				bail (190825);

			dst = INT (dst + 4);
			src = INT (src + 4);
			size = INT (size - 4);
		}
	}
	else
	{
		// copy data unaligned
		while (size)
		{
			tmp = readByte (src, 0);
			if (memoryError)
				bail (190823);

			writeByte (dst, tmp, 0);
			if (memoryError)
				bail (190825);

			dst = INT (dst + 1);
			src = INT (src + 1);
			size = INT (size - 1);
		}
	}

	// return from function
	setRegister (REG_PC, getRegister (REG_LR));

	return BUILTIN_COMPLETED;
}

function _builtinRun (pc)
{
	PARAM_INT (pc);

#	define BUILTIN(func) if (S32 (pc) == S32 (builtinAddr_##func)) return INT (_builtinFunc_##func ());
#	define BUILTIN_TABLE
#	include "builtins.js"
#	undef BUILTIN_TABLE
#	undef BUILTIN

	return BUILTIN_IGNORED;
}

#endif
#endif
