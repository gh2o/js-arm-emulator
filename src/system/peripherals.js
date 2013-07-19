#include "peripherals.inc"

/************************************************************
 User peripherals   : 1111 1111 1111 1xxx xx00 0000 0000 0000
 System peripherals : 1111 1111 1111 1111 1111 xxxx 0000 0000
 ************************************************************/

#ifdef PERIPHERALS_INCLUDE_VARIABLES
var pAIC_SPU = 0;
var pAIC_IMR = 0;
var pAIC_IPR = 0;
var pAIC_stacksize = 0;
var pAIC_priomask = 0;

var pST_IMR = 0;
var pST_PIMR = 0;
var pST_PIMR_period = 2000.0; // 65536 / 32.768
var pST_PIMR_timestamp = 0.0
var pST_RTMR = 0;
var pST_RTMR_ticktime = 0.0;
var pST_CRTR = 0;
var pST_CRTR_timestamp = 0.0;
var pST_RTAR = 0;
var pST_SR_PITS_expiration = 0.0;
var pST_SR_RTTINC_expiration = 0.0;
var pST_SR_ALMS_expiration = 0.0;
#endif

#ifdef PERIPHERALS_INCLUDE_FUNCTIONS
function _readWordPeripheral (addr)
{
	PARAM_INT (addr);

	if ((addr >> 12) == ~0) // system peripherals
		return INT (systemPeripheralRead[addr >> 8 & 0x0F](addr & 0x1FF));
	else if (addr >> 19 == ~0) // user peripherals
		return INT (userPeripheralRead[addr >> 14 & 0x1F](addr & 0x3FFF));

	bail (1280799);
	return 0;
}

function _writeWordPeripheral (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	if ((addr >> 12) == ~0) // system peripherals
	{
		systemPeripheralWrite[addr >> 8 & 0x0F](addr & 0x1FF, value);
		return;
	}
	else if (addr >> 19 == ~0) // user peripherals
	{
		userPeripheralWrite[addr >> 14 & 0x1F](addr & 0x3FFF, value);
		return;
	}

	bail (1893192);
}

function _undefinedPeripheralRead (offset)
{
	PARAM_INT (offset);

	log (LOG_ID, 2130657, LOG_HEX, S32 (offset));
	bail (2130657);

	return 0;
}

function _undefinedPeripheralWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);

	log (LOG_ID, 2130668, LOG_HEX, S32 (offset));
	bail (2130668);
}

function _pAICStackPush (irq, prio)
{
	PARAM_INT (irq);
	PARAM_INT (prio);

	wordView[(ADDR_AIC_IRQ_STACK + (pAIC_stacksize << 2)) >> 2] = irq;
	wordView[(ADDR_AIC_PRIO_STACK + (pAIC_stacksize << 2)) >> 2] = prio;
	pAIC_stacksize = INT (pAIC_stacksize + 1);
}

function _pAICStackPop ()
{
	pAIC_stacksize = INT (pAIC_stacksize - 1);
}

function _pAICStackGetIRQ ()
{
	var index = 0;
	index = INT (pAIC_stacksize - 1);
	return INT (wordView[(ADDR_AIC_IRQ_STACK + (index << 2)) >> 2]);
}

function _pAICStackGetPriority ()
{
	var index = 0;
	index = INT (pAIC_stacksize - 1);
	return INT (wordView[(ADDR_AIC_PRIO_STACK + (index << 2)) >> 2]);
}

function _pAICGetPriority (n)
{
	PARAM_INT (n);
	return INT (wordView[(ADDR_AIC_SMR_ARRAY + (n << 2)) >> 2] & 0x07);
}

function _pAICGetType (n)
{
	PARAM_INT (n);
	return INT (wordView[(ADDR_AIC_SMR_ARRAY + (n << 2)) >> 2] >> 5 & 0x03);
}

function _pAICBegin ()
{
	var i = 0;

	var prio = -1;
	var irq = -1;

	var tprio = 0;
	for (i = 0; S32 (i) < 32; i = INT (i + 1))
	{
		if (pAIC_IPR & pAIC_IMR & (1 << i))
		{
			tprio = INT (_pAICGetPriority (i));
			if (S32 (tprio) > S32 (prio))
			{
				irq = i;
				prio = tprio;
			}
		}
	}

	if (S32 (irq) == -1)
		return INT (pAIC_SPU); // nothing has hapened...

	if ((1 << irq) <= S32 (pAIC_priomask))
		bail (5902831); // still servicing equal or higher

	// clear interrupt and add to stack and set mask
	pAIC_IPR = pAIC_IPR & ~(1 << irq);
	_pAICStackPush (irq, prio);
	pAIC_priomask = pAIC_priomask | (1 << prio);

	return INT (wordView[(ADDR_AIC_SVR_ARRAY + (irq << 2)) >> 2]);
}

