// vim: ft=c
#pragma once

#define readWordPhysical(a) FUNC_INT(readWordPhysical,a)
#define writeWordPhysical(a,b) FUNC_VOID(writeWordPhysical,a,b)
#define readBytePhysical(a) FUNC_INT(readBytePhysical,a)
#define writeBytePhysical(a,b) FUNC_VOID(writeBytePhysical,a,b)

#define readWord(a) FUNC_INT(readWord,a)
#define writeWord(a,b) FUNC_VOID(writeWord,a,b)
#define readByte(a) FUNC_INT(readByte,a)
#define writeByte(a,b) FUNC_VOID(writeByte,a,b)

#define translateAddress(a,t) FUNC_INT(translateAddress,a,t)
