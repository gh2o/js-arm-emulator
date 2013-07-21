#include "irq.inc"

#define IRQ(n,mask,stat) do { \
	if (pAIC_IMR & (1 << n)) \
		if (INT (_irqTest (n, (mask) & (stat)))) \
			return; \
} while (0)

function _irqTest (n, cond)
{
	PARAM_INT (n);
	PARAM_INT (cond);

	// check condition (might need something else for level-triggered)
	if (!cond)
		return 0;

	// only high level interrupts supported
	if (S32 (_pAICGetType (n)) != 2)
		bail (9055893);

	// check priority
	if (1 << INT (_pAICGetPriority (n)) <= S32 (pAIC_priomask))
		return 0;

	// let's go
	pAIC_IPR = pAIC_IPR | (1 << n);
	triggerException (MODE_irq);
	return 1;
}

function _irqPoll ()
{
	if (getCPSR () & PSR_I) // IRQs masked, FIQs not supported
		return;

	// ST interrupts
	IRQ (1, pST_IMR, INT (_pSTGetSR (0)));
	
	// MCI interrupts
	IRQ (10, pMCI_IMR, INT (_pMCIGetSR (0)));

	// bail on unsupported interrupts
	if (pAIC_IMR & ~0x00000402)
		bail (1074011);
	if (pST_IMR  & ~0x00000009)
		bail (5312453);
	if (pMCI_IMR & ~0xc0604041)
		bail (5343251);
}
