#include "peripherals.inc"

/************************************************************
 User peripherals   : 1111 1111 1111 1xxx xx00 0000 0000 0000
 System peripherals : 1111 1111 1111 1111 1111 xxxx 0000 0000
 ************************************************************/

#ifdef PERIPHERALS_INCLUDE_FUNCTIONS
function _readWordPeripheral (addr)
{
	PARAM_INT (addr);

	if ((addr >> 12) == ~0) // system peripherals
		return INT (systemPeripheralRead[addr >> 8 & 0x0F](addr & 0x1FF));
	else if (addr >> 19 == ~0) // user peripherals
		return INT (userPeripheralRead[addr >> 14 & 0x1F](addr & 0x3FFF));

	bail (1280799);
	return 0;
}

function _writeWordPeripheral (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	if ((addr >> 12) == ~0) // system peripherals
		systemPeripheralWrite[addr >> 8 & 0x0F](addr & 0x1FF, value);
	else if (addr >> 19 == ~0) // user peripherals
		userPeripheralWrite[addr >> 14 & 0x1F](addr & 0x3FFF, value);

	bail (1893192);
}

function _undefinedPeripheralRead (addr)
{
	PARAM_INT (addr);

	bail (2130657);

	return 0;
}

function _undefinedPeripheralWrite (addr, value)
{
	PARAM_INT (addr);
	PARAM_INT (value);

	bail (2130668);
}
#endif

#ifdef PERIPHERALS_INCLUDE_TABLES

#define und _undefinedPeripheralRead
var systemPeripheralRead = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und
];
var userPeripheralRead = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und,
	/* 16 */ und,
	/* 17 */ und,
	/* 18 */ und,
	/* 19 */ und,
	/* 20 */ und,
	/* 21 */ und,
	/* 22 */ und,
	/* 23 */ und,
	/* 24 */ und,
	/* 25 */ und,
	/* 26 */ und,
	/* 27 */ und,
	/* 28 */ und,
	/* 29 */ und,
	/* 30 */ und,
	/* 31 */ und
];
#undef und

#define und _undefinedPeripheralWrite
var systemPeripheralWrite = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und
];
var userPeripheralWrite = [
	/*  0 */ und,
	/*  1 */ und,
	/*  2 */ und,
	/*  3 */ und,
	/*  4 */ und,
	/*  5 */ und,
	/*  6 */ und,
	/*  7 */ und,
	/*  8 */ und,
	/*  9 */ und,
	/* 10 */ und,
	/* 11 */ und,
	/* 12 */ und,
	/* 13 */ und,
	/* 14 */ und,
	/* 15 */ und,
	/* 16 */ und,
	/* 17 */ und,
	/* 18 */ und,
	/* 19 */ und,
	/* 20 */ und,
	/* 21 */ und,
	/* 22 */ und,
	/* 23 */ und,
	/* 24 */ und,
	/* 25 */ und,
	/* 26 */ und,
	/* 27 */ und,
	/* 28 */ und,
	/* 29 */ und,
	/* 30 */ und,
	/* 31 */ und
];
#undef und

#endif
