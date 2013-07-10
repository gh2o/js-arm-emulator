// vim: ft=c
#pragma once

#define reset() FUNC_VOID(reset)
#define getPC() FUNC_INT(getPC)
#define setPC(v) FUNC_VOID(setPC,v)
#define getRegister(r) FUNC_INT(getRegister,r)
#define setRegister(r,v) FUNC_VOID(setRegister,r,v)
#define getCPSR() FUNC_INT(getCPSR)
#define setCPSR(v) FUNC_VOID(setCPSR,v)
#define isPrivileged() FUNC_INT(isPrivileged)
#define memoryAddressToHeapOffset(a) FUNC_INT(memoryAddressToHeapOffset,a)
#define readWord(a) FUNC_INT(readWord,a)
#define writeWord(a,v) FUNC_VOID(writeWord,a,b)
#define tick(n) FUNC_VOID(tick,n)
#define execute(i) FUNC_INT(execute,i)
#define subexecute(i) FUNC_INT(subexecute,i)
