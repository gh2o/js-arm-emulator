// vim: ft=c
#pragma once

#define SHIFT_TYPE_LOGICAL_LEFT       (0)
#define SHIFT_TYPE_LOGICAL_RIGHT      (1)
#define SHIFT_TYPE_ARITHMETIC_RIGHT   (2)
#define SHIFT_TYPE_ROTATE_RIGHT       (3)
#define SHIFT_TYPE_ROTATE_WITH_EXTEND (4)

#define ADDRESSING_MODE_DECREMENT_AFTER  (0)
#define ADDRESSING_MODE_INCREMENT_AFTER  (1)
#define ADDRESSING_MODE_DECREMENT_BEFORE (2)
#define ADDRESSING_MODE_INCREMENT_BEFORE (3)

#define PACK_IMMEDIATE_REGISTER(c,i,r) \
	((c) ? -1 << 24 | (i) : (r) << 24)
#define PACK_IMMEDIATE(i) ((-1 << 24) | (i))
#define PACK_REGISTER(r) ((r) << 24)

#define DECODE_IMMEDIATE_REGISTER(x) \
	(S32 (x) < 0 ? (x) & 0xFFFFFF : getRegister (x >> 24))