function _pAICEnd ()
{
	var prio = 0;

	if (!pAIC_priomask) // no current interrupt
		return;

	// pop stack and unset mask
	prio = INT (_pAICStackGetPriority ());
	pAIC_priomask = pAIC_priomask & ~(1 << prio);
	_pAICStackPop ();
}

function _pAICRead (offset)
{
	PARAM_INT (offset);

	if ((offset & 0xFFFFFF83) == 0x00)
	{
		// AIC_SMRn registers
		memoryError = STAT_OK;
		return INT (wordView[(ADDR_AIC_SMR_ARRAY + (offset & 0x7F)) >> 2]);
	}

	if ((offset & 0xFFFFFF83) == 0x80)
	{
		// AIC_SVRn registers
		memoryError = STAT_OK;
		return INT (wordView[(ADDR_AIC_SVR_ARRAY + (offset & 0x7F)) >> 2]);
	}

	switch (S32 (offset))
	{
		case 0x100: // AIC_IVR
			memoryError = STAT_OK;
			return INT (_pAICBegin ());
		case 0x108: // AIC_ISR
			memoryError = STAT_OK;
			if (pAIC_priomask)
				return INT (_pAICStackGetIRQ ());
			else
				return 0;
	}

	log (LOG_ID, 3451124, LOG_HEX, S32 (offset));
	bail (3451124);

	return 0;
}

function _pAICWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);

	if ((offset & 0xFFFFFF83) == 0x00)
	{
		// AIC_SMRn registers
		wordView[(ADDR_AIC_SMR_ARRAY + (offset & 0x7F)) >> 2] = value & 0x67;
		memoryError = STAT_OK;
		return;
	}

	if ((offset & 0xFFFFFF83) == 0x80)
	{
		// AIC_SVRn registers
		wordView[(ADDR_AIC_SVR_ARRAY + (offset & 0x7F)) >> 2] = value;
		memoryError = STAT_OK;
		return;
	}

	switch (S32 (offset))
	{
		case 0x120: // AIC_IECR
			pAIC_IMR = pAIC_IMR | value;
			memoryError = STAT_OK;
			return;
		case 0x124: // AIC_IDCR;
			pAIC_IMR = pAIC_IMR & ~value;
			memoryError = STAT_OK;
			return;
		case 0x128: // AIC_ICCR
			pAIC_IPR = pAIC_IPR & ~value;
			memoryError = STAT_OK;
			return;
		case 0x130: // AIC_EOICR
			_pAICEnd ();
			memoryError = STAT_OK;
			return;
		case 0x134: // AIC_SPU
			pAIC_SPU = value;
			memoryError = STAT_OK;
			return;
		case 0x138: // AIC_DCR
			if (value)
				bail (154481);
			memoryError = STAT_OK;
			return;
	}

	log (LOG_ID, 3451122, LOG_HEX, S32 (offset));
	bail (3451122);
}

function _pDBGURead (offset)
{
	PARAM_INT (offset);

	switch (S32 (offset))
	{
		case 0x40:
			memoryError = STAT_OK;
			return 0x09290781;
		case 0x44:
			memoryError = STAT_OK;
			return 0;
	}

	bail (19083921);
	return 0;
}

function _pPMCRead (offset)
{
	PARAM_INT (offset);

	offset = offset & 0xFF;

	switch (S32 (offset))
	{
		case 0x24: // CKGR_MCFR
			memoryError = STAT_OK;
			return (1 << 16) | 512;
		case 0x28: // CKGR_PLLAR
		case 0x2C: // CKGR_PLLBR
			memoryError = STAT_OK;
			return 0x3F00;
		case 0x30: // CKGR_MCKR
			memoryError = STAT_OK;
			return 0x01; // main clock, no prescaler, no division
	}

	bail (19083932);
	return 0;
}

function _pPMCWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);

	offset = offset & 0xFF;

	switch (S32 (offset))
	{
		case 0x00: // PMC_SCER
		case 0x04: // PMC_SCDR
		case 0x10: // PMC_PCER
		case 0x14: // PMC_PCDR
			memoryError = STAT_OK;
			return;
		case 0x28: // CKGR_PLLAR
		case 0x2C: // CKGR_PLLBR
			memoryError = STAT_OK;
			return;
	}

	log (LOG_ID, 9823127, LOG_HEX, offset);
	bail (9823127);
}

function _pSTUpdateCRTR ()
{
	var elapsedTicks = 0;
	elapsedTicks = ~~((getMilliseconds () - pST_CRTR_timestamp) / pST_RTMR_ticktime);

	// add back if tick elapsed
	if (S32 (elapsedTicks) > 0)
	{
		pST_CRTR = (pST_CRTR + elapsedTicks) & 0x0FFFFF;
		pST_CRTR_timestamp = pST_CRTR_timestamp + DBL (S32 (elapsedTicks)) * pST_RTMR_ticktime;
	}
}

