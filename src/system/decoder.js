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

#define n16 (inst >> 16 & 0x0F)
#define n12 (inst >> 12 & 0x0F)
#define n8 (inst >> 8 & 0x0F)
#define n0 (inst >> 0 & 0x0F)

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
 * BRANCH INSTRUCTIONS                  *
 ****************************************/

function SUBDECODER_FUNCTION (B) (inst)
{
	PARAM_INT (inst);
	return inst_B (
		(inst << 8) >> 6 // offset from PC
	);
}

function SUBDECODER_FUNCTION (BL) (inst)
{
	PARAM_INT (inst);
	return inst_BL (
		(inst << 8) >> 6 // offset from PC
	);
}

function SUBDECODER_FUNCTION (BX) (inst)
{
	PARAM_INT (inst);
	VASSERT (n16 == 15);
	VASSERT (n12 == 15);
	VASSERT (n8 == 15);
	return inst_BX (Rm);
}

/****************************************
 * DATA PROCESSING INSTRUCTIONS         *
 ****************************************/

#ifndef DECODER_NO_VALIDATION
#define VALIDATE_DATA() \
	do { \
		if ((S32 (opcode) == 13) | (S32 (opcode) == 15)) \
			VASSERT (Rn == 0); \
		if ((S32 (opcode) >= 8) & (S32 (opcode) < 12)) \
			VASSERT (Rd == 0); \
	} while (0)
#else
#define VALIDATE_DATA()
#endif

function SUBDECODER_FUNCTION(DATA_imm) (inst)
{
	PARAM_INT (inst);

	var opcode = 0;

	opcode = inst >> 21 & 0x0F;
	VALIDATE_DATA ();

	return inst_DATA (
		opcode,                            // opcode
		Rd,                                // Rd
		Rn,                                // Rn
		PACK_IMMEDIATE (inst & 0xFF),      // operand
		PACK_IMMEDIATE (inst >> 7 & 0x1E), // shift operand
		SHIFT_TYPE_ROTATE_RIGHT,           // shift type
		inst & (1 << 20)                   // S
	);
}

function SUBDECODER_FUNCTION(DATA_reg_imm) (inst)
{
	PARAM_INT (inst);

	var opcode = 0;
	var shift_type = 0;
	var shift_imm = 0;

	opcode = inst >> 21 & 0x0F;
	VALIDATE_DATA ();

	shift_type = (inst >> 5) & 0x03;
	shift_imm = (inst >> 7) & 0x1F;

	// apply shift fixups
	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_RIGHT:
		case SHIFT_TYPE_ARITHMETIC_RIGHT:
			if (S32 (shift_imm) == 0)
				shift_imm = 32;
			break;
		case SHIFT_TYPE_ROTATE_RIGHT:
			if (S32 (shift_imm) == 0)
				shift_type = SHIFT_TYPE_ROTATE_WITH_EXTEND;
			break;
	}
	
	return inst_DATA (
		opcode,                     // opcode
		Rd,                         // Rd
		Rn,                         // Rn
		PACK_REGISTER (Rm),         // operand
		PACK_IMMEDIATE (shift_imm), // shift operand
		shift_type,                 // shift type
		inst & (1 << 20)            // S
	);
}

function SUBDECODER_FUNCTION (DATA_reg_reg) (inst)
{
	PARAM_INT (inst);

	var opcode = 0;

	opcode = inst >> 21 & 0x0F;
	VALIDATE_DATA ();

	return inst_DATA (
		opcode,             // opcode
		Rd,                 // Rd
		Rn,                 // Rn
		PACK_REGISTER (Rm), // operand
		PACK_REGISTER (Rs), // shift operand
		(inst >> 5) & 0x03, // shift type
		inst & (1 << 20)    // S
	);
}

#undef VALIDATE_DATA

/****************************************
 * MULTIPLY INSTRUCTIONS                *
 ****************************************/

function SUBDECODER_FUNCTION (MUL_MLA) (inst)
{
	PARAM_INT (inst);

#ifndef DECODER_NO_VALIDATION
	if (!(inst & (1 << 21)))
		VASSERT (n12 == 0);
#endif
	
	// Rd and Rn are reversed for MUL and MLA
	return inst_MUL_MLA (
		inst & (1 << 21), // accumulate (MLA)
		n16,              // Rd (result register)
		Rm,               // Rm (multiplicand 1)
		Rs,               // Rs (multiplicand 2)
		n12,              // Rn (accumulator)
		inst & (1 << 20)  // S
	);
}

