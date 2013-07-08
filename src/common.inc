// vim:ft=c
#pragma once

#define DEFAULT_OPTION(x,y) ((x === undefined) && (x = (y)))

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

#define CONCAT_TOKENS_(x,y) x##y
#define CONCAT_TOKENS(x,y) CONCAT_TOKENS_(x,y)
