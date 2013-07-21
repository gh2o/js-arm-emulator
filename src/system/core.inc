// vim: ft=c
#pragma once

/* imported functions */
#define floor(x) FUNC_DBL(floor,x)
#define ceil(x) FUNC_DBL(ceil,x)
#define imul(x,y) FUNC_INT(imul,x,y)
#define getMilliseconds() FUNC_DBL(getMilliseconds)

/* SD functions */
#define sdCommand(...) FUNC_VOID(sdCommand,__VA_ARGS__)
#define sdRead(...) FUNC_VOID(sdRead,__VA_ARGS__)
#define sdWrite(...) FUNC_VOID(sdWrite,__VA_ARGS__)

/* defined functions */
#define reset() FUNC_VOID(reset)
#define getPC() FUNC_INT(getPC)
#define setPC(v) FUNC_VOID(setPC,v)
#define getRegister(r) FUNC_INT(getRegister,r)
#define setRegister(r,v) FUNC_VOID(setRegister,r,v)
#define getCPSR() FUNC_INT(getCPSR)
#define setCPSR(v) FUNC_VOID(setCPSR,v)
#define getSPSR() FUNC_INT(getSPSR)
#define setSPSR(v) FUNC_VOID(setSPSR,v)
#define isPrivileged() FUNC_INT(isPrivileged)
#define memoryAddressToHeapOffset(a) FUNC_INT(memoryAddressToHeapOffset,a)
#define triggerException(m,t) FUNC_VOID(triggerException,m,t)
#define run(n) FUNC_VOID(run,n)
#define execute(i) FUNC_INT(execute,i)
#define subexecute(i) FUNC_INT(subexecute,i)

#define INT(x) ((x)|0)
#define S32(x) ((x)|0)
#define U32(x) ((x)>>>0)
#define DBL(x) (+(x))

#define PARAM_INT(x) x = x|0
#define PARAM_DBL(x) x = +x

#define STAT_OK (0)
#define STAT_ABT (1)
#define STAT_UND (2)
#define STAT_SWI (3)

/****************************************
 
 Core memory map:

   Working set registers:

     0x0000 - 0x0040 : R0-R15
	 0x0040          : CPSR
	 0x0044          : SPSR

   Inactive registers:

	 R13-R14,SPSR (group 1):
	   0x0050 - 0x005c : set 0 (usr, sys)
	   0x0060 - 0x006c : set 1 (svc)
	   0x0070 - 0x007c : set 2 (abt)
	   0x0080 - 0x008c : set 3 (und)
	   0x0090 - 0x009c : set 4 (irq)
	   0x00a0 - 0x00ac : set 5 (fiq)

     R8-R12 (group 2):
	   0x00b0 - 0x00c4 : set 0 (usr, sys, svc, abt, und, irq)
	   0x00d0 - 0x00e4 : set 1 (fiq)
   
   Peripherals:

     AIC: 0x0100 - 0x0240
     MCI: 0x0280 - 0x0290

 ****************************************/

#define ADDR_CPSR (0x0040)
#define ADDR_SPSR (0x0044)

#define ADDR_GROUP1 (0x0050)
#define ADDR_GROUP2 (0x00b0)
#define SSHIFT_GROUP1 (4)
#define SSHIFT_GROUP2 (5)
#define STRIDE_GROUP1 (1 << SSHIFT_GROUP1)
#define STRIDE_GROUP2 (1 << SSHIFT_GROUP2)

#define ADDR_AIC_SMR_ARRAY (0x0100)
#define ADDR_AIC_SVR_ARRAY (0x0180)
#define ADDR_AIC_IRQ_STACK (0x0200)
#define ADDR_AIC_PRIO_STACK (0x0220)

#define ADDR_MCI_RESPONSE_ARRAY (0x0280)