function SUBDECODER_FUNCTION (SMULL_SMLAL_UMULL_UMLAL) (inst)
{
	PARAM_INT (inst);

	return inst_SMULL_SMLAL_UMULL_UMLAL (
		inst & (1 << 22), // signed
		inst & (1 << 21), // accumulate
		n16,              // RdHi
		n12,              // RdLo
		Rm,               // Rm (multiplicand 1)
		Rs,               // Rs (multiplicand 2)
		inst & (1 << 20)  // S
	);
}

/****************************************
 * STATUS REGISTER ACCESS INSTRUCTIONS  *
 ****************************************/

function SUBDECODER_FUNCTION (MRS) (inst)
{
	PARAM_INT (inst);
	VASSERT (n0 == 0);
	VASSERT (n8 == 0);
	VASSERT (n16 == 15);
	return inst_MRS (
		Rd,              // Rd
		inst & (1 << 22) // R
	);
}

function SUBDECODER_FUNCTION (MSR_imm) (inst)
{
	PARAM_INT (inst);
	VASSERT (n12 == 15);
	return inst_MSR (
		PACK_IMMEDIATE (inst & 0xFF), // operand
		n8 << 1,                      // rotate amount
		inst & (1 << 22),             // R
		n16                           // field_mask
	);
}

function SUBDECODER_FUNCTION (MSR_reg) (inst)
{
	PARAM_INT (inst);
	VASSERT (n12 == 15);
	VASSERT (n8 == 0);
	return inst_MSR (
		PACK_REGISTER (Rm), // operand
		0,                  // rotate amount
		inst & (1 << 22),   // R
		n16                 // field_mask
	);
}

/****************************************
 * LOAD AND STORE INSTRUCTIONS          *
 ****************************************/

function SUBDECODER_FUNCTION (LDR_STR_LDRB_STRB_imm) (inst)
{
	PARAM_INT (inst);

	return inst_LDR_STR_LDRB_STRB (
		inst & (1 << 20),               // L
		inst & (1 << 22),               // B
		Rd,                             // Rd
		Rn,                             // Rn
		PACK_IMMEDIATE (inst & 0x0FFF), // offset register/immediate
		0,                              // shift type
		0,                              // shift amount
		inst & (1 << 24),               // P
		inst & (1 << 23),               // U
		inst & (1 << 21)                // W
	);
}

function SUBDECODER_FUNCTION (LDR_STR_LDRB_STRB_reg) (inst)
{
	PARAM_INT (inst);

	var shift_type = 0;
	var shift_amount = 0;

	shift_type = (inst >> 5) & 0x03;
	shift_amount = (inst >> 7) & 0x1F;

	switch (S32 (shift_type))
	{
		case SHIFT_TYPE_LOGICAL_RIGHT:
		case SHIFT_TYPE_ARITHMETIC_RIGHT:
			if (S32 (shift_amount) == 0)
				shift_amount = 32;
			break;
		case SHIFT_TYPE_ROTATE_RIGHT:
			if (S32 (shift_amount) == 0)
				shift_type = SHIFT_TYPE_ROTATE_WITH_EXTEND;
			break;
	}

	return inst_LDR_STR_LDRB_STRB (
		inst & (1 << 20),   // L
		inst & (1 << 22),   // B
		Rd,                 // Rd
		Rn,                 // Rn
		PACK_REGISTER (Rm), // offset register/immediate
		shift_type,         // shift type
		shift_amount,       // shift amount
		inst & (1 << 24),   // P
		inst & (1 << 23),   // U
		inst & (1 << 21)    // W
	);
}

function SUBDECODER_FUNCTION (LDR_STR_misc_imm) (inst)
{
	PARAM_INT (inst);

	return inst_LDR_STR_misc (
		(inst >> 18 & 0x4) | (inst >> 5 & 0x3), // L/S/H
		Rd,                                     // Rd
		Rn,                                     // Rn
		PACK_IMMEDIATE ((n8 << 4) | n0),        // offset register/immediate
		inst & (1 << 24),                       // P
		inst & (1 << 23),                       // U
		inst & (1 << 21)                        // W
	);
}

