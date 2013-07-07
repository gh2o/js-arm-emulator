/****************************************
 * BRANCH INSTRUCTIONS                  *
 ****************************************/

function inst_BL (offset)
{
	PARAM_INT (offset);
	setRegister (REG_LR, getPC ());
	setPC (getRegister (REG_PC) + offset);
	return STAT_OK;
}

/****************************************
 * STATUS REGISTER ACCESS INSTRUCTIONS  *
 ****************************************/

function inst_MSR (register, operand, R, field_mask)
{
	PARAM_INT (register);
	PARAM_INT (operand);
	PARAM_INT (R);
	PARAM_INT (field_mask);

#define UnallocMask 0x0FFFFF20
#define UserMask    0xF0000000
#define PrivMask    0x0000000F
#define StateMask   0x0

	var mask = 0;

	if (S32 (register) >= 0)
		operand = getRegister (register);

	mask =
		((field_mask & 1) ? 0x000000FF : 0) |
		((field_mask & 2) ? 0x0000FF00 : 0) |
		((field_mask & 4) ? 0x00FF0000 : 0) |
		((field_mask & 8) ? 0xFF000000 : 0);

	if (R)
	{
		// UNPREDICTABLE if no SPSR in current mode
		mask = mask & (UserMask | PrivMask | StateMask);
		bail (1356315);
	}
	else
	{
		if (isPrivileged ())
			mask = mask & (UserMask | PrivMask);
		else
			mask = mask & UserMask;
		setCPSR ((getCPSR () & ~mask) | (operand & mask));
	}

#undef UnallocMask
#undef UserMask
#undef PrivMask
#undef StateMask

	return STAT_OK;
}

/****************************************
 * COPROCESSOR INSTRUCTIONS             *
 ****************************************/

function inst_MRC (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
{
	PARAM_INT (Rd);
	PARAM_INT (cp_num);
	PARAM_INT (CRn);
	PARAM_INT (opcode_1);
	PARAM_INT (CRm);
	PARAM_INT (opcode_2);

	// only CP15 supported
	if (S32 (cp_num) != 15)
		return STAT_UND;

	switch (S32 (CRn))
	{
		case 0:
			if ((opcode_1 | CRm) == 0)
			{
				switch (S32 (opcode_2))
				{
					case 0: // Main ID Register (MIDR)
						setRegister (Rd, 0x41129201);
						return STAT_OK;
				}
			}
			break;
	}

	log (
		LOG_ID, 131,
		LOG_SIGNED, INT (cp_num),
		LOG_SIGNED, INT (opcode_1),
		LOG_SIGNED, INT (Rd),
		LOG_SIGNED, INT (CRn),
		LOG_SIGNED, INT (CRm),
		LOG_SIGNED, INT (opcode_2)
	);
	log (
		LOG_ID, 132,
		LOG_SIGNED, INT (Rd),
		LOG_SIGNED, INT (cp_num),
		LOG_SIGNED, INT (CRm),
		LOG_SIGNED, INT (opcode_1),
		LOG_SIGNED, INT (CRn),
		LOG_SIGNED, INT (opcode_2)
	);

	// for annotation, and if nothing satisfies
	bail (86414);
	return STAT_UND;
}
