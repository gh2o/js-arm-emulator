// vim: ft=c
#pragma once

#define inst_B(...) FUNC_INT(inst_B,__VA_ARGS__)
#define inst_BL(...) FUNC_INT(inst_BL,__VA_ARGS__)
#define inst_BX(...) FUNC_INT(inst_BX,__VA_ARGS__)
#define inst_DATA(...) FUNC_INT(inst_DATA,__VA_ARGS__)
#define inst_MUL_MLA(...) FUNC_INT(inst_MUL_MLA,__VA_ARGS__)
#define inst_UMULL_UMLAL(...) FUNC_INT(inst_UMULL_UMLAL,__VA_ARGS__)
#define inst_MRS(...) FUNC_INT(inst_MRS,__VA_ARGS__)
#define inst_MSR(...) FUNC_INT(inst_MSR,__VA_ARGS__)
#define inst_LDR_STR_LDRB_STRB(...) FUNC_INT(inst_LDR_STR_LDRB_STRB,__VA_ARGS__)
#define inst_LDR_STR_misc(...) FUNC_INT(inst_LDR_STR_misc,__VA_ARGS__)
#define inst_LDM_STM(...) FUNC_INT(inst_LDM_STM,__VA_ARGS__)
#define inst_SVC(...) FUNC_INT(inst_SVC,__VA_ARGS__)
#define inst_MCR(...) FUNC_INT(inst_MCR,__VA_ARGS__)
#define inst_MRC(...) FUNC_INT(inst_MRC,__VA_ARGS__)