function SUBDECODER_FUNCTION (LDR_STR_misc_reg) (inst)
{
	PARAM_INT (inst);

	VASSERT (n8 == 0);

	return inst_LDR_STR_misc (
		(inst >> 18 & 0x4) | (inst >> 5 & 0x3), // L/S/H
		Rd,                                     // Rd
		Rn,                                     // Rn
		PACK_REGISTER (Rm),                     // offset register/immediate
		inst & (1 << 24),                       // P
		inst & (1 << 23),                       // U
		inst & (1 << 21)                        // W
	);
}

/****************************************
 * LOAD AND STORE MULTIPLE INSTRUCTIONS *
 ****************************************/

function SUBDECODER_FUNCTION (LDM_STM) (inst)
{
	PARAM_INT (inst);
	return inst_LDM_STM (
		inst & (1 << 20),   // L
		Rn,                 // Rn
		inst & 0xFFFF,      // register list
		(inst >> 23) & 0x3, // addressing mode (P/U bits)
		inst & (1 << 21)    // W
	);
}

/****************************************
 * SEMAPHORE INSTRUCTIONS               *
 ****************************************/

function SUBDECODER_FUNCTION (SWP_SWPB) (inst)
{
	PARAM_INT (inst);

	VASSERT (n8 == 0);

	return inst_SWP_SWPB (
		inst & (1 << 22), // B (SWPB)
		Rd,               // Rd
		Rm,               // Rm
		Rn                // Rn
	);
}

/****************************************
 * EXCEPTION-GENERATING INSTRUCTIONS    *
 ****************************************/

function SUBDECODER_FUNCTION (SVC) (inst)
{
	PARAM_INT (inst);
	return inst_SVC (inst & 0xFFFFFF);
}

/****************************************
 * COPROCESSOR INSTRUCTIONS             *
 ****************************************/

function SUBDECODER_FUNCTION (MCR) (inst)
{
	PARAM_INT (inst);
	return inst_MCR (
		Rd,             // Rd
		n8,             // cp_num
		Rn,             // CRn
		inst >> 21 & 7, // opcode_1
		Rm,             // CRm
		inst >> 5 & 7   // opcode_2
	);
}

