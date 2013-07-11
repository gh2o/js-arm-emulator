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

#define SUBDECODER_FUNCTION(x) CONCAT_TOKENS(DECODER_FUNCTION,_##x)

#ifdef DECODER_TABLE
#undef DECODER_TABLE
#endif
#define DECODER_TABLE CONCAT_TOKENS(DECODER_FUNCTION,_table)

#ifdef DECODER_INCLUDE_FUNCTIONS
function DECODER_FUNCTION (inst)
{
	PARAM_INT (inst);

	// bits[27:20] + bits[7:4]
	var dbits = 0;
	dbits = (inst >> 16 & 0x0FF0) | (inst >> 4 & 0x0F);

	return INT (DECODER_TABLE[dbits & 0x0FFF](inst));
}

/****************************************
 * UNDEFINED INSTRUCTIONS               *
 ****************************************/

function SUBDECODER_FUNCTION (UND) (inst)
{
	PARAM_INT (inst);
	log (LOG_ID, 1234321, LOG_HEX, S32 (getPC () - 4), LOG_HEX, S32 (inst));
	bail (1234321);
	return STAT_UND;
}

/****************************************
 * STATUS REGISTER ACCESS INSTRUCTIONS  *
 ****************************************/

function SUBDECODER_FUNCTION (MSR) (inst)
{
	PARAM_INT (inst);
	bail (42857642);
	return STAT_UND;
}
#endif

