#include "irq.inc"

#define IRQ(n,precond,cond) do { \
	if (pAIC_IMR & (1 << n)) \
		if (precond) \
			if (INT (_irqTest (n, cond))) \
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
	if (S32 (_pAICGetPriority (n)) <= S32 (pAIC_priomask))
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

	// PITS interrupt
	IRQ (1, pST_IMR & (1 << 0), DBL (getMilliseconds ()) >= pST_PIT_expiration);

	// bail on unsupported interrupts
	if (pAIC_IMR & ~0x00000002)
		bail (1074011);
	if (pST_IMR & ~0x00000001)
		bail (5312453);
}