function SUBDECODER_FUNCTION (MRC) (inst)
{
	PARAM_INT (inst);
	return inst_MRC (
		Rd,             // Rd
		n8,             // cp_num
		Rn,             // CRn
		inst >> 21 & 7, // opcode_1
		Rm,             // CRm
		inst >> 5 & 7   // opcode_2
	);
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

#endif

#ifdef DECODER_INCLUDE_TABLES
#define _FILL16(x) x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x
#define FILL16(x) _FILL16(SUBDECODER_FUNCTION(x))
#define und SUBDECODER_FUNCTION(UND)
var DECODER_TABLE = [

#define r01a SUBDECODER_FUNCTION(DATA_reg_imm)
#define r01b SUBDECODER_FUNCTION(DATA_reg_reg)
#define ROW_0_1(q9,qb,qd,qf) r01a, r01b, r01a, r01b, \
                             r01a, r01b, r01a, r01b, \
                             r01a, SUBDECODER_FUNCTION(q9), r01a, SUBDECODER_FUNCTION(qb), \
                             r01a, SUBDECODER_FUNCTION(qd), r01a, SUBDECODER_FUNCTION(qf)
	/* 0x00 */ ROW_0_1(MUL_MLA,UND,UND,UND),
	/* 0x01 */ ROW_0_1(MUL_MLA,UND,UND,UND),
	/* 0x02 */ ROW_0_1(MUL_MLA,UND,UND,UND),
	/* 0x03 */ ROW_0_1(MUL_MLA,UND,UND,UND),
	/* 0x04 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x05 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x06 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x07 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x08 */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x09 */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x0A */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x0B */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x0C */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,LDR_STR_misc_imm,UND,UND),
	/* 0x0D */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x0E */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x0F */ ROW_0_1(SMULL_SMLAL_UMULL_UMLAL,UND,UND,UND),
	/* 0x10 */
		SUBDECODER_FUNCTION(MRS), und, und, und,
		und, und, und, und,
		und, SUBDECODER_FUNCTION(SWP_SWPB), und, und,
		und, und, und, und,
	/* 0x11 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x12 */ 
		SUBDECODER_FUNCTION(MSR_reg), SUBDECODER_FUNCTION(BX), und, und,
		und, und, und, und,
		und, und, und, und,
		und, und, und, und,
	/* 0x13 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x14 */
		SUBDECODER_FUNCTION(MRS), und, und, und,
		und, und, und, und,
		und, und, und, und,
		und, und, und, und,
	/* 0x15 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x16 */
		SUBDECODER_FUNCTION(MSR_reg), und, und, und,
		und, und, und, und,
		und, und, und, und,
		und, und, und, und,
	/* 0x17 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x18 */ ROW_0_1(UND,LDR_STR_misc_reg,UND,UND),
	/* 0x19 */ ROW_0_1(UND,UND,UND,UND),
	/* 0x1A */ ROW_0_1(UND,UND,UND,UND),
	/* 0x1B */ ROW_0_1(UND,UND,UND,UND),
	/* 0x1C */ ROW_0_1(UND,LDR_STR_misc_imm,UND,UND),
	/* 0x1D */ ROW_0_1(UND,LDR_STR_misc_imm,LDR_STR_misc_imm,LDR_STR_misc_imm),
	/* 0x1E */ ROW_0_1(UND,UND,UND,UND),
	/* 0x1F */ FILL16(UND),
#undef r01a
#undef r01b
#undef ROW_0_1

	/* 0x20 */ FILL16(DATA_imm),
	/* 0x21 */ FILL16(DATA_imm),
	/* 0x22 */ FILL16(DATA_imm),
	/* 0x23 */ FILL16(DATA_imm),
	/* 0x24 */ FILL16(DATA_imm),
	/* 0x25 */ FILL16(DATA_imm),
	/* 0x26 */ FILL16(DATA_imm),
	/* 0x27 */ FILL16(DATA_imm),
	/* 0x28 */ FILL16(DATA_imm),
	/* 0x29 */ FILL16(DATA_imm),
	/* 0x2A */ FILL16(DATA_imm),
	/* 0x2B */ FILL16(DATA_imm),
	/* 0x2C */ FILL16(DATA_imm),
	/* 0x2D */ FILL16(DATA_imm),
	/* 0x2E */ FILL16(DATA_imm),
	/* 0x2F */ FILL16(DATA_imm),

	/* 0x30 */ FILL16(UND),
	/* 0x31 */ FILL16(DATA_imm),
	/* 0x32 */ FILL16(MSR_imm),
	/* 0x33 */ FILL16(DATA_imm),
	/* 0x34 */ FILL16(UND),
	/* 0x35 */ FILL16(DATA_imm),
	/* 0x36 */ FILL16(UND),
	/* 0x37 */ FILL16(DATA_imm),
	/* 0x38 */ FILL16(DATA_imm),
	/* 0x39 */ FILL16(DATA_imm),
	/* 0x3A */ FILL16(DATA_imm),
	/* 0x3B */ FILL16(DATA_imm),
	/* 0x3C */ FILL16(DATA_imm),
	/* 0x3D */ FILL16(DATA_imm),
	/* 0x3E */ FILL16(DATA_imm),
	/* 0x3F */ FILL16(DATA_imm),

	/* 0x40 */ FILL16(UND),
	/* 0x41 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x42 */ FILL16(UND),
	/* 0x43 */ FILL16(UND),
	/* 0x44 */ FILL16(UND),
	/* 0x45 */ FILL16(UND),
	/* 0x46 */ FILL16(UND),
	/* 0x47 */ FILL16(UND),
	/* 0x48 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x49 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x4A */ FILL16(UND),
	/* 0x4B */ FILL16(UND),
	/* 0x4C */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x4D */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x4E */ FILL16(UND),
	/* 0x4F */ FILL16(UND),

	/* 0x50 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x51 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x52 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x53 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x54 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x55 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x56 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x57 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x58 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x59 */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5A */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5B */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5C */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5D */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5E */ FILL16(LDR_STR_LDRB_STRB_imm),
	/* 0x5F */ FILL16(LDR_STR_LDRB_STRB_imm),

#define r67a SUBDECODER_FUNCTION(LDR_STR_LDRB_STRB_reg), und
#define ROW_6_7_LDR_STR() r67a, r67a, r67a, r67a, r67a, r67a, r67a, r67a

	/* 0x60 */ FILL16(UND),
	/* 0x61 */ FILL16(UND),
	/* 0x62 */ FILL16(UND),
	/* 0x63 */ FILL16(UND),
	/* 0x64 */ FILL16(UND),
	/* 0x65 */ FILL16(UND),
	/* 0x66 */ FILL16(UND),
	/* 0x67 */ FILL16(UND),
	/* 0x68 */ FILL16(UND),
	/* 0x69 */ FILL16(UND),
	/* 0x6A */ FILL16(UND),
	/* 0x6B */ FILL16(UND),
	/* 0x6C */ FILL16(UND),
	/* 0x6D */ FILL16(UND),
	/* 0x6E */ FILL16(UND),
	/* 0x6F */ FILL16(UND),

	/* 0x70 */ FILL16(UND),
	/* 0x71 */ FILL16(UND),
	/* 0x72 */ FILL16(UND),
	/* 0x73 */ FILL16(UND),
	/* 0x74 */ FILL16(UND),
	/* 0x75 */ FILL16(UND),
	/* 0x76 */ FILL16(UND),
	/* 0x77 */ FILL16(UND),
	/* 0x78 */ ROW_6_7_LDR_STR(),
	/* 0x79 */ ROW_6_7_LDR_STR(),
	/* 0x7A */ FILL16(UND),
	/* 0x7B */ ROW_6_7_LDR_STR(),
	/* 0x7C */ ROW_6_7_LDR_STR(),
	/* 0x7D */ ROW_6_7_LDR_STR(),
	/* 0x7E */ FILL16(UND),
	/* 0x7F */ ROW_6_7_LDR_STR(),

#undef r67a
#undef ROW_6_7_LDR_STR

	/* 0x80 */ FILL16(UND),
	/* 0x81 */ FILL16(UND),
	/* 0x82 */ FILL16(UND),
	/* 0x83 */ FILL16(UND),
	/* 0x84 */ FILL16(UND),
	/* 0x85 */ FILL16(UND),
	/* 0x86 */ FILL16(UND),
	/* 0x87 */ FILL16(UND),
	/* 0x88 */ FILL16(LDM_STM),
	/* 0x89 */ FILL16(LDM_STM),
	/* 0x8A */ FILL16(LDM_STM),
	/* 0x8B */ FILL16(LDM_STM),
	/* 0x8C */ FILL16(UND),
	/* 0x8D */ FILL16(UND),
	/* 0x8E */ FILL16(UND),
	/* 0x8F */ FILL16(UND),

	/* 0x90 */ FILL16(LDM_STM),
	/* 0x91 */ FILL16(LDM_STM),
	/* 0x92 */ FILL16(LDM_STM),
	/* 0x93 */ FILL16(UND),
	/* 0x94 */ FILL16(UND),
	/* 0x95 */ FILL16(UND),
	/* 0x96 */ FILL16(UND),
	/* 0x97 */ FILL16(UND),
	/* 0x98 */ FILL16(LDM_STM),
	/* 0x99 */ FILL16(LDM_STM),
	/* 0x9A */ FILL16(UND),
	/* 0x9B */ FILL16(UND),
	/* 0x9C */ FILL16(UND),
	/* 0x9D */ FILL16(UND),
	/* 0x9E */ FILL16(UND),
	/* 0x9F */ FILL16(UND),

	/* 0xA0 */ FILL16(B),
	/* 0xA1 */ FILL16(B),
	/* 0xA2 */ FILL16(B),
	/* 0xA3 */ FILL16(B),
	/* 0xA4 */ FILL16(B),
	/* 0xA5 */ FILL16(B),
	/* 0xA6 */ FILL16(B),
	/* 0xA7 */ FILL16(B),
	/* 0xA8 */ FILL16(B),
	/* 0xA9 */ FILL16(B),
	/* 0xAA */ FILL16(B),
	/* 0xAB */ FILL16(B),
	/* 0xAC */ FILL16(B),
	/* 0xAD */ FILL16(B),
	/* 0xAE */ FILL16(B),
	/* 0xAF */ FILL16(B),

	/* 0xB0 */ FILL16(BL),
	/* 0xB1 */ FILL16(BL),
	/* 0xB2 */ FILL16(BL),
	/* 0xB3 */ FILL16(BL),
	/* 0xB4 */ FILL16(BL),
	/* 0xB5 */ FILL16(BL),
	/* 0xB6 */ FILL16(BL),
	/* 0xB7 */ FILL16(BL),
	/* 0xB8 */ FILL16(BL),
	/* 0xB9 */ FILL16(BL),
	/* 0xBA */ FILL16(BL),
	/* 0xBB */ FILL16(BL),
	/* 0xBC */ FILL16(BL),
	/* 0xBD */ FILL16(BL),
	/* 0xBE */ FILL16(BL),
	/* 0xBF */ FILL16(BL),

	/* 0xC0 */ FILL16(UND),
	/* 0xC1 */ FILL16(UND),
	/* 0xC2 */ FILL16(UND),
	/* 0xC3 */ FILL16(UND),
	/* 0xC4 */ FILL16(UND),
	/* 0xC5 */ FILL16(UND),
	/* 0xC6 */ FILL16(UND),
	/* 0xC7 */ FILL16(UND),
	/* 0xC8 */ FILL16(UND),
	/* 0xC9 */ FILL16(UND),
	/* 0xCA */ FILL16(UND),
	/* 0xCB */ FILL16(UND),
	/* 0xCC */ FILL16(UND),
	/* 0xCD */ FILL16(UND),
	/* 0xCE */ FILL16(UND),
	/* 0xCF */ FILL16(UND),

	/* 0xD0 */ FILL16(UND),
	/* 0xD1 */ FILL16(UND),
	/* 0xD2 */ FILL16(UND),
	/* 0xD3 */ FILL16(UND),
	/* 0xD4 */ FILL16(UND),
	/* 0xD5 */ FILL16(UND),
	/* 0xD6 */ FILL16(UND),
	/* 0xD7 */ FILL16(UND),
	/* 0xD8 */ FILL16(UND),
	/* 0xD9 */ FILL16(UND),
	/* 0xDA */ FILL16(UND),
	/* 0xDB */ FILL16(UND),
	/* 0xDC */ FILL16(UND),
	/* 0xDD */ FILL16(UND),
	/* 0xDE */ FILL16(UND),
	/* 0xDF */ FILL16(UND),

#define re und, SUBDECODER_FUNCTION(MCR)
#define ROW_E_EVEN() re, re, re, re, re, re, re, re
#define ro und, SUBDECODER_FUNCTION(MRC)
#define ROW_E_ODD() ro, ro, ro, ro, ro, ro, ro, ro
	/* 0xE0 */ ROW_E_EVEN(),
	/* 0xE1 */ ROW_E_ODD(),
	/* 0xE2 */ ROW_E_EVEN(),
	/* 0xE3 */ ROW_E_ODD(),
	/* 0xE4 */ ROW_E_EVEN(),
	/* 0xE5 */ ROW_E_ODD(),
	/* 0xE6 */ ROW_E_EVEN(),
	/* 0xE7 */ ROW_E_ODD(),
	/* 0xE8 */ ROW_E_EVEN(),
	/* 0xE9 */ ROW_E_ODD(),
	/* 0xEA */ ROW_E_EVEN(),
	/* 0xEB */ ROW_E_ODD(),
	/* 0xEC */ ROW_E_EVEN(),
	/* 0xED */ ROW_E_ODD(),
	/* 0xEE */ ROW_E_EVEN(),
	/* 0xEF */ ROW_E_ODD(),
#undef re
#undef ROW_E_EVEN
#undef ro
#undef ROW_E_ODD

	/* 0xF0 */ FILL16(SVC),
	/* 0xF1 */ FILL16(SVC),
	/* 0xF2 */ FILL16(SVC),
	/* 0xF3 */ FILL16(SVC),
	/* 0xF4 */ FILL16(SVC),
	/* 0xF5 */ FILL16(SVC),
	/* 0xF6 */ FILL16(SVC),
	/* 0xF7 */ FILL16(SVC),
	/* 0xF8 */ FILL16(SVC),
	/* 0xF9 */ FILL16(SVC),
	/* 0xFA */ FILL16(SVC),
	/* 0xFB */ FILL16(SVC),
	/* 0xFC */ FILL16(SVC),
	/* 0xFD */ FILL16(SVC),
	/* 0xFE */ FILL16(SVC),
	/* 0xFF */ FILL16(SVC)

];
#undef und
#undef FILL16
#undef _FILL16
#endif

#undef Rn
#undef Rd
#undef Rs
#undef Rm

#undef VASSERT
#undef CASE_WILD_7_4
#undef CASE_WILD_23_20_7_4
