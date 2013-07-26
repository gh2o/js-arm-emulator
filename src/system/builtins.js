#include "builtins.inc"

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
	bail (90819203);
	return BUILTIN_IGNORED;
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
