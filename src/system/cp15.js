#include "cp15.inc"

#define CP15_SCTLR_RESET       (0x00050072)
#define CP15_SCTLR_WRITABLE    (0x00002301)
#define CP15_SCTLR_UNSUPPORTED (0xFFE0C480)

#ifdef CP15_INCLUDE_VARIABLES
var cp15_SCTLR = 0;
var cp15_DACR = 0;
var cp15_TTBR0 = 0;
#endif

#ifdef CP15_INCLUDE_FUNCTIONS
function _cp15_reset ()
{
	cp15_SCTLR = CP15_SCTLR_RESET;
	cp15_DACR = 0;
	cp15_TTBR0 = 0;
}

function _cp15_read (CRn, opcode_1, CRm, opcode_2, Rd)
{
	PARAM_INT (CRn);
	PARAM_INT (opcode_1);
	PARAM_INT (CRm);
	PARAM_INT (opcode_2);
	PARAM_INT (Rd);

	switch (S32 (CRn))
	{
		case 0:
			if (S32 (opcode_1) == 0)
			{
				switch (CRm << 8 | opcode_2)
				{
					case 0x00: // Main ID Register (MIDR)
						setRegister (Rd, 0x41129201);
						return STAT_OK;
				}
			}
			break;
		case 1:
			if (S32 (opcode_1) == 0)
			{
				switch (CRm << 8 | opcode_2)
				{
					case 0x00:
						setRegister (Rd, cp15_SCTLR);
						return STAT_OK;
				}
			}
			break;
	}

	log (
		LOG_ID, 132,
		LOG_SIGNED, INT (CRn),
		LOG_SIGNED, INT (opcode_1),
		LOG_SIGNED, INT (CRm),
		LOG_SIGNED, INT (opcode_2)
	);

	bail (3384024);
	return STAT_UND;
}

function _cp15_write (CRn, opcode_1, CRm, opcode_2, Rd)
{
	PARAM_INT (CRn);
	PARAM_INT (opcode_1);
	PARAM_INT (CRm);
	PARAM_INT (opcode_2);
	PARAM_INT (Rd);

	var value = 0;
	value = getRegister (Rd);

	switch (S32 (CRn))
	{
		case 1:
			if (S32 (opcode_1) == 0)
			{
				if ((CRm | opcode_2) == 0)
				{
					if ((value & CP15_SCTLR_UNSUPPORTED) != (cp15_SCTLR & CP15_SCTLR_UNSUPPORTED))
						bail (12085902);
					cp15_SCTLR = (cp15_SCTLR & ~CP15_SCTLR_WRITABLE) |
						(value & CP15_SCTLR_WRITABLE);
					return STAT_OK;
				}
			}
			break;
		case 2:
			if (S32 (opcode_1) == 0)
			{
				if ((CRm | opcode_2) == 0)
				{
					cp15_TTBR0 = value;
					return STAT_OK;
				}
			}
			break;
		case 3:
			if (S32 (opcode_1) == 0)
			{
				if ((CRm | opcode_2) == 0)
				{
					cp15_DACR = value;
					return STAT_OK;
				}
			}
			break;
		case 7:
			if (S32 (opcode_1) == 0)
			{
				switch (CRm << 4 | opcode_2)
				{
					case 0x70:
						// UNIMPLEMENTED: invalidate all caches
						return STAT_OK;
					case 0xA4:
						// UNIMPLEMENTED: data synchronization barrier
						return STAT_OK;
				}
			}
			break;
		case 8:
			if (S32 (opcode_1) == 0)
			{
				switch (CRm << 4 | opcode_2)
				{
					case 0x70:
						// UNIMPLEMENTED: invalidate all TLBs
						return STAT_OK;
				}
			}
			break;
	}

	log (
		LOG_ID, 134,
		LOG_SIGNED, INT (CRn),
		LOG_SIGNED, INT (opcode_1),
		LOG_SIGNED, INT (CRm),
		LOG_SIGNED, INT (opcode_2)
	);

	bail (2384023);
	return STAT_UND;
}
#endif
