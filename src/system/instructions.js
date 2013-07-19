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

function _inst_BX (Rm)
{
	PARAM_INT (Rm);

	var target = 0;
	target = getRegister (Rm);
	if (target & 1)
		bail (2837103); // thumb not supported

	setPC (target & ~1);
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

	/*
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
	*/

	base = getRegister (Rn);
	operand = DECODE_IMMEDIATE_REGISTER (immreg);
	shift_operand = DECODE_IMMEDIATE_REGISTER (shift_immreg) & 0xFF;

	cpsr = getCPSR ();
	carry = cpsr & PSR_C;

	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_LEFT:
			if (S32 (shift_operand) != 0)
			{
				if (S32 (shift_operand) < 32)
				{
					operand = operand << (shift_operand - 1);
					carry = operand & (1 << 31);
					operand = operand << 1;
				}
				else if (S32 (shift_operand) == 32)
				{
					carry = operand & 1;
					operand = 0;
				}
				else
				{
					carry = 0;
					operand = 0;
				}
			}
			break;
		case SHIFT_TYPE_LOGICAL_RIGHT:
			if (S32 (shift_operand) != 0)
			{
				if (S32 (shift_operand) < 32)
				{
					operand = operand >>> (shift_operand - 1);
					carry = operand & 1;
					operand = operand >>> 1;
				}
				else if (S32 (shift_operand) == 32)
				{
					carry = operand & (1 << 31);
					operand = 0;
				}
				else
				{
					carry = 0;
					operand = 0;
				}
			}
			break;
		case SHIFT_TYPE_ARITHMETIC_RIGHT:
			if (S32 (shift_operand) != 0)
			{
				if (S32 (shift_operand) < 32)
				{
					operand = operand >> (shift_operand - 1);
					carry = operand & 1;
					operand = operand >> 1;
				}
				else
				{
					carry = operand & (1 << 31);
					operand = operand >> 31; // 0 if positive, -1 if negative
				}
			}
			break;
		case SHIFT_TYPE_ROTATE_RIGHT:
			if (S32 (shift_operand) != 0)
			{
				if ((shift_operand & 0x1F) != 0)
					operand = ROTATE_RIGHT (operand, shift_operand & 0x1F);
				carry = operand & (1 << 31);
			}
			break;
		case SHIFT_TYPE_ROTATE_WITH_EXTEND:
			carry = operand & 1;
			operand = (cpsr & PSR_C << 2) | (operand >>> 1);
			break;
		default:
			// just in case
			bail (7536244);
			break;
	}

	switch (S32 (opcode))
	{
		case 0:
		case 8:
			result = base & operand;
			break;
		case 1:
			result = base ^ operand;
			break;
		case 2:
		case 10:
			result = INT (base - operand);
			break;
		case 3:
			result = INT (operand - base);
			break;
		case 4:
		case 11:
			result = INT (base + operand);
			break;
		case 5:
			result = INT (base + operand + (cpsr >> 29 & 0x01));
			break;
		case 6:
			result = INT (base - operand - (~cpsr >> 29 & 0x01));
			break;
		case 7:
			result = INT (operand - base - (~cpsr >> 29 & 0x01));
			break;
		case 9:
			result = base ^ operand;
			break;
		case 12:
			result = base | operand;
			break;
		case 13:
			result = operand;
			break;
		case 14:
			result = base & ~operand;
			break;
		case 15:
			result = ~operand;
			break;
		default:
			bail (928343);
			break;
	}

	if ((opcode & 0xC) != 0x8)
		setRegister (Rd, result);

	if (S)
	{
		if (S32 (Rd) == REG_PC)
		{
			// TODO: potential security problem
			setCPSR (getSPSR ());
		}
		else
		{
			cpsr = getCPSR ();

			switch (S32 (opcode))
			{
				case 0:
				case 1:
				case 8:
				case 9:
				case 12:
				case 13:
				case 14:
					cpsr = 
						(cpsr & 0x1FFFFFFF) |
						(result & (1 << 31)) |
						((S32 (result) == 0) << 30) |
						(!!carry << 29);
					break;
				case 2:
				case 6:
				case 10:
					cpsr =
						(cpsr & 0x0FFFFFFF) |
						(result & (1 << 31)) |
						((S32 (result) == 0) << 30) |
						(((base | ~operand) & (~operand | ~result) & (~result | base)) >> 2) & (1 << 29) |
						(((base ^ operand) & (base ^ result)) >> 3) & (1 << 28);
					break;
				case 3:
					cpsr =
						(cpsr & 0x0FFFFFFF) |
						(result & (1 << 31)) |
						((S32 (result) == 0) << 30) |
						(((operand | ~base) & (~base | ~result) & (~result | operand)) >> 2) & (1 << 29) |
						(((operand ^ base) & (operand ^ result)) >> 3) & (1 << 28);
					break;
				case 4:
				case 5:
				case 11:
					cpsr = 
						(cpsr & 0x0FFFFFFF) |
						(result & (1 << 31)) |
						((S32 (result) == 0) << 30) |
						(((base & operand) | (operand & ~result) | (~result & base)) >> 2) & (1 << 29) |
						(((base ^ result) & (operand ^ result)) >> 3) & (1 << 28);
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
 * MULTIPLY INSTRUCTIONS                *
 ****************************************/

function _inst_MUL_MLA (A, Rd, Rm, Rs, Rn, S)
{
	// Rn is invalid of A == 0 (MUL)
	PARAM_INT (A);
	PARAM_INT (Rd);
	PARAM_INT (Rm);
	PARAM_INT (Rs);
	PARAM_INT (Rn);
	PARAM_INT (S);

	var result = 0;
	result = imul (getRegister (Rm), getRegister (Rs));
	if (A)
		result = INT (result + getRegister (Rn));

	setRegister (Rd, result);

	if (S)
	{
		setCPSR (
			(getCPSR () & 0x3FFFFFFF) |
			(result & (1 << 31)) |
			((S32 (result) == 0) << 30)
		);
	}

	return STAT_OK;
}

function _inst_SMULL_SMLAL_UMULL_UMLAL (signed, A, RdHi, RdLo, Rm, Rs, S)
{
	PARAM_INT (signed);
	PARAM_INT (A);
	PARAM_INT (RdHi);
	PARAM_INT (RdLo);
	PARAM_INT (Rm);
	PARAM_INT (Rs);
	PARAM_INT (S);

	// inputs
	var alo = 0;
	var ahi = 0;
	var blo = 0;
	var bhi = 0;

	// results
	var rlo = 0;
	var rhi = 0;

	// temporary
	var rtm = 0;

	// accumulation
	var clo = 0;
	var chi = 0;

	// fill inputs
	alo = getRegister (Rm);
	ahi = alo >>> 16;
	alo = alo & 0xFFFF;

	blo = getRegister (Rs);
	bhi = blo >>> 16;
	blo = blo & 0xFFFF;

	// flip sign bit if signed
	if (signed)
	{
		ahi = ahi ^ (1 << 15);
		bhi = bhi ^ (1 << 15);
	}

	// calculate bases
	rlo = imul (alo, blo);
	rhi = imul (ahi, bhi);

	// add (ahi * blo) * 2^16
	rtm = imul (ahi, blo);
	rhi = INT (rhi + (rtm >>> 16));
	rtm = rtm << 16;
	rlo = INT (rlo + rtm);
	rhi = INT (rhi + (U32 (rlo) < U32 (rtm)));

	// add (alo * bhi) * 2^16
	rtm = imul (alo, bhi);
	rhi = INT (rhi + (rtm >>> 16));
	rtm = rtm << 16;
	rlo = INT (rlo + rtm);
	rhi = INT (rhi + (U32 (rlo) < U32 (rtm)));

	// fix value if signed
	if (signed)
	{
		// subtract 2^62
		rhi = INT (rhi - (1 << 30));

		// subtract middle low
		if ((alo ^ blo) & 1)
		{
			rlo = rlo ^ (1 << 31);
			if (rlo & (1 << 31))
				rhi = INT (rhi - 1);
		}

		// subtract middle high
		rhi = INT (rhi - ((alo + blo) >>> 1));
		rhi = INT (rhi - ((ahi + bhi) << 15));

		// unflip sign bit
		rhi = rhi ^ (1 << 31);

		console.log ("<<SMULL>>: " + getRegister (Rm) + " * " + getRegister (Rs) + " = " + S32 (rhi) + ", " + U32 (rlo));
	}

	// accumulate if necessary
	if (A)
	{
		clo = getRegister (RdLo);
		chi = getRegister (RdHi);
		rlo = INT (rlo + clo);
		rhi = INT (rhi + chi + (U32 (rlo) < U32 (clo)));
	}

	// writeback
	setRegister (RdLo, rlo);
	setRegister (RdHi, rhi);

	// flags if necessary
	if (S)
	{
		setCPSR (
			(getCPSR () & 0x3FFFFFFF) |
			(rhi & (1 << 31)) |
			(((rhi | rlo) == 0) << 30)
		);
	}

	return STAT_OK;
}

/****************************************
 * STATUS REGISTER ACCESS INSTRUCTIONS  *
 ****************************************/

function _inst_MRS (Rd, R)
{
	PARAM_INT (Rd);
	PARAM_INT (R);
	setRegister (Rd, R ? getSPSR () : getCPSR ());
	return STAT_OK;
}

function _inst_MSR (immreg, rotamt, R, field_mask)
{
	PARAM_INT (immreg);
	PARAM_INT (rotamt);
	PARAM_INT (R);
	PARAM_INT (field_mask);

#define UnallocMask 0x0FFFFF20
#define UserMask    0xF0000000
#define PrivMask    0x000000DF
#define StateMask   0x0

	var operand = 0;
	var mask = 0;

	operand = DECODE_IMMEDIATE_REGISTER (immreg);
	operand = ROTATE_RIGHT (operand, rotamt);

	mask =
		((field_mask & 1) ? 0x000000FF : 0) |
		((field_mask & 2) ? 0x0000FF00 : 0) |
		((field_mask & 4) ? 0x00FF0000 : 0) |
		((field_mask & 8) ? 0xFF000000 : 0);

	if (R)
	{
		// UNPREDICTABLE if no SPSR in current mode
		mask = mask & (UserMask | PrivMask | StateMask);
		setSPSR ((getSPSR () & ~mask) | (operand & mask));
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

function _inst_LDR_STR_LDRB_STRB (L, B, Rd, Rn, offset_immreg,
	shift_type, shift_amount, P, U, W)
{
	PARAM_INT (L);
	PARAM_INT (B);
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
	var wbaddress = 0;
	var value = 0;
	var flags = 0;

	offset = DECODE_IMMEDIATE_REGISTER (offset_immreg);
	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_LEFT:
			offset = offset << shift_amount;
			break;
		case SHIFT_TYPE_LOGICAL_RIGHT:
			if (S32 (shift_amount) < 32)
				offset = offset >>> shift_amount;
			else
				offset = 0;
			break;
		case SHIFT_TYPE_ARITHMETIC_RIGHT:
			if (S32 (shift_amount) < 32)
				offset = offset >> shift_amount;
			else
				offset = offset >> 31;
			break;
		default:
			bail (2851087);
			break;
	}

	// calculate addresses
	address = getRegister (Rn);
	if (U)
		wbaddress = INT (address + offset);
	else
		wbaddress = INT (address - offset);
	if (P) // not post-indexed
		address = wbaddress;

	// TODO: unaligned access
	if (!B)
		if (address & 3)
			bail (9028649);

	// check if user access
	if (!P & !!W)
		flags = flags | MMU_TRANSLATE_USER;

	// do the access
	if (L)
	{
		// LDR
		if (B)
			value = readByte (address, flags) & 0xFF;
		else
			value = readWord (address, flags);
		if (memoryError)
			return STAT_ABT;
		setRegister (Rd, S32 (Rd) == REG_PC ? value & ~3 : value); // mask if PC
	}
	else
	{
		// STR
		value = getRegister (Rd);
		if (B)
			writeByte (address, value & 0xFF, flags);
		else
			writeWord (address, value, flags);
		if (memoryError)
			return STAT_ABT;
	}

	// writeback base register only if wbaddress is valid
	if (!P | W)
		setRegister (Rn, wbaddress);

	return STAT_OK;
}

function _inst_LDR_STR_misc (LSH, Rd, Rn, offset_immreg, P, U, W)
{
	PARAM_INT (LSH);
	PARAM_INT (Rd);
	PARAM_INT (Rn);
	PARAM_INT (offset_immreg);
	PARAM_INT (P);
	PARAM_INT (U);
	PARAM_INT (W);

	var offset = 0;
	var address = 0;
	var wbaddress = 0;
	var value = 0;

	offset = DECODE_IMMEDIATE_REGISTER (offset_immreg);

	// calculate addresses
	address = getRegister (Rn);
	if (U)
		wbaddress = INT (address + offset);
	else
		wbaddress = INT (address - offset);
	if (P | W) // not post-indexed
		address = wbaddress;

	switch (S32 (LSH))
	{

		case 1: // STRH
			if (address & 1)
				bail (392849); // unaligned access
			value = getRegister (Rd);
			writeByte (address, value & 0xFF, 0);
			if (memoryError)
				bail (2384092);
			writeByte (INT (address + 1), value >> 8 & 0xFF, 0);
			if (memoryError)
				bail (2384093);
			break;

		case 5: // LDRH
		case 7: // LDRSH
			if (address & 1)
				bail (392850); // unaligned access
			value = readByte (address, 0);
			if (memoryError)
				bail (3465131);
			value = value | (readByte (INT (address + 1), 0) << 8);
			if (memoryError)
				bail (3465132);
			if (LSH & 0x2)
				setRegister (Rd, (value << 16) >> 16);
			else
				setRegister (Rd, value);
			break;

		case 6: // LDRSB
			value = readByte (address, 0);
			if (memoryError)
				bail (9082095);
			setRegister (Rd, (value << 24) >> 24);
			break;

		default:
			log (LOG_ID, 189351, LOG_SIGNED, S32 (LSH));
			bail (189351);
			return STAT_UND;
	}

	// writeback base register only if wbaddress is valid
	if (S32 (!!P) == S32 (!!W))
		setRegister (Rn, wbaddress);

	return STAT_OK;
}

/****************************************
 * LOAD AND STORE MULTIPLE INSTRUCTIONS *
 ****************************************/

function _inst_LDM_STM (L, Rn, register_list, addressing_mode, W, S)
{
	PARAM_INT (L);
	PARAM_INT (Rn);
	PARAM_INT (register_list);
	PARAM_INT (addressing_mode);
	PARAM_INT (W);
	PARAM_INT (S);

	var origBase = 0;
	var origPC = 0;

	var i = 0;
	var ptr = 0;
	var value = 0;

	origBase = getRegister (Rn);
	origPC = getPC ();

	ptr = origBase;
	if (ptr & 0x03)
		bail (13451701); // unaligned access

	// possible problem: assuming memoryError is STAT_OK on entry
	switch (S32 (addressing_mode))
	{
		case ADDRESSING_MODE_INCREMENT_BEFORE:
			ptr = INT (ptr + 4);
		case ADDRESSING_MODE_INCREMENT_AFTER:
			for (i = 0; S32 (i) < 16; i = INT (i + 1))
			{
				if (register_list & (1 << i))
				{
					if (L)
					{
						value = readWord (ptr, 0);
						if (memoryError)
							break;
						setRegister (i, S32 (i) == REG_PC ? value & ~3 : value); // mask if PC
					}
					else
					{
						value = getRegister (i);
						writeWord (ptr, value, 0);
						if (memoryError)
							break;
					}
					ptr = INT (ptr + 4);
				}
			}
			break;

		case ADDRESSING_MODE_DECREMENT_BEFORE:
			ptr = INT (ptr - 4);
		case ADDRESSING_MODE_DECREMENT_AFTER:
			for (i = 15; S32 (i) >= 0; i = INT (i - 1))
			{
				if (register_list & (1 << i))
				{
					if (L)
					{
						value = readWord (ptr, 0);
						if (memoryError)
							break;
						setRegister (i, S32 (i) == REG_PC ? value & ~3 : value); // mask if PC
					}
					else
					{
						value = getRegister (i);
						writeWord (ptr, value, 0);
						if (memoryError)
							break;
					}
					ptr = INT (ptr - 4);
				}
			}
			break;

		default:
			bail (3258718);
			break;
	}

	if (memoryError)
	{
		// restore to comply with abort model
		setRegister (Rn, origBase);
		setPC (origPC);
		bail (12982);
		return STAT_ABT;
	}

	if (W)
	{
		switch (S32 (addressing_mode))
		{
			case ADDRESSING_MODE_INCREMENT_BEFORE:
				ptr = INT (ptr - 4);
				break;
			case ADDRESSING_MODE_DECREMENT_BEFORE:
				ptr = INT (ptr + 4);
				break;
		}
		setRegister (Rn, ptr);
	}

	if (S)
	{
		// LDM(3): restore CPSR from SPSR
		// TODO: potential security problem
		setCPSR (getSPSR ());
	}

	return STAT_OK;
}

/****************************************
 * SEMAPHORE INSTRUCTIONS               *
 ****************************************/

function _inst_SWP_SWPB (B, Rd, Rm, Rn)
{
	PARAM_INT (B);
	PARAM_INT (Rd);
	PARAM_INT (Rm);
	PARAM_INT (Rn);

	var base = 0;
	var toreg = 0;
	var tomem = 0;

	base = getRegister (Rn);

	// read values
	tomem = getRegister (Rm);
	if (B)
		toreg = readByte (base, 0) & 0xFF;
	else
		toreg = readWord (base, 0);
	if (memoryError)
		bail (3283017);

	// write values
	setRegister (Rd, toreg);
	if (B)
		writeByte (base, tomem & 0xFF, 0);
	else
		writeWord (base, tomem, 0);
	if (memoryError)
		bail (4283019);

	return STAT_OK;
}

/****************************************
 * EXCEPTION-GENERATING INSTRUCTIONS    *
 ****************************************/

function _inst_SVC (imm)
{
	PARAM_INT (imm);

	var base = 0;
	var chr = 0;

	if (S32 (imm) == 0x123456)
	{
		switch (getRegister (REG_R0))
		{
			case 3:
				base = getRegister (REG_R1);
				chr = readByte (base, 0);
				print (S32 (chr));
				return STAT_OK;
			case 4:
				base = getRegister (REG_R1);
				while (1)
				{
					chr = readByte (base, 0);
					if (chr)
						print (S32 (chr));
					else
						break;
					base = INT (base + 1);
				}
				return STAT_OK;
		}
	}

	// pass to OS
	bail (1374190);
	return STAT_UND;
}

/****************************************
 * COPROCESSOR INSTRUCTIONS             *
 ****************************************/

function _inst_MCR (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
{
	PARAM_INT (Rd);
	PARAM_INT (cp_num);
	PARAM_INT (CRn);
	PARAM_INT (opcode_1);
	PARAM_INT (CRm);
	PARAM_INT (opcode_2);

	if (S32 (cp_num) == 15)
		return cp15_write (CRn, opcode_1, CRm, opcode_2, Rd);

	// for annotation, and if nothing satisfies
	bail (86414);
	return STAT_UND;
}

function _inst_MRC (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
{
	PARAM_INT (Rd);
	PARAM_INT (cp_num);
	PARAM_INT (CRn);
	PARAM_INT (opcode_1);
	PARAM_INT (CRm);
	PARAM_INT (opcode_2);

	if (S32 (cp_num) == 15)
		return cp15_read (CRn, opcode_1, CRm, opcode_2, Rd);

	// for annotation, and if nothing satisfies
	bail (86415);
	return STAT_UND;
}
