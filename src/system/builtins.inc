// vim: ft=c
#pragma once

#define BUILTIN_IGNORED   (0x00)
#define BUILTIN_COMPLETED (0x01)

#define builtinRun(pc) FUNC_INT(builtinRun,pc)
