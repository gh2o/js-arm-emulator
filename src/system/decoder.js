#ifndef DECODER_NO_VALIDATION
#define VASSERT(x) do { if (!(x)) { bail (12343); return STAT_UND; } } while (0)
#else
#define VASSERT(x)
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

		// BL
		CASE_WILD_23_20_7_4 (0xB)
			return inst_BL (
				(inst << 8) >> 6 // offset from PC
			);

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
			if (inst & (1 << 25))
			{
				Rm = -1;
				operand = inst & 0xFF;
				operand = ROTATE_RIGHT (operand, n8 + n8);
			}
			return inst_MSR (
				Rm,               // register (-1 if immediate)
				operand,          // rotated immediate
				inst & (1 << 22), // R
				n16               // field_mask
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
			log (LOG_ID, 123321, LOG_HEX, S32 (inst));
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
