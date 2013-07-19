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

#define readWord(a,f) FUNC_INT(readWord,a,f)
#define writeWord(a,b,f) FUNC_VOID(writeWord,a,b,f)
#define readByte(a,f) FUNC_INT(readByte,a,f)
#define writeByte(a,b,f) FUNC_VOID(writeByte,a,b,f)

#define translateAddress(a,t) FUNC_INT(translateAddress,a,t)
