// vim: ft=c
#pragma once

#define MMU_TRANSLATE_READ    (1 << 0)
#define MMU_TRANSLATE_WRITE   (1 << 1)
#define MMU_TRANSLATE_EXECUTE (1 << 2)
#define MMU_TRANSLATE_USER    (1 << 3)

#define readWordPhysical(a) FUNC_INT(readWordPhysical,a)
#define writeWordPhysical(a,b) FUNC_VOID(writeWordPhysical,a,b)
#define readBytePhysical(a) FUNC_INT(readBytePhysical,a)
#define writeBytePhysical(a,b) FUNC_VOID(writeBytePhysical,a,b)

#define readWord(a) FUNC_INT(readWord,a)
#define writeWord(a,b) FUNC_VOID(writeWord,a,b)
#define readByte(a) FUNC_INT(readByte,a)
#define writeByte(a,b) FUNC_VOID(writeByte,a,b)

#define translateAddress(a,t) FUNC_INT(translateAddress,a,t)
