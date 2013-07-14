#include "mmu.inc"

#define TRANSLATE_READ    (1 << 0)
#define TRANSLATE_WRITE   (1 << 1)
#define TRANSLATE_EXECUTE (1 << 2)

function _readWordPhysical (addr)
{
	PARAM_INT (addr);

	var offset = 0;

	// TODO: unaligned accesses
	if ((addr & 0x03) != 0)
		bail (2136);

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
		bail (2138);

	memoryError = STAT_OK;
	return INT (wordView[offset >> 2]);
}

function _writeWordPhysical (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	var offset = 0;

	// TODO: unaligned accesses
	if ((addr & 0x03) != 0)
		bail (2137);

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
		bail (2139);

	memoryError = STAT_OK;
	wordView[offset >> 2] = value;
}

function _readBytePhysical (addr)
{
	PARAM_INT (addr);

	var offset = 0;

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
		bail (3138);

	memoryError = STAT_OK;
	return INT (byteView[needSwap ? offset ^ 3 : offset] & 0xFF);
}

function _writeBytePhysical (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	var offset = 0;

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
		bail (3139);

	memoryError = STAT_OK;
	byteView[needSwap ? offset ^ 3 : offset] = value & 0xFF;
}

function _readWord (addr)
{
	PARAM_INT (addr);

	if (cp15_SCTLR & CP15_SCTLR_M)
	{
		addr = translateAddress (addr, TRANSLATE_READ);
		if (memoryError)
			return 0;
	}

	return readWordPhysical (addr);
}

function _writeWord (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	if (cp15_SCTLR & CP15_SCTLR_M)
	{
		addr = translateAddress (addr, TRANSLATE_WRITE);
		if (memoryError)
			return;
	}

	writeWordPhysical (addr, value);
}

function _readByte (addr)
{
	PARAM_INT (addr);

	if (cp15_SCTLR & CP15_SCTLR_M)
	{
		addr = translateAddress (addr, TRANSLATE_READ);
		if (memoryError)
			return 0;
	}
	
	return readBytePhysical (addr);
}

function _writeByte (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	if (cp15_SCTLR & CP15_SCTLR_M)
	{
		addr = translateAddress (addr, TRANSLATE_WRITE);
		if (memoryError)
			return;
	}

	writeBytePhysical (addr, value);
}

#define dtype (desc1 & 3)

function _translateAddress (vaddr, trtype)
{
	PARAM_INT (vaddr);
	PARAM_INT (trtype);

	var desc1 = 0;
	var desc2 = 0;
	var domain = 0;
	var permitted = 0;
	var paddr = -1;

	// get first level descriptor
	desc1 = readWordPhysical ((cp15_TTBR0 & 0xFFFFC000) | (vaddr >> 18 & 0x3FFC));
	if (memoryError)
	{
		memoryError = STAT_ABT;
		cp15_FSR = 0x0C;
		cp15_FAR = vaddr;
		return 0;
	}

	switch (dtype)
	{
		case 0: // fault
			memoryError = STAT_ABT;
			cp15_FSR = 0x05;
			cp15_FAR = vaddr;
			return 0;
		case 1: // course
			desc2 = readWordPhysical ((desc1 & 0xFFFFFC00) | (vaddr >> 10 & 0x03FC));
			if (memoryError)
			{
				memoryError = STAT_ABT;
				cp15_FSR = 0x0E | (domain << 4);
				cp15_FAR = vaddr;
				return 0;
			}
			switch (desc2 & 3)
			{
				case 0: // fault
					memoryError = STAT_ABT;
					cp15_FSR = 0x07 | (domain << 4);
					cp15_FAR = vaddr;
					return 0;
				case 2: // small pages
					paddr = (desc2 & 0xFFFFF000) | (vaddr & 0x0FFF);
					break;
				default:
					bail (13840193);
			}
			break;
		case 2: // section
			paddr = (desc1 & 0xFFF00000) | (vaddr & 0x000FFFFF);
			break;
		default:
			bail (2389032);
			return 0;
	}

	// check domain
	domain = desc1 >> 5 & 0x0F;
	switch (cp15_DACR >> (domain << 1) & 0x03)
	{
		case 0: // no access
			memoryError = STAT_ABT;
			cp15_FSR = (dtype == 2 ? 0x9 : 0xB) | (domain << 4);
			cp15_FAR = vaddr;
			return 0;
		case 1: // client
			// TODO: subpage AP bits
			switch (desc2 >> 4 & 0xFF)
			{
				case 0x00:
				case 0x55:
				case 0xaa:
				case 0xff:
					break;
				default:
					bail (328514);
					break;
			}
			switch (desc2 >> 4 & 0x03)
			{
				case 0:
					switch (cp15_SCTLR >> 8 & 0x03) // R/S bits
					{
						case 1:
							permitted = !(trtype & TRANSLATE_WRITE) & !!isPrivileged ();
							break;
						case 2:
							permitted = !(trtype & TRANSLATE_WRITE);
							break;
					}
					break;
				case 1:
					permitted = !!isPrivileged ()
					break;
				case 2:
					permitted = !(trType & TRANSLATE_WRITE) | !!isPrivileged ();
					break;
				case 3:
					permitted = 1;
					break;
			}
			if (!permitted)
				bail (1231809); // permission denied
			break;
		case 2: // unpredictable
			bail (432159);
			return 0;
		case 3: // manager
			break;
	}

	memoryError = STAT_OK;
	return INT (paddr);
}

#undef dtype
