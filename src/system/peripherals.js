#include "peripherals.inc"
#include "core.inc"

/************************************************************
 User peripherals   : 1111 1111 1111 1xxx xx00 0000 0000 0000
 System peripherals : 1111 1111 1111 1111 1111 xxxx 0000 0000
 ************************************************************/

#define MCI_MR_BLKLEN(x) ((x) >> 16 & 0x3FFC)

#define MCI_CMDR_TRTYP(x) ((x) >> 19 & 0x03)
#define MCI_CMDR_TRTYP_SINGLE_BLOCK   (0x00)
#define MCI_CMDR_TRTYP_MULTIPLE_BLOCK (0x01)

#define MCI_CMDR_TRCMD(x) ((x) >> 16 & 0x03)
#define MCI_CMDR_TRCMD_NONE  (0x00)
#define MCI_CMDR_TRCMD_START (0x01)
#define MCI_CMDR_TRCMD_STOP  (0x02)

#define MCI_CMDR_TRDIR_READ(x) ((x) & (1 << 18))

#define MCI_CMDR_SPCMD(x) ((x) >> 8 & 0x07)

#ifdef INCLUDE_VARIABLES
var pAIC_SPU = 0;
var pAIC_IMR = 0;
var pAIC_IPR = 0;
var pAIC_stacksize = 0;
var pAIC_priomask = 0;

var pDBGU_MR = 0;
var pDBGU_IMR = 0;
var pDBGU_BRGR = 0;
var pDBGU_PTSR = 0;
var pDBGU_inputStart = 0;
var pDBGU_inputEnd = 0;

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

var pMCI_SR = 0x1;
var pMCI_MR = 0;
var pMCI_IMR = 0;
var pMCI_ARGR = 0;
var pMCI_CMDR_transfer = 0;
var pMCI_CMDR_pending = 0;
var pMCI_RSPR_offset = 0;
var pMCI_RPR = 0;
var pMCI_RNPR = 0;
var pMCI_RCR = 0;
var pMCI_RNCR = 0;
var pMCI_TPR = 0;
var pMCI_TNPR = 0;
var pMCI_TCR = 0;
var pMCI_TNCR = 0;
var pMCI_PTSR = 0;
#endif

#ifdef INCLUDE_FUNCTIONS
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

function _pDMRead (offset)
{
	PARAM_INT (offset);
	memoryError = STAT_OK;
	return 0;
}

function _pDMWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);
	memoryError = STAT_OK;
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

function _pDBGUGetSR (update)
{
	PARAM_INT (update);

	var ret = 0x0202; // TXRDY and TXEMPTY
	ret = ret | (S32 (pDBGU_inputStart) != S32 (pDBGU_inputEnd)); // RXRDY

	return INT (ret);
}

function _pDBGUInput (c)
{
	PARAM_INT (c);

	if (INT (pDBGU_inputEnd - pDBGU_inputStart + 1) < SIZE_DBGU_INPUT_BUFFER)
	{
		byteView[INT (ADDR_DBGU_INPUT_BUFFER + (pDBGU_inputEnd & MASK_DBGU_INPUT_BUFFER))] = c;
		pDBGU_inputEnd = INT (pDBGU_inputEnd + 1);
	}
	else
	{
		// overflow
		bail (18903590);
	}
}

function _pDBGURead (offset)
{
	PARAM_INT (offset);

	var tmp = 0;

	switch (S32 (offset))
	{
		case 0x04: // DBGU_MR
			memoryError = STAT_OK;
			return INT (pDBGU_MR);
		case 0x10: // DBGU_IMR
			memoryError = STAT_OK;
			return INT (pDBGU_IMR);
		case 0x14: // DBGU_SR
			memoryError = STAT_OK;
			return INT (_pDBGUGetSR (1));
		case 0x18: // DBGU_RHR
			memoryError = STAT_OK;
			if (S32 (pDBGU_inputEnd - pDBGU_inputStart) > 0)
			{
				tmp = INT (byteView[INT (ADDR_DBGU_INPUT_BUFFER + (pDBGU_inputStart & MASK_DBGU_INPUT_BUFFER))]);
				pDBGU_inputStart = INT (pDBGU_inputStart + 1);
				return INT (tmp);
			}
			else
			{
				// empty buffer
				return 0x0;
			}
		case 0x20: // DBGU_BRGR
			memoryError = STAT_OK;
			return INT (pDBGU_BRGR);
		case 0x40: // DBGU_CIDR
			memoryError = STAT_OK;
			return 0x09290781;
		case 0x44: // DBGU_EXID
			memoryError = STAT_OK;
			return 0;
		case 0x124: // DBGU_PTSR
			memoryError = STAT_OK;
			return INT (pDBGU_PTSR);
	}

	log (LOG_ID, 19083921, LOG_HEX, S32 (offset));
	bail (19083921);
	return 0;
}

