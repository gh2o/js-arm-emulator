// vim:ft=c
#pragma once

#define ROTATE_RIGHT(x,y) ( ((x)>>>(y)) | ((x)<<(32-(y))) )
#define EXTRACT_NIBBLE(x,off) ((x) >> (off) & 0x0F)

#define CORE_MEMORY 4096
#define MEMORY_START CORE_MEMORY

#define LOG_ID (0)
#define LOG_HEX (1)
#define LOG_SIGNED (2)
#define LOG_UNSIGNED (3)

#define PSR_N (1 << 31)
#define PSR_Z (1 << 30)
#define PSR_C (1 << 29)
#define PSR_V (1 << 28)
#define PSR_I (1 << 7)
#define PSR_F (1 << 6)
#define PSR_T (1 << 5)
#define PSR_M (0x1F)

#define REG_R0 (0)
#define REG_R1 (1)
#define REG_R2 (2)
#define REG_R3 (3)
#define REG_R4 (4)
#define REG_R5 (5)
#define REG_R6 (6)
#define REG_R7 (7)
#define REG_R8 (8)
#define REG_R9 (9)
#define REG_R10 (10)
#define REG_R11 (11)
#define REG_R12 (12)
#define REG_R13 (13)
#define REG_R14 (14)
#define REG_R15 (15)

#define REG_SP REG_R13
#define REG_LR REG_R14
#define REG_PC REG_R15

#define MODE_usr (0x10)
#define MODE_fiq (0x11)
#define MODE_irq (0x12)
#define MODE_svc (0x13)
#define MODE_abt (0x17)
#define MODE_und (0x1b)
#define MODE_sys (0x1f)
