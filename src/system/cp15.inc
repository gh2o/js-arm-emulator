// vim: ft=c
#pragma once

#define CP15_SCTLR_M (1 << 0)
#define CP15_SCTLR_S (1 << 8)
#define CP15_SCTLR_R (1 << 9)
#define CP15_SCTLR_V (1 << 13)

#define cp15_reset() FUNC_VOID(cp15_reset)
#define cp15_read(...) FUNC_INT(cp15_read,__VA_ARGS__)
#define cp15_write(...) FUNC_INT(cp15_write,__VA_ARGS__)
