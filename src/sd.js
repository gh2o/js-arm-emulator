#define SD_STATUS_CLEAR_A 0x02004100
#define SD_STATUS_CLEAR_B 0x00C01E00
#define SD_STATUS_CLEAR_C 0xFD39A028

#define SD_STATUS_CURRENT_STATE       (15 << 9)
#define SD_STATUS_CURRENT_STATE_idle  (0  << 9)
#define SD_STATUS_CURRENT_STATE_ready (1  << 9)
#define SD_STATUS_CURRENT_STATE_ident (2  << 9)
#define SD_STATUS_CURRENT_STATE_stby  (3  << 9)
#define SD_STATUS_CURRENT_STATE_tran  (4  << 9)
#define SD_STATUS_CURRENT_STATE_data  (5  << 9)
#define SD_STATUS_CURRENT_STATE_rcv   (6  << 9)

#define SD_STATUS_ILLEGAL_COMMAND (1 << 22)
#define SD_STATUS_READY_FOR_DATA  (1 <<  8)
#define SD_STATUS_APP_CMD         (1 <<  5)

#define NRM_CMD(x) (x)
#define APP_CMD(x) (x + 0x40)

function SD (system, backend)
{
	this.system = system;
	this.backend = backend;

	this.status = SD_STATUS_CURRENT_STATE_idle | SD_STATUS_READY_FOR_DATA;

	this.dataCommand = 0;
	this.dataOffset = 0;
	this.dataArray = 0;
	this.dataTransaction = 0;
}

SD.prototype.doCommand = function (cmd, arg)
{
	cmd |= !!(this.status & SD_STATUS_APP_CMD) << 6;
	this.status &= ~SD_STATUS_CLEAR_C;

	switch (cmd)
	{
		case NRM_CMD (0):
			this.doCommandCallback ();
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case NRM_CMD (2):
			this.doCommandCallback (0xFF4A534A, 0x53454D55, 0x10000000, 0x0000D701);
			this.setMode (SD_STATUS_CURRENT_STATE_ident);
			return;
		case NRM_CMD (3):
			this.doCommandCallback (
				(0x01 << 16) |
				(this.status >> 8 & 0xC000) |
				(this.status >> 6 & 0x2000) |
				(this.status & 0x1FFF)
			);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case NRM_CMD (7):
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
			return;
		case NRM_CMD (8):
			this.doCommandCallback (arg & 0xFFF);
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case NRM_CMD (9):
			this.doCommandCallback (0x007FFF08, 0x5B5983FF, 0xC003BF80, 0x02400001);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case NRM_CMD (12):
			this.initData (0, 0);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
			return;
		case NRM_CMD (13):
			this.doCommandCallback (this.status);
			return;
		case NRM_CMD (18):
			this.initData (cmd, arg);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case NRM_CMD (25):
			this.initData (cmd, arg);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_rcv);
			return;
		case NRM_CMD (55):
			this.status |= SD_STATUS_APP_CMD;
			this.doCommandCallback (this.status);
			return;
		case APP_CMD (13):
			this.initData (cmd, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case APP_CMD (41):
			this.doCommandCallback (0x80FF0000);
			this.setMode (SD_STATUS_CURRENT_STATE_ready);
			return;
		case APP_CMD (51):
			this.initData (cmd, 0, [0, 0]);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case NRM_CMD (5):
		case NRM_CMD (52):
			this.doCommandCallback (this.status | SD_STATUS_ILLEGAL_COMMAND);
			return;
		default:
			console.log ("=== WARNING: unknown command: " + (cmd & 0x40 ? "A" : "") + "CMD" + (cmd & 0x3F));
			this.doCommandCallback (this.status | SD_STATUS_ILLEGAL_COMMAND);
			return;
	}

};

SD.prototype.initData = function (command, offset, array) {
	this.dataCommand = command;
	this.dataOffset = offset;
	this.dataArray = array;
	this.dataTransaction += 1;
};

SD.prototype.setMode = function (mode) {
	this.status = this.status & ~SD_STATUS_CURRENT_STATE | mode;
};

SD.prototype.doRead = function (heapo, size) {
	if (this.dataArray)
	{
		var inarr = this.dataArray;
		var inptr = this.dataOffset;
		var outarr = new Int32Array (system.heap, heapo, size >>> 2);
		var outptr = 0; // also total bytes transferred

		for (;inptr < (inarr.length << 2) && outptr < size; inptr += 4, outptr += 4)
			outarr[outptr >>> 2] = inarr[inptr >>> 2];

		this.dataOffset = inptr;
		this.setMode (SD_STATUS_CURRENT_STATE_tran);
		this.doReadCallback (outptr);
	}
	else if (this.dataCommand == NRM_CMD (18))
	{
		var sd = this;
		var transaction = this.dataTransaction;
		var source = new Int32Array (size >>> 2);
		var target = new Int32Array (system.heap, heapo, size >>> 2);
		var bytearray = new Uint8Array (source.buffer);

		sd.backend.read (bytearray, sd.dataOffset, size, function (sz) {
			if (sd.dataTransaction != transaction)
			{
				console.log ('=== WARNING: read aborted');
				sz = 0;
			}
			for (var i = 0; i < (sz >>> 2); i++)
				target[i] = sd.system.swapIfNeeded (source[i]);
			sd.dataOffset += sz;
			sd.setMode (SD_STATUS_CURRENT_STATE_tran);
			sd.doReadCallback (sz);
		});
	}
	else
	{
		throw new Error ("unknown read command: " + (cmd & 0x40 ? "A" : "") + "CMD" + (cmd & 0x3F));
	}
};

SD.prototype.doWrite = function (heapo, size) {
	if (this.dataArray)
	{
		throw new Error ("dataArray writes not supported!");
	}
	else if (this.dataCommand == NRM_CMD (25))
	{
		var sd = this;
		var transaction = this.dataTransaction;
		var source = new Int32Array (system.heap, heapo, size >>> 2);
		var target = new Int32Array (size >>> 2);
		var bytearray = new Uint8Array (target.buffer);

		for (var i = 0; i < (size >>> 2); i++)
			target[i] = sd.system.swapIfNeeded (source[i]);

		sd.backend.write (bytearray, sd.dataOffset, size, function (sz) {
			if (sd.dataTransaction != transaction)
			{
				console.log ('=== WARNING: write aborted');
				sz = 0;
			}
			sd.dataOffset += sz;
			sd.setMode (SD_STATUS_CURRENT_STATE_tran);
			sd.doWriteCallback (sz);
		});
	}
	else
	{
		throw new Error ("unknown write command: " + (cmd & 0x40 ? "A" : "") + "CMD" + (cmd & 0x3F));
	}
};
