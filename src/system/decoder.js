#include "decoder.inc"

#ifndef DECODER_NO_VALIDATION
#define VASSERT(x) { if (!(x)) { bail (12343); return STAT_UND; } }
#else
#define VASSERT(x) {}
#endif

#define CASE_WILD_7_4(x) \
	case x##0: case x##1: case x##2: case x##3: \
	case x##4: case x##5: case x##6: case x##7: \
	case x##8: case x##9: case x##A: case x##B: \
	case x##C: case x##D: case x##E: case x##F:

#define CASE_WILD_23_20_7_4(x) \
	CASE_WILD_7_4(x##0) \
	CASE_WILD_7_4(x##1) \
	CASE_WILD_7_4(x##2) \
	CASE_WILD_7_4(x##3) \
	CASE_WILD_7_4(x##4) \
	CASE_WILD_7_4(x##5) \
	CASE_WILD_7_4(x##6) \
	CASE_WILD_7_4(x##7) \
	CASE_WILD_7_4(x##8) \
	CASE_WILD_7_4(x##9) \
	CASE_WILD_7_4(x##A) \
	CASE_WILD_7_4(x##B) \
	CASE_WILD_7_4(x##C) \
	CASE_WILD_7_4(x##D) \
	CASE_WILD_7_4(x##E) \
	CASE_WILD_7_4(x##F)

#define Rn n16
#define Rd n12
#define Rs n8
#define Rm n0

function DECODER_FUNCTION (inst)
{
	PARAM_INT (inst);

	// predefined variables
	var dbits = 0;
	var n16 = 0, n12 = 0, n8  = 0, n0  = 0;

	// temporary variables
	var operand = 0;
	var tmpA = 0, tmpB = 0, tmpC = 0;

	// bits[27:20] -> bits[11:4]
	// bits[7:4]   -> bits[3:0]
	dbits = (inst >> 16 & 0x0FF0) | (inst >> 4 & 0x000F);
	n16 = EXTRACT_NIBBLE (inst, 16);
	n12 = EXTRACT_NIBBLE (inst, 12);
	n8  = EXTRACT_NIBBLE (inst,  8);
	n0  = EXTRACT_NIBBLE (inst,  0);

	switch (S32 (dbits))
	{
		/****************************************
		 * BRANCH INSTRUCTIONS                  *
		 ****************************************/

		// B
		CASE_WILD_23_20_7_4 (0xA)
			return inst_B (
				(inst << 8) >> 6 // offset from PC
			);

		// BL
		CASE_WILD_23_20_7_4 (0xB)
			return inst_BL (
				(inst << 8) >> 6 // offset from PC
			);

		/****************************************
		 * DATA PROCESSING INSTRUCTIONS         *
		 ****************************************/

		#define CASE_DATA_IMM(x) CASE_WILD_7_4(x)
		#define CASE_DATA_REG(x) \
			case x##0: case x##2: case x##4: case x##6: \
			case x##8: case x##A: case x##C: case x##E: \
			case x##1: case x##3: case x##5: case x##7:

		// AND
		CASE_DATA_IMM (0x20)
		CASE_DATA_IMM (0x21)
		CASE_DATA_REG (0x00)
		CASE_DATA_REG (0x01)

		// EOR
		CASE_DATA_IMM (0x22)
		CASE_DATA_IMM (0x23)
		CASE_DATA_REG (0x02)
		CASE_DATA_REG (0x03)

		// SUB
		CASE_DATA_IMM (0x24)
		CASE_DATA_IMM (0x25)
		CASE_DATA_REG (0x04)
		CASE_DATA_REG (0x05)

		// RSB
		CASE_DATA_IMM (0x26)
		CASE_DATA_IMM (0x27)
		CASE_DATA_REG (0x06)
		CASE_DATA_REG (0x07)

		// ADD
		CASE_DATA_IMM (0x28)
		CASE_DATA_IMM (0x29)
		CASE_DATA_REG (0x08)
		CASE_DATA_REG (0x09)

		// ADC
		CASE_DATA_IMM (0x2A)
		CASE_DATA_IMM (0x2B)
		CASE_DATA_REG (0x0A)
		CASE_DATA_REG (0x0B)

		// SBC
		CASE_DATA_IMM (0x2C)
		CASE_DATA_IMM (0x2D)
		CASE_DATA_REG (0x0C)
		CASE_DATA_REG (0x0D)

		// RSC
		CASE_DATA_IMM (0x2E)
		CASE_DATA_IMM (0x2F)
		CASE_DATA_REG (0x0E)
		CASE_DATA_REG (0x0F)

		// TST
		CASE_DATA_IMM (0x31)
		CASE_DATA_REG (0x11)

		// TEQ
		CASE_DATA_IMM (0x33)
		CASE_DATA_REG (0x13)

		// CMP
		CASE_DATA_IMM (0x35)
		CASE_DATA_REG (0x15)

		// CMN
		CASE_DATA_IMM (0x37)
		CASE_DATA_REG (0x17)

		// ORR
		CASE_DATA_IMM (0x38)
		CASE_DATA_IMM (0x39)
		CASE_DATA_REG (0x18)
		CASE_DATA_REG (0x19)

		// MOV
		CASE_DATA_IMM (0x3A)
		CASE_DATA_IMM (0x3B)
		CASE_DATA_REG (0x1A)
		CASE_DATA_REG (0x1B)

		// BIC
		CASE_DATA_IMM (0x3C)
		CASE_DATA_IMM (0x3D)
		CASE_DATA_REG (0x1C)
		CASE_DATA_REG (0x1D)

		// MVN
		CASE_DATA_IMM (0x3E)
		CASE_DATA_IMM (0x3F)
		CASE_DATA_REG (0x1E)
		CASE_DATA_REG (0x1F)

		#undef CASE_DATA_IMM
		#undef CASE_DATA_REG

		#define opcode operand
		#define immed tmpA
		#define shift_type tmpB

			opcode = inst >> 21 & 0x0F;
			immed = inst >> 25 & 1;

#ifndef DECODER_NO_VALIDATION
			if ((S32 (opcode) == 13) | (S32 (opcode) == 15))
				VASSERT (S32 (Rn) == 0);
			if ((S32 (opcode) >= 8) & (S32 (opcode) < 12))
				VASSERT (S32 (Rd) == 0);
#endif

			shift_type = (inst >> 5) & 0x03;
			if (immed)
				shift_type = SHIFT_TYPE_ROTATE_RIGHT;
			else if ((inst & 0xFF0) == 0x060)
				shift_type = SHIFT_TYPE_ROTATE_WITH_EXTEND;

			return inst_DATA (
				opcode,          // opcode
				Rd,              // Rd
				Rn,              // Rn
				COMBINE_IMMEDIATE_REGISTER (
					immed,
					inst & 0xFF,
					Rm
				),               // operand
				COMBINE_IMMEDIATE_REGISTER (
					immed | !(inst & (1 << 4)),
					(inst >> 7) & ~immed & 0x1F,
					Rs           // shift operand
				),
				shift_type,      // shift type
				inst & (1 << 20) // S
			);

		#undef opcode
		#undef immed
		#undef shift_type

		/****************************************
		 * STATUS REGISTER ACCESS INSTRUCTIONS  *
		 ****************************************/

		// MSR
		case 0x120: // register
		case 0x160:
			VASSERT (S32 (n8) == 0);
		CASE_WILD_7_4(0x32) // immediate
		CASE_WILD_7_4(0x36)
			VASSERT (S32 (n12) == 15);
			return inst_MSR (
				COMBINE_IMMEDIATE_REGISTER (
					inst & (1 << 25),
					ROTATE_RIGHT (inst & 0xFF, n8 + n8),
					Rm
				),                // operand
				inst & (1 << 22), // R
				n16               // field_mask
			);

		/****************************************
		 * LOAD AND STORE INSTRUCTIONS          *
		 ****************************************/

		#define CASE_LS_IMM(x) CASE_WILD_7_4(x)
		#define immed tmpA
		#define shift_mask tmpB
		#define shift_type tmpC

		// LDR and STR
		CASE_LS_IMM (0x59)

			immed = !(inst & (1 << 25));
			operand = COMBINE_IMMEDIATE_REGISTER (
				immed,
				inst & 0x0FFF,
				Rm
			);

			shift_mask = INT (immed - 1); // 0 when immed, -1 when not immed
			shift_type = ((inst & 0xFF0) == 0x060) ?
				SHIFT_TYPE_ROTATE_WITH_EXTEND :
				(inst >> 5) & 0x3;

			return inst_LDR (
				Rd,                              // Rd
				Rn,                              // Rn
				operand,                         // offset register/immediate
				shift_mask & shift_type,         // shift type
				shift_mask & (inst >> 7) & 0x1F, // shift amount
				inst & (1 << 24),                // P
				inst & (1 << 23),                // U
				inst & (1 << 21)                 // W
			);

		#undef CASE_LS_IMM
		#undef immed
		#undef shift_mask
		#undef shift_type

		/****************************************
		 * LOAD AND STORE MULTIPLE INSTRUCTIONS *
		 ****************************************/

		// LDM
		CASE_WILD_7_4 (0x81)
		CASE_WILD_7_4 (0x83)
		CASE_WILD_7_4 (0x89)
		CASE_WILD_7_4 (0x8B)
		CASE_WILD_7_4 (0x91)
		CASE_WILD_7_4 (0x93)
		CASE_WILD_7_4 (0x99)
		CASE_WILD_7_4 (0x9B)
			return inst_LDM (
				Rn,                 // Rn
				inst & 0xFFFF,      // register list
				(inst >> 23) & 0x3, // addressing mode (P/U bits)
				inst & (1 << 21)    // W
			);

		/****************************************
		 * COPROCESSOR INSTRUCTIONS             *
		 ****************************************/

		#define CASE_CP_7_5(x) \
			case x##1: case x##3: case x##5: case x##7: \
			case x##9: case x##B: case x##D: case x##F:
		
		// MRC
		CASE_CP_7_5(0xE1)
		CASE_CP_7_5(0xE3)
		CASE_CP_7_5(0xE5)
		CASE_CP_7_5(0xE7)
		CASE_CP_7_5(0xE9)
		CASE_CP_7_5(0xEB)
		CASE_CP_7_5(0xED)
		CASE_CP_7_5(0xEF)
			return inst_MRC (
				Rd,             // Rd
				n8,             // cp_num
				Rn,             // CRn
				inst >> 21 & 7, // opcode_1
				Rm,             // CRm
				inst >> 5 & 7   // opcode_2
			);

		#undef CASE_CP_7_5

		/****************************************
		 * UNDEFINED INSTRUCTIONS               *
		 ****************************************/

		default: // undefined instruction
			log (LOG_ID, 123321, LOG_HEX, S32 (getPC () - 4), LOG_HEX, S32 (inst));
			bail (123321);
			return STAT_UND;
	}

	// for annotation
	return STAT_UND;
}

#undef Rn
#undef Rd
#undef Rs
#undef Rm

#undef VASSERT
#undef CASE_WILD_7_4
#undef CASE_WILD_23_20_7_4
