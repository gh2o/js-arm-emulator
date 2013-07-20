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
	var now = 0.0;

	if (getCPSR () & PSR_I) // IRQs masked, FIQs not supported
		return;

	// ST interrupts
	now = getMilliseconds ();
	IRQ (1, pST_IMR & (1 << 0), now >= pST_SR_PITS_expiration);
	IRQ (1, pST_IMR & (1 << 3), now >= pST_SR_ALMS_expiration);
	//IRQ (10, ...);

	// bail on unsupported interrupts
	if (pAIC_IMR & ~0x00000402)
		bail (1074011);
	if (pST_IMR  & ~0x00000009)
		bail (5312453);
}
