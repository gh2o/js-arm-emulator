#include "instructions.inc"
#include "core.inc"

/****************************************
 * BRANCH INSTRUCTIONS                  *
 ****************************************/

function _inst_B (offset)
{
	PARAM_INT (offset);
	setPC (INT (getRegister (REG_PC) + offset));
	return STAT_OK;
}

function _inst_BL (offset)
{
	PARAM_INT (offset);
	setRegister (REG_LR, getPC ());
	setPC (INT (getRegister (REG_PC) + offset));
	return STAT_OK;
}

/****************************************
 * DATA PROCESSING INSTRUCTIONS         *
 ****************************************/

function _inst_DATA (opcode, Rd, Rn, immreg, shift_immreg, shift_type, S)
{
	PARAM_INT (opcode);
	PARAM_INT (Rd);
	PARAM_INT (Rn);
	PARAM_INT (immreg);
	PARAM_INT (shift_immreg);
	PARAM_INT (shift_type);
	PARAM_INT (S);

	var base = 0;
	var operand = 0;
	var shift_operand = 0;

	var cpsr = 0;
	var carry = 0;
	var result = 0;

	log (
		LOG_ID, 496802,
		LOG_HEX, INT (getPC () - 4),
		LOG_SIGNED, INT (opcode),
		LOG_SIGNED, INT (Rd),
		LOG_SIGNED, INT (Rn),
		LOG_HEX, INT (immreg),
		LOG_HEX, INT (shift_immreg),
		LOG_SIGNED, INT (shift_type),
		LOG_SIGNED, INT (S)
	);

	base = getRegister (Rn);
	operand = DECODE_IMMEDIATE_REGISTER (immreg);
	shift_operand = DECODE_IMMEDIATE_REGISTER (shift_immreg);

	cpsr = getCPSR ();
	carry = cpsr & PSR_C;

	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_LEFT:
			if (S32 (shift_operand) != 0)
				bail (625354);
			break;
		case SHIFT_TYPE_ROTATE_RIGHT:
			if (S32 (shift_operand) != 0)
				bail (625356);
			break;
		default:
			bail (7536244);
			break;
	}

	switch (S32 (opcode))
	{
		case 0:
		case 8:
			result = base & operand;
			break;
		case 2:
			result = INT (base - operand);
			break;
		case 4:
			result = INT (base + operand);
			break;
		case 9:
			result = base ^ operand;
			break;
		case 13:
			result = operand;
			break;
		default:
			bail (928343);
			break;
	}

	if ((S32 (opcode) < 8) | (S32 (opcode) >= 12))
		setRegister (Rd, result);

	if (S)
	{
		if (S32 (Rd) == REG_PC)
		{
			// TODO: potential security problem
			// set CPSR from SPSR and switch modes
			bail (3019203);
		}
		else
		{
			cpsr = getCPSR ();

			switch (S32 (opcode))
			{
				case 0:
				case 8:
				case 9:
				case 13:
					cpsr = 
						(cpsr & 0x1FFFFFFF) |
						(result & (1 << 31)) |
						((S32 (result) == 0) << 30) |
						(!!carry << 29);
					break;
				default:
					bail (212313);
					break;
			}

			setCPSR (cpsr);
		}
	}

	return STAT_OK;
}

/****************************************
 * STATUS REGISTER ACCESS INSTRUCTIONS  *
 ****************************************/

function _inst_MSR (immreg, R, field_mask)
{
	PARAM_INT (immreg);
	PARAM_INT (R);
	PARAM_INT (field_mask);

#define UnallocMask 0x0FFFFF20
#define UserMask    0xF0000000
#define PrivMask    0x0000000F
#define StateMask   0x0

	var operand = 0;
	var mask = 0;

	operand = DECODE_IMMEDIATE_REGISTER (immreg);

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
 * LOAD AND STORE INSTRUCTIONS          *
 ****************************************/

function _inst_LDR (Rd, Rn, offset_immreg,
	shift_type, shift_amount, P, U, W)
{
	PARAM_INT (Rd);
	PARAM_INT (Rn);
	PARAM_INT (offset_immreg);
	PARAM_INT (shift_type);
	PARAM_INT (shift_amount);
	PARAM_INT (P);
	PARAM_INT (U);
	PARAM_INT (W);

	var offset = 0;
	var address = 0;
	var value = 0;

	offset = DECODE_IMMEDIATE_REGISTER (offset_immreg);
	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_LEFT:
			offset = offset << shift_amount;
			break;
		default:
			bail (2851087);
			break;
	}

	// calculate address
	address = getRegister (Rn);
	if ((P | W) == 0) // don't add offset if post-indexed
	{
		if (U)
			address = INT (address + offset);
		else
			address = INT (address - offset);
	}

	// TODO: unaligned access
	if (address & 3)
		bail (9028649);

	// do the access
	value = readWord (address);
	if (memoryError)
		bail (12984); // data abort
	
	// write back, mask if PC
	setRegister (Rd, S32 (Rd) == REG_PC ? value & ~3 : value);

	// update base register
	if (S32 (!!P) == S32 (!!W))
		bail (7824690);

	return STAT_OK;
}

/****************************************
 * LOAD AND STORE MULTIPLE INSTRUCTIONS *
 ****************************************/

function _inst_LDM (Rn, register_list, addressing_mode, W)
{
	PARAM_INT (Rn);
	PARAM_INT (register_list);
	PARAM_INT (addressing_mode);
	PARAM_INT (W);

	var i = 0;
	var ptr = 0;
	var count = 0;

	ptr = getRegister (Rn);
	if (ptr & 0x03)
		bail (13451701); // unaligned access

	switch (S32 (addressing_mode))
	{
		case ADDRESSING_MODE_INCREMENT_BEFORE:
			ptr = INT (ptr + 4);
		case ADDRESSING_MODE_INCREMENT_AFTER:
			for (i = 0; S32 (i) < 16; i = INT (i + 1))
			{
				if (register_list & (1 << i))
				{
					setRegister (i, readWord (ptr));
					if (memoryError)
						bail (12982); // data abort
					ptr = INT (ptr + 4);
					count = INT (count + 1);
				}
			}
			break;

		default:
			bail (3258718);
			break;
	}

	if (W)
		bail (31237612);

	if (register_list & (1 << REG_PC))
		setPC (getPC () & ~3);

	return STAT_OK;
}

/****************************************
 * COPROCESSOR INSTRUCTIONS             *
 ****************************************/

function _inst_MRC (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
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