function _pSTUpdateALMS (force)
{
	PARAM_INT (force);

	var remainingTicks = 0;
	var newExpiration = 0.0;

	remainingTicks = (pST_RTAR - pST_CRTR) & 0x0FFFFF;
	if (S32 (remainingTicks) == 0)
		remainingTicks = 0x100000;

	newExpiration = pST_CRTR_timestamp + DBL (S32 (remainingTicks)) * pST_RTMR_ticktime;
	if (force | (newExpiration < pST_SR_ALMS_expiration))
		pST_SR_ALMS_expiration = newExpiration;
}

function _pSTRead (offset)
{
	PARAM_INT (offset);

	var ret = 0;
	var now = 0.0;
	var elapsed = 0.0;

	offset = offset & 0xFF;

	switch (S32 (offset))
	{
		case 0x10: // ST_SR

			now = getMilliseconds ();

			if (now >= pST_SR_PITS_expiration)
			{
				ret = ret | (1 << 0);
				elapsed = now - pST_PIMR_timestamp;
				pST_SR_PITS_expiration = pST_PIMR_timestamp + (ceil (elapsed / pST_PIMR_period) * pST_PIMR_period);
			}

			if (now >= pST_SR_RTTINC_expiration)
			{
				ret = ret | (1 << 2);
				_pSTUpdateCRTR ();
				pST_SR_RTTINC_expiration = pST_CRTR_timestamp + pST_RTMR_ticktime;
			}

			if (now >= pST_SR_ALMS_expiration)
			{
				ret = ret | (1 << 3);
				_pSTUpdateALMS (1);
			}

			memoryError = STAT_OK;
			return INT (ret);

		case 0x24: // ST_CRTR

			_pSTUpdateCRTR ();
			memoryError = STAT_OK;
			return INT (pST_CRTR);
	}

	bail (390841);
	return 0;
}

function _pSTWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);

	offset = offset & 0xFF;

	switch (S32 (offset))
	{
		case 0x04: // ST_PIMR
			pST_PIMR = value & 0xFFFF;
			pST_PIMR_period = (pST_PIMR ? DBL (S32 (pST_PIMR)) : 65536.0) / 32.768;
			pST_PIMR_timestamp = getMilliseconds ();
			memoryError = STAT_OK;
			return;
		case 0x0C: // ST_RTMR
			_pSTUpdateCRTR (); // lock in old divider first
			pST_RTMR = value & 0xFFFF;
			pST_RTMR_ticktime = (pST_RTMR ? DBL (S32 (pST_RTMR)) : 65536.0) / 32.768;
			_pSTUpdateALMS (0); // ALMS depends on this value
			memoryError = STAT_OK;
			return;
		case 0x14: // ST_IER
			pST_IMR = pST_IMR | value;
			memoryError = STAT_OK;
			return;
		case 0x18: // ST_IDR
			pST_IMR = pST_IMR & ~value;
			memoryError = STAT_OK;
			return;
		case 0x20: // ST_RTAR
			pST_RTAR = value & 0x0FFFFF;
			_pSTUpdateALMS (0);
			memoryError = STAT_OK;
			return;
	}

	bail (8823126);
}
#endif

#ifdef PERIPHERALS_INCLUDE_TABLES

#define und _undefinedPeripheralRead
var systemPeripheralRead = [
	/*  0 */ _pAICRead,
	/*  1 */ _pAICRead,
	/*  2 */ _pDBGURead,
	/*  3 */ _pDBGURead,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ _pPMCRead,
	/* 13 */ _pSTRead,
	/* 14 */ und,
	/* 15 */ und
];
var userPeripheralRead = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und,
	/* 16 */ und,
	/* 17 */ und,
	/* 18 */ und,
	/* 19 */ und,
	/* 20 */ und,
	/* 21 */ und,
	/* 22 */ und,
	/* 23 */ und,
	/* 24 */ und,
	/* 25 */ und,
	/* 26 */ und,
	/* 27 */ und,
	/* 28 */ und,
	/* 29 */ und,
	/* 30 */ und,
	/* 31 */ und
];
#undef und

#define und _undefinedPeripheralWrite
var systemPeripheralWrite = [
	/*  0 */ _pAICWrite,
	/*  1 */ _pAICWrite,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ _pPMCWrite,
	/* 13 */ _pSTWrite,
	/* 14 */ und,
	/* 15 */ und
];
var userPeripheralWrite = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und,
	/* 16 */ und,
	/* 17 */ und,
	/* 18 */ und,
	/* 19 */ und,
	/* 20 */ und,
	/* 21 */ und,
	/* 22 */ und,
	/* 23 */ und,
	/* 24 */ und,
	/* 25 */ und,
	/* 26 */ und,
	/* 27 */ und,
	/* 28 */ und,
	/* 29 */ und,
	/* 30 */ und,
	/* 31 */ und
];
#undef und

#endif