function _pDBGUWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);
	
	switch (S32 (offset))
	{
		case 0x00: // DBGU_CR
			memoryError = STAT_OK;
			return;
		case 0x04: // DBGU_MR
			pDBGU_MR = value;
			memoryError = STAT_OK;
			return;
		case 0x08: // DBGU_IER
			pDBGU_IMR = pDBGU_IMR | value;
			memoryError = STAT_OK;
			return;
		case 0x0C: // DBGU_IDR
			pDBGU_IMR = pDBGU_IMR & ~value;
			memoryError = STAT_OK;
			return;
		case 0x1C: // DBGU_THR
			print (value & 0xFF);
			memoryError = STAT_OK;
			return;
		case 0x20: // DBGU_BRGR
			pDBGU_BRGR = value;
			memoryError = STAT_OK;
			return;
		case 0x120: // DBGU_PTCR
			pDBGU_PTSR = value & ~(value >> 1) & 0x0101;
			memoryError = STAT_OK;
			return;
	}


	log (LOG_ID, 39083927, LOG_HEX, S32 (offset), LOG_HEX, S32 (value));
	bail (39083927);

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

	log (LOG_ID, 9823127, LOG_HEX, S32 (offset));
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

function _pSTGetSR (update)
{
	PARAM_INT (update);

	var ret = 0;
	var now = 0.0;
	var elapsed = 0.0;

	now = getMilliseconds ();

	if (now >= pST_SR_PITS_expiration)
	{
		ret = ret | (1 << 0);
		elapsed = now - pST_PIMR_timestamp;
		if (update)
			pST_SR_PITS_expiration = pST_PIMR_timestamp + (ceil (elapsed / pST_PIMR_period) * pST_PIMR_period);
	}

	if (now >= pST_SR_RTTINC_expiration)
	{
		ret = ret | (1 << 2);
		_pSTUpdateCRTR ();
		if (update)
			pST_SR_RTTINC_expiration = pST_CRTR_timestamp + pST_RTMR_ticktime;
	}

	if (now >= pST_SR_ALMS_expiration)
	{
		ret = ret | (1 << 3);
		_pSTUpdateALMS (update);
	}

	return INT (ret);
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
			memoryError = STAT_OK;
			return INT (_pSTGetSR (1));

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

function _pMCICommandCallback (v0, v1, v2, v3)
{
	PARAM_INT (v0);
	PARAM_INT (v1);
	PARAM_INT (v2);
	PARAM_INT (v3);

	wordView[(ADDR_MCI_RESPONSE_ARRAY + 0) >> 2] = v0;
	wordView[(ADDR_MCI_RESPONSE_ARRAY + 4) >> 2] = v1;
	wordView[(ADDR_MCI_RESPONSE_ARRAY + 8) >> 2] = v2;
	wordView[(ADDR_MCI_RESPONSE_ARRAY + 12) >> 2] = v3;

	pMCI_RSPR_offset = 0;
	pMCI_SR = pMCI_SR | 0x01;
}

function _pMCIReadCallback (sz)
{
	PARAM_INT (sz);
	pMCI_RPR = INT (pMCI_RPR + sz);
	pMCI_RCR = INT (pMCI_RCR - (sz >> 2));

	pMCI_CMDR_pending = 0;
	pMCI_SR = pMCI_SR | 0x8;
	if (MCI_CMDR_TRTYP (pMCI_CMDR_transfer) == MCI_CMDR_TRTYP_SINGLE_BLOCK)
		pMCI_CMDR_transfer = 0;
}

function _pMCIWriteCallback (sz)
{
	PARAM_INT (sz);
	pMCI_TPR = INT (pMCI_TPR + sz);
	pMCI_TCR = INT (pMCI_TCR - (sz >> 2));

	pMCI_CMDR_pending = 0;
	pMCI_SR = pMCI_SR | 0x8;
	if (MCI_CMDR_TRTYP (pMCI_CMDR_transfer) == MCI_CMDR_TRTYP_SINGLE_BLOCK)
		pMCI_CMDR_transfer = 0;
}

function _pMCIRunCommand (cmdr)
{
	PARAM_INT (cmdr);

	if (MCI_CMDR_SPCMD (cmdr) & ~0x01) // unsupported SPCMD
		bail (614515);

	switch (MCI_CMDR_TRCMD (cmdr))
	{
		case MCI_CMDR_TRCMD_START:
			pMCI_CMDR_transfer = cmdr;
			break;
		case MCI_CMDR_TRCMD_STOP:
			pMCI_CMDR_transfer = 0;
			break;
		default:
			break;
	}

	sdCommand (cmdr & 0x3F, INT (pMCI_ARGR));
}

function _pMCIRunDMA ()
{
	var blocklength = 0;
	blocklength = MCI_MR_BLKLEN (pMCI_MR);

	if (!pMCI_CMDR_transfer)
		return;
	if (pMCI_CMDR_pending)
		return;
	if (!(pMCI_MR & 0x8000))
		return;

	if (MCI_CMDR_TRDIR_READ (pMCI_CMDR_transfer))
	{
		if (!(pMCI_PTSR & 0x0001))
			return;
		if (S32 (pMCI_RCR << 2) < S32 (blocklength))
			return;
		pMCI_CMDR_pending = 1;
		sdRead (memoryAddressToHeapOffset (pMCI_RPR), pMCI_RCR << 2);
	}
	else
	{
		if (!(pMCI_PTSR & 0x0100))
			return;
		if (S32 (pMCI_TCR << 2) < S32 (blocklength))
			return;
		pMCI_CMDR_pending = 1;
		sdWrite (memoryAddressToHeapOffset (pMCI_TPR), pMCI_TCR << 2);
	}
}

function _pMCIGetSR (update)
{
	PARAM_INT (update);

	var ret = 0;

	_pMCIRunDMA ();
	pMCI_SR = pMCI_SR | !pMCI_RCR << 6;
	pMCI_SR = pMCI_SR | !pMCI_TCR << 7;

	ret = INT (pMCI_SR);
	ret = ret | !(pMCI_RCR | pMCI_RNCR) << 14; // RXBUFF
	ret = ret | !(pMCI_TCR | pMCI_TNCR) << 15; // TXBUFE
	ret = ret | !pMCI_CMDR_pending << 5; // NOTBUSY
	pMCI_SR = pMCI_SR & ~0x8;

	return INT (ret);
}

function _pMCIRead (offset)
{
	PARAM_INT (offset);

	var ret = 0;

	switch (S32 (offset))
	{
		case 0x04: // MCI_MR
			memoryError = STAT_OK;
			return INT (pMCI_MR);
		case 0x20: // MCI_RSPR
		case 0x24:
		case 0x28:
		case 0x2C:
			memoryError = STAT_OK;
			ret = INT (wordView[(ADDR_MCI_RESPONSE_ARRAY + pMCI_RSPR_offset) >> 2]);
			pMCI_RSPR_offset = (pMCI_RSPR_offset + 4) & 0x0F;
			return INT (ret);
		case 0x40: // MCI_SR
			memoryError = STAT_OK;
			return INT (_pMCIGetSR (1));
		case 0x4C: // MCI_IMR
			memoryError = STAT_OK;
			return INT (pMCI_IMR);
		case 0xFC: // version???
			memoryError = STAT_OK;
			return 0x100;
	}

	log (LOG_ID, 4543944, LOG_HEX, S32 (offset));
	bail (4543944);
	return 0;
}

function _pMCIWrite (offset, value)
{
	PARAM_INT (offset);
	PARAM_INT (value);

	switch (S32 (offset))
	{
		case 0x00: // MCI_CR
			memoryError = STAT_OK;
			return;
		case 0x04: // MCI_MR
			pMCI_MR = value;
			memoryError = STAT_OK;
			return;
		case 0x08: // MCI_DTOR
			memoryError = STAT_OK;
			return;
		case 0x0C: // MCI_SDCR
			memoryError = STAT_OK;
			return;
		case 0x10: // MCI_ARGR
			pMCI_ARGR = value;
			memoryError = STAT_OK;
			return;
		case 0x14: // MCI_CMDR
			if (pMCI_SR & 0x01)
			{
				pMCI_SR = pMCI_SR & ~0x01;
				_pMCIRunCommand (value);
			}
			memoryError = STAT_OK;
			return;
		case 0x18: // ??
			memoryError = STAT_OK;
			return;
		case 0x44: // MCI_IER
			pMCI_IMR = pMCI_IMR | value;
			memoryError = STAT_OK;
			return;
		case 0x48: // MCI_IDR
			pMCI_IMR = pMCI_IMR & ~value;
			memoryError = STAT_OK;
			return;
		case 0x100: // MCI_RPR
			pMCI_RPR = value;
			memoryError = STAT_OK;
			return;
		case 0x104: // MCI_RCR
			pMCI_RCR = value;
			pMCI_SR = pMCI_SR & ~(1 << 6);
			memoryError = STAT_OK;
			return;
		case 0x108: // MCI_TPR
			pMCI_TPR = value;
			memoryError = STAT_OK;
			return;
		case 0x10C: // MCI_TCR
			pMCI_TCR = value;
			pMCI_SR = pMCI_SR & ~(1 << 7);
			memoryError = STAT_OK;
			return;
		case 0x120: // MCI_PTCR
			pMCI_PTSR = pMCI_PTSR & ~(value >> 1) | value;
			pMCI_PTSR = pMCI_PTSR & 0x0101;
			memoryError = STAT_OK;
			return;
	}

	log (LOG_ID, 4543941, LOG_HEX, S32 (offset), LOG_HEX, S32 (value));
	bail (4543941);
}
#endif

#ifdef INCLUDE_TABLES

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
	/*  0 */ _pDMRead,
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
	/* 13 */ _pMCIRead,
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
	/*  2 */ _pDBGUWrite,
	/*  3 */ _pDBGUWrite,
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
	/*  0 */ _pDMWrite,
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
	/* 13 */ _pMCIWrite,
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