#ifdef DECODER_INCLUDE_TABLES
#define FILL16(x) x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x
#define und SUBDECODER_FUNCTION(UND)
var DECODER_TABLE = [
	/* 0x00 */ FILL16(und),
	/* 0x01 */ FILL16(und),
	/* 0x02 */ FILL16(und),
	/* 0x03 */ FILL16(und),
	/* 0x04 */ FILL16(und),
	/* 0x05 */ FILL16(und),
	/* 0x06 */ FILL16(und),
	/* 0x07 */ FILL16(und),
	/* 0x08 */ FILL16(und),
	/* 0x09 */ FILL16(und),
	/* 0x0A */ FILL16(und),
	/* 0x0B */ FILL16(und),
	/* 0x0C */ FILL16(und),
	/* 0x0D */ FILL16(und),
	/* 0x0E */ FILL16(und),
	/* 0x0F */ FILL16(und),
	/* 0x10 */ FILL16(und),
	/* 0x11 */ FILL16(und),
	/* 0x12 */ FILL16(und),
	/* 0x13 */ FILL16(und),
	/* 0x14 */ FILL16(und),
	/* 0x15 */ FILL16(und),
	/* 0x16 */ FILL16(und),
	/* 0x17 */ FILL16(und),
	/* 0x18 */ FILL16(und),
	/* 0x19 */ FILL16(und),
	/* 0x1A */ FILL16(und),
	/* 0x1B */ FILL16(und),
	/* 0x1C */ FILL16(und),
	/* 0x1D */ FILL16(und),
	/* 0x1E */ FILL16(und),
	/* 0x1F */ FILL16(und),
	/* 0x20 */ FILL16(und),
	/* 0x21 */ FILL16(und),
	/* 0x22 */ FILL16(und),
	/* 0x23 */ FILL16(und),
	/* 0x24 */ FILL16(und),
	/* 0x25 */ FILL16(und),
	/* 0x26 */ FILL16(und),
	/* 0x27 */ FILL16(und),
	/* 0x28 */ FILL16(und),
	/* 0x29 */ FILL16(und),
	/* 0x2A */ FILL16(und),
	/* 0x2B */ FILL16(und),
	/* 0x2C */ FILL16(und),
	/* 0x2D */ FILL16(und),
	/* 0x2E */ FILL16(und),
	/* 0x2F */ FILL16(und),
	/* 0x30 */ FILL16(und),
	/* 0x31 */ FILL16(und),
	/* 0x32 */ FILL16(SUBDECODER_FUNCTION(MSR)),
	/* 0x33 */ FILL16(und),
	/* 0x34 */ FILL16(und),
	/* 0x35 */ FILL16(und),
	/* 0x36 */ FILL16(und),
	/* 0x37 */ FILL16(und),
	/* 0x38 */ FILL16(und),
	/* 0x39 */ FILL16(und),
	/* 0x3A */ FILL16(und),
	/* 0x3B */ FILL16(und),
	/* 0x3C */ FILL16(und),
	/* 0x3D */ FILL16(und),
	/* 0x3E */ FILL16(und),
	/* 0x3F */ FILL16(und),
	/* 0x40 */ FILL16(und),
	/* 0x41 */ FILL16(und),
	/* 0x42 */ FILL16(und),
	/* 0x43 */ FILL16(und),
	/* 0x44 */ FILL16(und),
	/* 0x45 */ FILL16(und),
	/* 0x46 */ FILL16(und),
	/* 0x47 */ FILL16(und),
	/* 0x48 */ FILL16(und),
	/* 0x49 */ FILL16(und),
	/* 0x4A */ FILL16(und),
	/* 0x4B */ FILL16(und),
	/* 0x4C */ FILL16(und),
	/* 0x4D */ FILL16(und),
	/* 0x4E */ FILL16(und),
	/* 0x4F */ FILL16(und),
	/* 0x50 */ FILL16(und),
	/* 0x51 */ FILL16(und),
	/* 0x52 */ FILL16(und),
	/* 0x53 */ FILL16(und),
	/* 0x54 */ FILL16(und),
	/* 0x55 */ FILL16(und),
	/* 0x56 */ FILL16(und),
	/* 0x57 */ FILL16(und),
	/* 0x58 */ FILL16(und),
	/* 0x59 */ FILL16(und),
	/* 0x5A */ FILL16(und),
	/* 0x5B */ FILL16(und),
	/* 0x5C */ FILL16(und),
	/* 0x5D */ FILL16(und),
	/* 0x5E */ FILL16(und),
	/* 0x5F */ FILL16(und),
	/* 0x60 */ FILL16(und),
	/* 0x61 */ FILL16(und),
	/* 0x62 */ FILL16(und),
	/* 0x63 */ FILL16(und),
	/* 0x64 */ FILL16(und),
	/* 0x65 */ FILL16(und),
	/* 0x66 */ FILL16(und),
	/* 0x67 */ FILL16(und),
	/* 0x68 */ FILL16(und),
	/* 0x69 */ FILL16(und),
	/* 0x6A */ FILL16(und),
	/* 0x6B */ FILL16(und),
	/* 0x6C */ FILL16(und),
	/* 0x6D */ FILL16(und),
	/* 0x6E */ FILL16(und),
	/* 0x6F */ FILL16(und),
	/* 0x70 */ FILL16(und),
	/* 0x71 */ FILL16(und),
	/* 0x72 */ FILL16(und),
	/* 0x73 */ FILL16(und),
	/* 0x74 */ FILL16(und),
	/* 0x75 */ FILL16(und),
	/* 0x76 */ FILL16(und),
	/* 0x77 */ FILL16(und),
	/* 0x78 */ FILL16(und),
	/* 0x79 */ FILL16(und),
	/* 0x7A */ FILL16(und),
	/* 0x7B */ FILL16(und),
	/* 0x7C */ FILL16(und),
	/* 0x7D */ FILL16(und),
	/* 0x7E */ FILL16(und),
	/* 0x7F */ FILL16(und),
	/* 0x80 */ FILL16(und),
	/* 0x81 */ FILL16(und),
	/* 0x82 */ FILL16(und),
	/* 0x83 */ FILL16(und),
	/* 0x84 */ FILL16(und),
	/* 0x85 */ FILL16(und),
	/* 0x86 */ FILL16(und),
	/* 0x87 */ FILL16(und),
	/* 0x88 */ FILL16(und),
	/* 0x89 */ FILL16(und),
	/* 0x8A */ FILL16(und),
	/* 0x8B */ FILL16(und),
	/* 0x8C */ FILL16(und),
	/* 0x8D */ FILL16(und),
	/* 0x8E */ FILL16(und),
	/* 0x8F */ FILL16(und),
	/* 0x90 */ FILL16(und),
	/* 0x91 */ FILL16(und),
	/* 0x92 */ FILL16(und),
	/* 0x93 */ FILL16(und),
	/* 0x94 */ FILL16(und),
	/* 0x95 */ FILL16(und),
	/* 0x96 */ FILL16(und),
	/* 0x97 */ FILL16(und),
	/* 0x98 */ FILL16(und),
	/* 0x99 */ FILL16(und),
	/* 0x9A */ FILL16(und),
	/* 0x9B */ FILL16(und),
	/* 0x9C */ FILL16(und),
	/* 0x9D */ FILL16(und),
	/* 0x9E */ FILL16(und),
	/* 0x9F */ FILL16(und),
	/* 0xA0 */ FILL16(und),
	/* 0xA1 */ FILL16(und),
	/* 0xA2 */ FILL16(und),
	/* 0xA3 */ FILL16(und),
	/* 0xA4 */ FILL16(und),
	/* 0xA5 */ FILL16(und),
	/* 0xA6 */ FILL16(und),
	/* 0xA7 */ FILL16(und),
	/* 0xA8 */ FILL16(und),
	/* 0xA9 */ FILL16(und),
	/* 0xAA */ FILL16(und),
	/* 0xAB */ FILL16(und),
	/* 0xAC */ FILL16(und),
	/* 0xAD */ FILL16(und),
	/* 0xAE */ FILL16(und),
	/* 0xAF */ FILL16(und),
	/* 0xB0 */ FILL16(und),
	/* 0xB1 */ FILL16(und),
	/* 0xB2 */ FILL16(und),
	/* 0xB3 */ FILL16(und),
	/* 0xB4 */ FILL16(und),
	/* 0xB5 */ FILL16(und),
	/* 0xB6 */ FILL16(und),
	/* 0xB7 */ FILL16(und),
	/* 0xB8 */ FILL16(und),
	/* 0xB9 */ FILL16(und),
	/* 0xBA */ FILL16(und),
	/* 0xBB */ FILL16(und),
	/* 0xBC */ FILL16(und),
	/* 0xBD */ FILL16(und),
	/* 0xBE */ FILL16(und),
	/* 0xBF */ FILL16(und),
	/* 0xC0 */ FILL16(und),
	/* 0xC1 */ FILL16(und),
	/* 0xC2 */ FILL16(und),
	/* 0xC3 */ FILL16(und),
	/* 0xC4 */ FILL16(und),
	/* 0xC5 */ FILL16(und),
	/* 0xC6 */ FILL16(und),
	/* 0xC7 */ FILL16(und),
	/* 0xC8 */ FILL16(und),
	/* 0xC9 */ FILL16(und),
	/* 0xCA */ FILL16(und),
	/* 0xCB */ FILL16(und),
	/* 0xCC */ FILL16(und),
	/* 0xCD */ FILL16(und),
	/* 0xCE */ FILL16(und),
	/* 0xCF */ FILL16(und),
	/* 0xD0 */ FILL16(und),
	/* 0xD1 */ FILL16(und),
	/* 0xD2 */ FILL16(und),
	/* 0xD3 */ FILL16(und),
	/* 0xD4 */ FILL16(und),
	/* 0xD5 */ FILL16(und),
	/* 0xD6 */ FILL16(und),
	/* 0xD7 */ FILL16(und),
	/* 0xD8 */ FILL16(und),
	/* 0xD9 */ FILL16(und),
	/* 0xDA */ FILL16(und),
	/* 0xDB */ FILL16(und),
	/* 0xDC */ FILL16(und),
	/* 0xDD */ FILL16(und),
	/* 0xDE */ FILL16(und),
	/* 0xDF */ FILL16(und),
	/* 0xE0 */ FILL16(und),
	/* 0xE1 */ FILL16(und),
	/* 0xE2 */ FILL16(und),
	/* 0xE3 */ FILL16(und),
	/* 0xE4 */ FILL16(und),
	/* 0xE5 */ FILL16(und),
	/* 0xE6 */ FILL16(und),
	/* 0xE7 */ FILL16(und),
	/* 0xE8 */ FILL16(und),
	/* 0xE9 */ FILL16(und),
	/* 0xEA */ FILL16(und),
	/* 0xEB */ FILL16(und),
	/* 0xEC */ FILL16(und),
	/* 0xED */ FILL16(und),
	/* 0xEE */ FILL16(und),
	/* 0xEF */ FILL16(und),
	/* 0xF0 */ FILL16(und),
	/* 0xF1 */ FILL16(und),
	/* 0xF2 */ FILL16(und),
	/* 0xF3 */ FILL16(und),
	/* 0xF4 */ FILL16(und),
	/* 0xF5 */ FILL16(und),
	/* 0xF6 */ FILL16(und),
	/* 0xF7 */ FILL16(und),
	/* 0xF8 */ FILL16(und),
	/* 0xF9 */ FILL16(und),
	/* 0xFA */ FILL16(und),
	/* 0xFB */ FILL16(und),
	/* 0xFC */ FILL16(und),
	/* 0xFD */ FILL16(und),
	/* 0xFE */ FILL16(und),
	/* 0xFF */ FILL16(und)
];
#undef und
#undef FILL16
#endif

#if 0
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
#endif

#undef Rn
#undef Rd
#undef Rs
#undef Rm

#undef VASSERT
#undef CASE_WILD_7_4
#undef CASE_WILD_23_20_7_4
