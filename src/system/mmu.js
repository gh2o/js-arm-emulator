function _readWord (addr)
{
	PARAM_INT (addr);

	var offset = 0;
	var value = 0;

	// TODO: unaligned accesses
	if ((addr & 0x03) != 0)
		bail (2136);

	// MMU
	if (cp15_SCTLR & CP15_SCTLR_M)
		bail (3244);

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
	{
		log (LOG_ID, 2138, LOG_HEX, S32 (addr), LOG_HEX, S32 (offset));
		bail (2138);
	}
	return INT (wordView[offset >> 2]);
}

function _writeWord (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	var offset = 0;

	// TODO: unaligned accesses
	if ((addr & 0x03) != 0)
		bail (2137);

	// MMU
	if (cp15_SCTLR & CP15_SCTLR_M)
		bail (3245);

	offset = memoryAddressToHeapOffset (addr);
	if (U32 (offset) >= U32 (memorySize))
		bail (2139);
	wordView[offset >> 2] = value;
}

