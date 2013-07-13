// vim: ft=c
#pragma once

#define inst_B(...) FUNC_INT(inst_B,__VA_ARGS__)
#define inst_BL(...) FUNC_INT(inst_BL,__VA_ARGS__)
#define inst_DATA(...) FUNC_INT(inst_DATA,__VA_ARGS__)
#define inst_MSR(...) FUNC_INT(inst_MSR,__VA_ARGS__)
#define inst_LDR_STR(...) FUNC_INT(inst_LDR_STR,__VA_ARGS__)
#define inst_LDM(...) FUNC_INT(inst_LDM,__VA_ARGS__)
#define inst_MCR(...) FUNC_INT(inst_MCR,__VA_ARGS__)
#define inst_MRC(...) FUNC_INT(inst_MRC,__VA_ARGS__)
