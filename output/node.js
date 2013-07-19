function formatHex (a)
{
 var b = (a >>> 0).toString (16);
 while (b.length < 8)
  b = "0" + b;
 return "0x" + b;
}
if (!Math.imul)
{
 Math.imul = function (a, b) {
  var ah = (a >>> 16) & 0xffff;
  var al = a & 0xffff;
  var bh = (b >>> 16) & 0xffff;
  var bl = b & 0xffff;
  return ((al * bl) + ((ah * bl + al * bh) << 16)) | 0;
 };
}
var getMilliseconds = (function () {
 var func;
 var begin = null;
 if (typeof process !== "undefined")
 {
  begin = process.hrtime ();
  func = function () {
   var now = process.hrtime ();
   return (now[0] - begin[0]) * 1e3 + (now[1] - begin[1]) * 1e-6;
  };
 }
 else if (typeof performance !== "undefined" && (performance.now || performance.webkitNow))
 {
  var nowfunc = (performance.now || performance.webkitNow).bind (performance);
  begin = nowfunc ();
  func = function () { return nowfunc () - begin; };
 }
 else
 {
  begin = +(new Date);
  func = function () { return +(new Date) - begin; };
 }
 function getNanoseconds () { return func (); }
 return getNanoseconds;
})();
       
       
function System (options)
{
 ((options === undefined) && (options = ({})));
 ((options.memoryOffset === undefined) && (options.memoryOffset = (0x20000000)));
 ((options.memorySize === undefined) && (options.memorySize = (64 * 1024 * 1024 - 4096)));
 this.options = options;
 if ((options.memoryOffset & 0x0FFF) != 0)
  throw new Error ("memoryOffset must be page aligned");
 var heapSize = 4096 + options.memorySize;
 if ((heapSize & (heapSize - 1)) != 0)
  throw new Error ("MEMORY_START + memorySize must be power of two");
 this.heap = new ArrayBuffer (heapSize);
 this.core = this.linkCore ();
 this.reset = this.core.reset;
 this.getPC = this.core.getPC;
 this.setPC = this.core.setPC;
 this.getRegister = this.core.getRegister;
 this.setRegister = this.core.setRegister;
 this.getCPSR = this.core.getCPSR;
 this.setCPSR = this.core.setCPSR;
 this.run = this.core.run;
}
System.prototype.needSwap = (function () {
 var arr = new Uint8Array (4);
 arr.set ([0xCA, 0xFE, 0xBA, 0xBE]);
 return 0xCAFEBABE === new Uint32Array (arr.buffer)[0];
})();
System.prototype.loadImage = function (image, address) {
 if (image.byteLength & 0x03)
 {
  var next = new ArrayBuffer ((image.byteLength + 3) & ~0x03);
  new Uint8Array (next).set (new Uint8Array (image));
  image = next;
 }
 var source = new Int32Array (image.slice (0));
 if (this.needSwap)
 {
  for (var i = 0; i < source.length; i++)
  {
   var x = source[i];
   source[i] =
    ((x & 0xFF000000) >>> 24) |
    ((x & 0x00FF0000) >>> 8) |
    ((x & 0x0000FF00) << 8) |
    ((x & 0x000000FF) << 24);
  }
 }
 var heapOffset = address - this.options.memoryOffset + 4096;
 var target = new Int32Array (this.heap, heapOffset, source.length);
 target.set (source);
};
System.prototype.onConsoleByte = function () {
 throw new Error ("override onConsoleByte!");
};
       
System.prototype.linkCore = function () {
 var system = this;
 var foreign = {
  needSwap: Number (system.needSwap),
  memorySize: system.options.memorySize,
  memoryOffset: system.options.memoryOffset,
  log: function () {
   var nargs = [];
   for (var i = 0; i < arguments.length; i += 2)
   {
    var k = arguments[i];
    var v = arguments[i+1];
    var a;
    switch (k)
    {
     case (0):
      a = "<" + v + ">";
      break;
     case (1):
      a = formatHex (v);
      break;
     case (2):
      a = (v >> 0).toString (10);
      break;
     case (3):
      a = (v >>> 0).toString (10);
      break;
    }
    nargs.push (a)
   }
   console.log.apply (console, nargs);
  },
  bail: function (code) {
   for (var i = 0; i < 16; i++)
   {
    var r = system.getRegister (i);
    console.error ("=== R" + i + ": " + formatHex (r));
   }
   console.error ("=== PC: " + formatHex (system.getPC () - 4));
   console.error ("=== CPSR: " + formatHex (system.getCPSR ()));
   throw new Error ("Bail! (" + code + ")");
  },
  print: function (b) {
   system.onConsoleByte (b & 0xFF);
  },
  getMilliseconds: getMilliseconds
 };
 var stdlib = (function () { return this; })();
 return Core (stdlib, foreign, system.heap);
       
       
       
       
       
       
function Core (stdlib, foreign, heap)
{
 "use asm";
 var wordView = new stdlib.Int32Array (heap);
 var byteView = new stdlib.Uint8Array (heap);
 var needSwap = ((foreign.needSwap)|0);
 var memoryOffset = ((foreign.memoryOffset)|0);
 var memorySize = ((foreign.memorySize)|0);
 var memoryError = 0;
 var tickCount = 0;
 var _floor = stdlib.Math.floor;
 var _ceil = stdlib.Math.ceil;
 var _imul = stdlib.Math.imul;
 var _getMilliseconds = foreign.getMilliseconds;
 var log = foreign.log;
 var bail = foreign.bail;
 var print = foreign.print;
       
var cp15_SCTLR = 0;
var cp15_DACR = 0;
var cp15_TTBR0 = 0;
var cp15_FSR = 0;
var cp15_FAR = 0;
var pAIC_SPU = 0;
var pAIC_IMR = 0;
var pAIC_IPR = 0;
var pAIC_stacksize = 0;
var pAIC_priomask = 0;
var pST_IMR = 0;
var pST_PIMR = 0;
var pST_PIMR_period = 2000.0;
var pST_PIMR_timestamp = 0.0
var pST_RTMR = 0;
var pST_RTMR_ticktime = 0.0;
var pST_CRTR = 0;
var pST_CRTR_timestamp = 0.0;
var pST_RTAR = 0;
var pST_SR_PITS_expiration = 0.0;
var pST_SR_RTTINC_expiration = 0.0;
var pST_SR_ALMS_expiration = 0.0;
 function _reset ()
 {
  _cp15_reset();
  wordView[(0x0040) >> 2] = (0x13) | (1 << 7) | (1 << 6);
  _setRegister((15),0x0);
 }
 function _getPC ()
 {
  return ((wordView[(15)])|0);
 }
 function _setPC (value)
 {
  value = value|0;
  wordView[(15)] = value;
 }
 function _getRegister (reg)
 {
  reg = reg|0;
  var value = 0, pcoffset = 0;
  value = ((wordView[reg << 2 >> 2])|0);
  pcoffset = ((reg + 1) >> 2) & 0x04;
  return ((value + pcoffset)|0);
 }
 function _setRegister (reg, value)
 {
  reg = reg|0;
  value = value|0;
  wordView[reg << 2 >> 2] = value;
 }
 function _getCPSR ()
 {
  return ((wordView[(0x0040) >> 2])|0);
 }
 function _setCPSR (value)
 {
  value = value|0;
  var oldMode = 0;
  var newMode = 0;
  oldMode = (_getCPSR()|0) & (0x1F);
  newMode = value & (0x1F);
  wordView[(0x0040) >> 2] = value;
  if (((oldMode)|0) != ((newMode)|0))
   _switchWorkingSet (oldMode, newMode);
 }
 function _getSPSR ()
 {
  return ((wordView[(0x0044) >> 2])|0);
 }
 function _setSPSR (value)
 {
  value = value|0;
  wordView[(0x0044) >> 2] = value;
 }
 function _switchWorkingSet (oldMode, newMode)
 {
  oldMode = oldMode|0;
  newMode = newMode|0;
  var oldG1 = 0;
  var oldG2 = 0;
  var newG1 = 0;
  var newG2 = 0;
  var base = 0;
  switch (((oldMode)|0))
  {
   case (0x10):
   case (0x1f): oldG1 = 0; break;
   case (0x13): oldG1 = 1; break;
   case (0x17): oldG1 = 2; break;
   case (0x1b): oldG1 = 3; break;
   case (0x12): oldG1 = 4; break;
   case (0x11): oldG1 = 5; oldG2 = 1; break;
   default: bail (32895017);
  }
  switch (((newMode)|0))
  {
   case (0x10):
   case (0x1f): newG1 = 0; break;
   case (0x13): newG1 = 1; break;
   case (0x17): newG1 = 2; break;
   case (0x1b): newG1 = 3; break;
   case (0x12): newG1 = 4; break;
   case (0x11): newG1 = 5; newG2 = 1; break;
   default: bail (32895018);
  }
  if (((oldG1)|0) != ((newG1)|0))
  {
   base = (((0x0050) + (oldG1 << (4)))|0);
   wordView[(base + 0) >> 2] = (_getRegister((13))|0);
   wordView[(base + 4) >> 2] = (_getRegister((14))|0);
   wordView[(base + 8) >> 2] = wordView[(0x0044) >> 2];
   base = (((0x0050) + (newG1 << (4)))|0);
   _setRegister((13),((wordView[(base + 0) >> 2])|0));
   _setRegister((14),((wordView[(base + 4) >> 2])|0));
   wordView[(0x0044) >> 2] = wordView[(base + 8) >> 2];
  }
  if (((oldG2)|0) != ((newG2)|0))
   bail (310184);
 }
 function _isPrivileged ()
 {
  return ((((_getCPSR()|0) & (0x1F)) != (0x10))|0);
 }
 function _memoryAddressToHeapOffset (addr)
 {
  addr = addr|0;
  return ((addr - memoryOffset + 4096)|0);
 }
 function _triggerException (mode)
 {
  mode = mode|0;
  var cpsr = 0;
  var spsr = 0;
  var tgt = 0;
  cpsr = (_getCPSR()|0);
  spsr = cpsr;
  switch (((mode)|0))
  {
   case (0x12):
    cpsr = cpsr & ~((0x1F) | (1 << 5)) | (mode | (1 << 7));
    tgt = 0x18;
    break;
   case (0x17):
    cpsr = cpsr & ~((0x1F) | (1 << 5)) | (mode | (1 << 7));
    tgt = 0x10;
    break;
   default:
    bail (2904175);
    break;
  }
  tgt = tgt | ((cp15_SCTLR & (1 << 13)) ? 0xFFFF0000 : 0);
  _setCPSR(cpsr);
  _setSPSR(spsr);
  _setRegister((14),(((_getPC()|0) + 4)|0));
  _setRegister((15),tgt);
 }
 function _run (numInstructions)
 {
  numInstructions = numInstructions|0;
  var pc = 0;
  var inst = 0;
  var stat = 0;
  for (;numInstructions; numInstructions = ((numInstructions - 1)|0))
  {
   if ((tickCount & 0xFF) == 0)
    _irqPoll();
   tickCount = ((tickCount + 1)|0);
   pc = (_getPC()|0);
   _setPC(((pc + 4)|0));
   inst = (_readWord(pc,(1 << 2))|0);
   if (memoryError)
    bail (12980);
   stat = (_execute(inst)|0);
   switch (((stat)|0))
   {
    case (0):
     break;
    case (1):
     _triggerException((0x17));
     break;
    default:
     bail (13515);
     break;
   }
  }
 }
 function _execute (inst)
 {
  inst = inst|0;
  var cpsr = 0;
  var condflag = 0;
  cpsr = (_getCPSR()|0);
  switch ((inst >>> 28) & 0x0F)
  {
   case 0: condflag = cpsr & (1 << 30); break;
   case 1: condflag = ~cpsr & (1 << 30); break;
   case 2: condflag = cpsr & (1 << 29); break;
   case 3: condflag = ~cpsr & (1 << 29); break;
   case 4: condflag = cpsr & (1 << 31) ; break;
   case 5: condflag = ~cpsr & (1 << 31); break;
   case 6: condflag = cpsr & (1 << 28) ; break;
   case 7: condflag = ~cpsr & (1 << 28); break;
   case 8: condflag = (~cpsr & (cpsr << 1)) & (1 << 30); break;
   case 9: condflag = ( cpsr | ~(cpsr << 1)) & (1 << 30); break;
   case 10: condflag = ~(cpsr ^ (cpsr << 3)) & (1 << 31); break;
   case 11: condflag = (cpsr ^ (cpsr << 3)) & (1 << 31); break;
   case 12: condflag = ((~cpsr << 1) & ~(cpsr ^ (cpsr << 3))) & (1 << 31); break;
   case 13: condflag = (( cpsr << 1) | (cpsr ^ (cpsr << 3))) & (1 << 31); break;
   case 14: condflag = 1; break;
   case 15: return (2);
  }
  if (condflag)
   return (_subexecute(inst)|0);
  else
   return (0);
  return (0);
 }
function _readWordPhysical (addr)
{
 addr = addr|0;
 var offset = 0;
 if ((addr & 0x03) != 0)
 {
  log ((0), 2136, (1), ((addr)|0));
  bail (2136);
 }
 offset = (_memoryAddressToHeapOffset(addr)|0);
 if (((offset)>>>0) >= ((memorySize)>>>0))
  return (((_readWordPeripheral(addr)|0))|0);
 memoryError = (0);
 return ((wordView[offset >> 2])|0);
}
function _writeWordPhysical (addr, value)
{
 addr = addr|0;
 value = value|0;
 var offset = 0;
 if ((addr & 0x03) != 0)
 {
  log ((0), 2137, (1), ((addr)|0));
  bail (2137);
 }
 offset = (_memoryAddressToHeapOffset(addr)|0);
 if (((offset)>>>0) >= ((memorySize)>>>0))
 {
  _writeWordPeripheral(addr,value);
  return;
 }
 memoryError = (0);
 wordView[offset >> 2] = value;
}
function _readBytePhysical (addr)
{
 addr = addr|0;
 var offset = 0;
 offset = (_memoryAddressToHeapOffset(addr)|0);
 if (((offset)>>>0) >= ((memorySize)>>>0))
  return (((_readWordPeripheral(addr)|0) & 0xFF)|0);
 memoryError = (0);
 return ((byteView[needSwap ? offset ^ 3 : offset] & 0xFF)|0);
}
function _writeBytePhysical (addr, value)
{
 addr = addr|0;
 value = value|0;
 var offset = 0;
 offset = (_memoryAddressToHeapOffset(addr)|0);
 if (((offset)>>>0) >= ((memorySize)>>>0))
 {
  _writeWordPeripheral(addr,value & 0xFF);
  return;
 }
 memoryError = (0);
 byteView[needSwap ? offset ^ 3 : offset] = value & 0xFF;
}
function _readWord (addr, flags)
{
 addr = addr|0;
 flags = flags|0;
 if (cp15_SCTLR & (1 << 0))
 {
  addr = (_translateAddress(addr,flags | (1 << 0))|0);
  if (memoryError)
   return 0;
 }
 return (_readWordPhysical(addr)|0);
}
function _writeWord (addr, value, flags)
{
 addr = addr|0;
 value = value|0;
 flags = flags|0;
 if (cp15_SCTLR & (1 << 0))
 {
  addr = (_translateAddress(addr,flags | (1 << 1))|0);
  if (memoryError)
   return;
 }
 _writeWordPhysical(addr,value);
}
function _readByte (addr, flags)
{
 addr = addr|0;
 flags = flags|0;
 if (cp15_SCTLR & (1 << 0))
 {
  addr = (_translateAddress(addr,flags | (1 << 0))|0);
  if (memoryError)
   return 0;
 }
 return (_readBytePhysical(addr)|0);
}
function _writeByte (addr, value, flags)
{
 addr = addr|0;
 value = value|0;
 flags = flags|0;
 if (cp15_SCTLR & (1 << 0))
 {
  addr = (_translateAddress(addr,flags | (1 << 1))|0);
  if (memoryError)
   return;
 }
 _writeBytePhysical(addr,value);
}
function _translateAddress (vaddr, trflags)
{
 vaddr = vaddr|0;
 trflags = trflags|0;
 var desc1 = 0;
 var desc2 = 0;
 var ap = 0;
 var domain = 0;
 var permitted = 0;
 var paddr = -1;
 var privileged = 0;
 if (!(trflags & (1 << 3)))
  privileged = !!(_isPrivileged()|0);
 desc1 = (_readWordPhysical((cp15_TTBR0 & 0xFFFFC000) | (vaddr >> 18 & 0x3FFC))|0);
 if (memoryError)
 {
  memoryError = (1);
  cp15_FSR = 0x0C;
  cp15_FAR = vaddr;
  return 0;
 }
 switch ((desc1 & 3))
 {
  case 0:
   memoryError = (1);
   cp15_FSR = 0x05;
   cp15_FAR = vaddr;
   return 0;
  case 1:
   desc2 = (_readWordPhysical((desc1 & 0xFFFFFC00) | (vaddr >> 10 & 0x03FC))|0);
   if (memoryError)
   {
    memoryError = (1);
    cp15_FSR = 0x0E | (domain << 4);
    cp15_FAR = vaddr;
    return 0;
   }
   switch (desc2 & 3)
   {
    case 0:
     memoryError = (1);
     cp15_FSR = 0x07 | (domain << 4);
     cp15_FAR = vaddr;
     return 0;
    case 2:
     ap = desc2 >> ((vaddr >> 9 & 6) + 4) & 3;
     paddr = (desc2 & 0xFFFFF000) | (vaddr & 0x0FFF);
     break;
    default:
     bail (13840193);
   }
   break;
  case 2:
   ap = (desc1 >> 10) & 0x03;
   paddr = (desc1 & 0xFFF00000) | (vaddr & 0x000FFFFF);
   break;
  default:
   bail (2389032);
   return 0;
 }
 domain = desc1 >> 5 & 0x0F;
 switch (cp15_DACR >> (domain << 1) & 0x03)
 {
  case 0:
   memoryError = (1);
   cp15_FSR = ((desc1 & 3) == 2 ? 0x9 : 0xB) | (domain << 4);
   cp15_FAR = vaddr;
   return 0;
  case 1:
   switch (((ap)|0))
   {
    case 0:
     switch (cp15_SCTLR >> 8 & 0x03)
     {
      case 1:
       permitted = !(trflags & (1 << 1)) & privileged;
       break;
      case 2:
       permitted = !(trflags & (1 << 1));
       break;
     }
     break;
    case 1:
     permitted = privileged;
     break;
    case 2:
     permitted = !(trflags & (1 << 1)) | privileged;
     break;
    case 3:
     permitted = 1;
     break;
   }
   if (!permitted)
    bail (1231809);
   break;
  case 2:
   bail (432159);
   return 0;
  case 3:
   break;
 }
 memoryError = (0);
 return ((paddr)|0);
}
       
function _subexecute (inst)
{
 inst = inst|0;
 var dbits = 0;
 dbits = (inst >> 16 & 0x0FF0) | (inst >> 4 & 0x0F);
 return ((_subexecute_table[dbits & 0x0FFF](inst))|0);
}
function _subexecute_B (inst)
{
 inst = inst|0;
 return (_inst_B((inst << 8) >> 6)|0);
}
function _subexecute_BL (inst)
{
 inst = inst|0;
 return (_inst_BL((inst << 8) >> 6)|0);
}
function _subexecute_BX (inst)
{
 inst = inst|0;
 { if (!((inst >> 16 & 0x0F) == 15)) { bail (12343); return (2); } };
 { if (!((inst >> 12 & 0x0F) == 15)) { bail (12343); return (2); } };
 { if (!((inst >> 8 & 0x0F) == 15)) { bail (12343); return (2); } };
 return (_inst_BX((inst >> 0 & 0x0F))|0);
}
function _subexecute_DATA_imm (inst)
{
 inst = inst|0;
 var opcode = 0;
 opcode = inst >> 21 & 0x0F;
 do { if ((((opcode)|0) == 13) | (((opcode)|0) == 15)) { if (!((inst >> 16 & 0x0F) == 0)) { bail (12343); return (2); } }; if ((((opcode)|0) >= 8) & (((opcode)|0) < 12)) { if (!((inst >> 12 & 0x0F) == 0)) { bail (12343); return (2); } }; } while (0);
 return (_inst_DATA(opcode, (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), ((-1 << 24) | (inst & 0xFF)), ((-1 << 24) | (inst >> 7 & 0x1E)), (3), inst & (1 << 20))|0);
}
function _subexecute_DATA_reg_imm (inst)
{
 inst = inst|0;
 var opcode = 0;
 var shift_type = 0;
 var shift_imm = 0;
 opcode = inst >> 21 & 0x0F;
 do { if ((((opcode)|0) == 13) | (((opcode)|0) == 15)) { if (!((inst >> 16 & 0x0F) == 0)) { bail (12343); return (2); } }; if ((((opcode)|0) >= 8) & (((opcode)|0) < 12)) { if (!((inst >> 12 & 0x0F) == 0)) { bail (12343); return (2); } }; } while (0);
 shift_type = (inst >> 5) & 0x03;
 shift_imm = (inst >> 7) & 0x1F;
 switch (((shift_type)|0))
 {
  case (1):
  case (2):
   if (((shift_imm)|0) == 0)
    shift_imm = 32;
   break;
  case (3):
   if (((shift_imm)|0) == 0)
    shift_type = (4);
   break;
 }
 return (_inst_DATA(opcode, (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), (((inst >> 0 & 0x0F)) << 24), ((-1 << 24) | (shift_imm)), shift_type, inst & (1 << 20))|0);
}
function _subexecute_DATA_reg_reg (inst)
{
 inst = inst|0;
 var opcode = 0;
 opcode = inst >> 21 & 0x0F;
 do { if ((((opcode)|0) == 13) | (((opcode)|0) == 15)) { if (!((inst >> 16 & 0x0F) == 0)) { bail (12343); return (2); } }; if ((((opcode)|0) >= 8) & (((opcode)|0) < 12)) { if (!((inst >> 12 & 0x0F) == 0)) { bail (12343); return (2); } }; } while (0);
 return (_inst_DATA(opcode, (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), (((inst >> 0 & 0x0F)) << 24), (((inst >> 8 & 0x0F)) << 24), (inst >> 5) & 0x03, inst & (1 << 20))|0);
}
function _subexecute_MUL_MLA (inst)
{
 inst = inst|0;
 if (!(inst & (1 << 21)))
  { if (!((inst >> 12 & 0x0F) == 0)) { bail (12343); return (2); } };
 return (_inst_MUL_MLA(inst & (1 << 21), (inst >> 16 & 0x0F), (inst >> 0 & 0x0F), (inst >> 8 & 0x0F), (inst >> 12 & 0x0F), inst & (1 << 20))|0);
}
function _subexecute_SMULL_SMLAL_UMULL_UMLAL (inst)
{
 inst = inst|0;
 return (_inst_SMULL_SMLAL_UMULL_UMLAL(inst & (1 << 22), inst & (1 << 21), (inst >> 16 & 0x0F), (inst >> 12 & 0x0F), (inst >> 0 & 0x0F), (inst >> 8 & 0x0F), inst & (1 << 20))|0);
}
function _subexecute_MRS (inst)
{
 inst = inst|0;
 { if (!((inst >> 0 & 0x0F) == 0)) { bail (12343); return (2); } };
 { if (!((inst >> 8 & 0x0F) == 0)) { bail (12343); return (2); } };
 { if (!((inst >> 16 & 0x0F) == 15)) { bail (12343); return (2); } };
 return (_inst_MRS((inst >> 12 & 0x0F), inst & (1 << 22))|0);
}
function _subexecute_MSR_imm (inst)
{
 inst = inst|0;
 { if (!((inst >> 12 & 0x0F) == 15)) { bail (12343); return (2); } };
 return (_inst_MSR(((-1 << 24) | (inst & 0xFF)), (inst >> 8 & 0x0F) << 1, inst & (1 << 22), (inst >> 16 & 0x0F))|0);
}
function _subexecute_MSR_reg (inst)
{
 inst = inst|0;
 { if (!((inst >> 12 & 0x0F) == 15)) { bail (12343); return (2); } };
 { if (!((inst >> 8 & 0x0F) == 0)) { bail (12343); return (2); } };
 return (_inst_MSR((((inst >> 0 & 0x0F)) << 24), 0, inst & (1 << 22), (inst >> 16 & 0x0F))|0);
}
function _subexecute_LDR_STR_LDRB_STRB_imm (inst)
{
 inst = inst|0;
 return (_inst_LDR_STR_LDRB_STRB(inst & (1 << 20), inst & (1 << 22), (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), ((-1 << 24) | (inst & 0x0FFF)), 0, 0, inst & (1 << 24), inst & (1 << 23), inst & (1 << 21))|0);
}
function _subexecute_LDR_STR_LDRB_STRB_reg (inst)
{
 inst = inst|0;
 var shift_type = 0;
 var shift_amount = 0;
 shift_type = (inst >> 5) & 0x03;
 shift_amount = (inst >> 7) & 0x1F;
 switch (((shift_type)|0))
 {
  case (1):
  case (2):
   if (((shift_amount)|0) == 0)
    shift_amount = 32;
   break;
  case (3):
   if (((shift_amount)|0) == 0)
    shift_type = (4);
   break;
 }
 return (_inst_LDR_STR_LDRB_STRB(inst & (1 << 20), inst & (1 << 22), (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), (((inst >> 0 & 0x0F)) << 24), shift_type, shift_amount, inst & (1 << 24), inst & (1 << 23), inst & (1 << 21))|0);
}
function _subexecute_LDR_STR_misc_imm (inst)
{
 inst = inst|0;
 return (_inst_LDR_STR_misc((inst >> 18 & 0x4) | (inst >> 5 & 0x3), (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), ((-1 << 24) | (((inst >> 8 & 0x0F) << 4) | (inst >> 0 & 0x0F))), inst & (1 << 24), inst & (1 << 23), inst & (1 << 21))|0);
}
function _subexecute_LDR_STR_misc_reg (inst)
{
 inst = inst|0;
 { if (!((inst >> 8 & 0x0F) == 0)) { bail (12343); return (2); } };
 return (_inst_LDR_STR_misc((inst >> 18 & 0x4) | (inst >> 5 & 0x3), (inst >> 12 & 0x0F), (inst >> 16 & 0x0F), (((inst >> 0 & 0x0F)) << 24), inst & (1 << 24), inst & (1 << 23), inst & (1 << 21))|0);
}
function _subexecute_LDM_STM (inst)
{
 inst = inst|0;
 return (_inst_LDM_STM(inst & (1 << 20), (inst >> 16 & 0x0F), inst & 0xFFFF, (inst >> 23) & 0x3, inst & (1 << 21), 0)|0);
}
function _subexecute_LDM_STM_privileged (inst)
{
 inst = inst|0;
 if ((inst & 0x108000) == 0x108000)
 {
  return (_inst_LDM_STM(inst & (1 << 20), (inst >> 16 & 0x0F), inst & 0xFFFF, (inst >> 23) & 0x3, inst & (1 << 21), 1)|0);
 }
 bail (724190);
 return 0;
}
function _subexecute_SWP_SWPB (inst)
{
 inst = inst|0;
 { if (!((inst >> 8 & 0x0F) == 0)) { bail (12343); return (2); } };
 return (_inst_SWP_SWPB(inst & (1 << 22), (inst >> 12 & 0x0F), (inst >> 0 & 0x0F), (inst >> 16 & 0x0F))|0);
}
function _subexecute_SVC (inst)
{
 inst = inst|0;
 return (_inst_SVC(inst & 0xFFFFFF)|0);
}
function _subexecute_MCR (inst)
{
 inst = inst|0;
 return (_inst_MCR((inst >> 12 & 0x0F), (inst >> 8 & 0x0F), (inst >> 16 & 0x0F), inst >> 21 & 7, (inst >> 0 & 0x0F), inst >> 5 & 7)|0);
}
function _subexecute_MRC (inst)
{
 inst = inst|0;
 return (_inst_MRC((inst >> 12 & 0x0F), (inst >> 8 & 0x0F), (inst >> 16 & 0x0F), inst >> 21 & 7, (inst >> 0 & 0x0F), inst >> 5 & 7)|0);
}
function _subexecute_UND (inst)
{
 inst = inst|0;
 log ((0), 1234321, (1), (((_getPC()|0) - 4)|0), (1), ((inst)|0));
 bail (1234321);
 return (2);
}
function _inst_B (offset)
{
 offset = offset|0;
 _setPC((((_getRegister((15))|0) + offset)|0));
 return (0);
}
function _inst_BL (offset)
{
 offset = offset|0;
 _setRegister((14),(_getPC()|0));
 _setPC((((_getRegister((15))|0) + offset)|0));
 return (0);
}
function _inst_BX (Rm)
{
 Rm = Rm|0;
 var target = 0;
 target = (_getRegister(Rm)|0);
 if (target & 1)
  bail (2837103);
 _setPC(target & ~1);
 return (0);
}
function _inst_DATA (opcode, Rd, Rn, immreg, shift_immreg, shift_type, S)
{
 opcode = opcode|0;
 Rd = Rd|0;
 Rn = Rn|0;
 immreg = immreg|0;
 shift_immreg = shift_immreg|0;
 shift_type = shift_type|0;
 S = S|0;
 var base = 0;
 var operand = 0;
 var shift_operand = 0;
 var cpsr = 0;
 var carry = 0;
 var result = 0;
 base = (_getRegister(Rn)|0);
 operand = (((immreg)|0) < 0 ? (immreg) & 0xFFFFFF : (_getRegister(immreg >> 24)|0));
 shift_operand = (((shift_immreg)|0) < 0 ? (shift_immreg) & 0xFFFFFF : (_getRegister(shift_immreg >> 24)|0)) & 0xFF;
 cpsr = (_getCPSR()|0);
 carry = cpsr & (1 << 29);
 switch (((shift_type)|0))
 {
  case (0):
   if (((shift_operand)|0) != 0)
   {
    if (((shift_operand)|0) < 32)
    {
     operand = operand << (shift_operand - 1);
     carry = operand & (1 << 31);
     operand = operand << 1;
    }
    else if (((shift_operand)|0) == 32)
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
  case (1):
   if (((shift_operand)|0) != 0)
   {
    if (((shift_operand)|0) < 32)
    {
     operand = operand >>> (shift_operand - 1);
     carry = operand & 1;
     operand = operand >>> 1;
    }
    else if (((shift_operand)|0) == 32)
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
  case (2):
   if (((shift_operand)|0) != 0)
   {
    if (((shift_operand)|0) < 32)
    {
     operand = operand >> (shift_operand - 1);
     carry = operand & 1;
     operand = operand >> 1;
    }
    else
    {
     carry = operand & (1 << 31);
     operand = operand >> 31;
    }
   }
   break;
  case (3):
   if (((shift_operand)|0) != 0)
   {
    if ((shift_operand & 0x1F) != 0)
     operand = ( ((operand)>>>(shift_operand & 0x1F)) | ((operand)<<(32-(shift_operand & 0x1F))) );
    carry = operand & (1 << 31);
   }
   break;
  case (4):
   carry = operand & 1;
   operand = (cpsr & (1 << 29) << 2) | (operand >>> 1);
   break;
  default:
   bail (7536244);
   break;
 }
 switch (((opcode)|0))
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
   result = ((base - operand)|0);
   break;
  case 3:
   result = ((operand - base)|0);
   break;
  case 4:
  case 11:
   result = ((base + operand)|0);
   break;
  case 5:
   result = ((base + operand + (cpsr >> 29 & 0x01))|0);
   break;
  case 6:
   result = ((base - operand - (~cpsr >> 29 & 0x01))|0);
   break;
  case 7:
   result = ((operand - base - (~cpsr >> 29 & 0x01))|0);
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
  _setRegister(Rd,result);
 if (S)
 {
  if (((Rd)|0) == (15))
  {
   _setCPSR((_getSPSR()|0));
  }
  else
  {
   cpsr = (_getCPSR()|0);
   switch (((opcode)|0))
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
      ((((result)|0) == 0) << 30) |
      (!!carry << 29);
     break;
    case 2:
    case 6:
    case 10:
     cpsr =
      (cpsr & 0x0FFFFFFF) |
      (result & (1 << 31)) |
      ((((result)|0) == 0) << 30) |
      (((base | ~operand) & (~operand | ~result) & (~result | base)) >> 2) & (1 << 29) |
      (((base ^ operand) & (base ^ result)) >> 3) & (1 << 28);
     break;
    case 3:
     cpsr =
      (cpsr & 0x0FFFFFFF) |
      (result & (1 << 31)) |
      ((((result)|0) == 0) << 30) |
      (((operand | ~base) & (~base | ~result) & (~result | operand)) >> 2) & (1 << 29) |
      (((operand ^ base) & (operand ^ result)) >> 3) & (1 << 28);
     break;
    case 4:
    case 5:
    case 11:
     cpsr =
      (cpsr & 0x0FFFFFFF) |
      (result & (1 << 31)) |
      ((((result)|0) == 0) << 30) |
      (((base & operand) | (operand & ~result) | (~result & base)) >> 2) & (1 << 29) |
      (((base ^ result) & (operand ^ result)) >> 3) & (1 << 28);
     break;
    default:
     bail (212313);
     break;
   }
   _setCPSR(cpsr);
  }
 }
 return (0);
}
function _inst_MUL_MLA (A, Rd, Rm, Rs, Rn, S)
{
 A = A|0;
 Rd = Rd|0;
 Rm = Rm|0;
 Rs = Rs|0;
 Rn = Rn|0;
 S = S|0;
 var result = 0;
 result = (_imul((_getRegister(Rm)|0),(_getRegister(Rs)|0))|0);
 if (A)
  result = ((result + (_getRegister(Rn)|0))|0);
 _setRegister(Rd,result);
 if (S)
 {
  _setCPSR(((_getCPSR()|0) & 0x3FFFFFFF) | (result & (1 << 31)) | ((((result)|0) == 0) << 30));
 }
 return (0);
}
function _inst_SMULL_SMLAL_UMULL_UMLAL (signed, A, RdHi, RdLo, Rm, Rs, S)
{
 signed = signed|0;
 A = A|0;
 RdHi = RdHi|0;
 RdLo = RdLo|0;
 Rm = Rm|0;
 Rs = Rs|0;
 S = S|0;
 var alo = 0;
 var ahi = 0;
 var blo = 0;
 var bhi = 0;
 var rlo = 0;
 var rhi = 0;
 var rtm = 0;
 var clo = 0;
 var chi = 0;
 alo = (_getRegister(Rm)|0);
 ahi = alo >>> 16;
 alo = alo & 0xFFFF;
 blo = (_getRegister(Rs)|0);
 bhi = blo >>> 16;
 blo = blo & 0xFFFF;
 if (signed)
 {
  ahi = ahi ^ (1 << 15);
  bhi = bhi ^ (1 << 15);
 }
 rlo = (_imul(alo,blo)|0);
 rhi = (_imul(ahi,bhi)|0);
 rtm = (_imul(ahi,blo)|0);
 rhi = ((rhi + (rtm >>> 16))|0);
 rtm = rtm << 16;
 rlo = ((rlo + rtm)|0);
 rhi = ((rhi + (((rlo)>>>0) < ((rtm)>>>0)))|0);
 rtm = (_imul(alo,bhi)|0);
 rhi = ((rhi + (rtm >>> 16))|0);
 rtm = rtm << 16;
 rlo = ((rlo + rtm)|0);
 rhi = ((rhi + (((rlo)>>>0) < ((rtm)>>>0)))|0);
 if (signed)
 {
  rhi = ((rhi - (1 << 30))|0);
  if ((alo ^ blo) & 1)
  {
   rlo = rlo ^ (1 << 31);
   if (rlo & (1 << 31))
    rhi = ((rhi - 1)|0);
  }
  rhi = ((rhi - ((alo + blo) >>> 1))|0);
  rhi = ((rhi - ((ahi + bhi) << 15))|0);
  rhi = rhi ^ (1 << 31);
 }
 if (A)
 {
  clo = (_getRegister(RdLo)|0);
  chi = (_getRegister(RdHi)|0);
  rlo = ((rlo + clo)|0);
  rhi = ((rhi + chi + (((rlo)>>>0) < ((clo)>>>0)))|0);
 }
 _setRegister(RdLo,rlo);
 _setRegister(RdHi,rhi);
 if (S)
 {
  _setCPSR(((_getCPSR()|0) & 0x3FFFFFFF) | (rhi & (1 << 31)) | (((rhi | rlo) == 0) << 30));
 }
 return (0);
}
function _inst_MRS (Rd, R)
{
 Rd = Rd|0;
 R = R|0;
 _setRegister(Rd,R ? (_getSPSR()|0) : (_getCPSR()|0));
 return (0);
}
function _inst_MSR (immreg, rotamt, R, field_mask)
{
 immreg = immreg|0;
 rotamt = rotamt|0;
 R = R|0;
 field_mask = field_mask|0;
 var operand = 0;
 var mask = 0;
 operand = (((immreg)|0) < 0 ? (immreg) & 0xFFFFFF : (_getRegister(immreg >> 24)|0));
 operand = ( ((operand)>>>(rotamt)) | ((operand)<<(32-(rotamt))) );
 mask =
  ((field_mask & 1) ? 0x000000FF : 0) |
  ((field_mask & 2) ? 0x0000FF00 : 0) |
  ((field_mask & 4) ? 0x00FF0000 : 0) |
  ((field_mask & 8) ? 0xFF000000 : 0);
 if (R)
 {
  mask = mask & (0xF0000000 | 0x000000DF | 0x0);
  _setSPSR(((_getSPSR()|0) & ~mask) | (operand & mask));
 }
 else
 {
  if ((_isPrivileged()|0))
   mask = mask & (0xF0000000 | 0x000000DF);
  else
   mask = mask & 0xF0000000;
  _setCPSR(((_getCPSR()|0) & ~mask) | (operand & mask));
 }
 return (0);
}
function _inst_LDR_STR_LDRB_STRB (L, B, Rd, Rn, offset_immreg,
 shift_type, shift_amount, P, U, W)
{
 L = L|0;
 B = B|0;
 Rd = Rd|0;
 Rn = Rn|0;
 offset_immreg = offset_immreg|0;
 shift_type = shift_type|0;
 shift_amount = shift_amount|0;
 P = P|0;
 U = U|0;
 W = W|0;
 var offset = 0;
 var address = 0;
 var wbaddress = 0;
 var value = 0;
 var flags = 0;
 offset = (((offset_immreg)|0) < 0 ? (offset_immreg) & 0xFFFFFF : (_getRegister(offset_immreg >> 24)|0));
 switch (((shift_type)|0))
 {
  case (0):
   offset = offset << shift_amount;
   break;
  case (1):
   if (((shift_amount)|0) < 32)
    offset = offset >>> shift_amount;
   else
    offset = 0;
   break;
  case (2):
   if (((shift_amount)|0) < 32)
    offset = offset >> shift_amount;
   else
    offset = offset >> 31;
   break;
  default:
   bail (2851087);
   break;
 }
 address = (_getRegister(Rn)|0);
 if (U)
  wbaddress = ((address + offset)|0);
 else
  wbaddress = ((address - offset)|0);
 if (P)
  address = wbaddress;
 if (!B)
  if (address & 3)
   bail (9028649);
 if (!P & !!W)
  flags = flags | (1 << 3);
 if (L)
 {
  if (B)
   value = (_readByte(address,flags)|0) & 0xFF;
  else
   value = (_readWord(address,flags)|0);
  if (memoryError)
   return (1);
  _setRegister(Rd,((Rd)|0) == (15) ? value & ~3 : value);
 }
 else
 {
  value = (_getRegister(Rd)|0);
  if (B)
   _writeByte(address,value & 0xFF,flags);
  else
   _writeWord(address,value,flags);
  if (memoryError)
   return (1);
 }
 if (!P | W)
  _setRegister(Rn,wbaddress);
 return (0);
}
function _inst_LDR_STR_misc (LSH, Rd, Rn, offset_immreg, P, U, W)
{
 LSH = LSH|0;
 Rd = Rd|0;
 Rn = Rn|0;
 offset_immreg = offset_immreg|0;
 P = P|0;
 U = U|0;
 W = W|0;
 var offset = 0;
 var address = 0;
 var wbaddress = 0;
 var value = 0;
 offset = (((offset_immreg)|0) < 0 ? (offset_immreg) & 0xFFFFFF : (_getRegister(offset_immreg >> 24)|0));
 address = (_getRegister(Rn)|0);
 if (U)
  wbaddress = ((address + offset)|0);
 else
  wbaddress = ((address - offset)|0);
 if (P | W)
  address = wbaddress;
 switch (((LSH)|0))
 {
  case 1:
   if (address & 1)
    bail (392849);
   value = (_getRegister(Rd)|0);
   _writeByte(address,value & 0xFF,0);
   if (memoryError)
    bail (2384092);
   _writeByte(((address + 1)|0),value >> 8 & 0xFF,0);
   if (memoryError)
    bail (2384093);
   break;
  case 5:
  case 7:
   if (address & 1)
    bail (392850);
   value = (_readByte(address,0)|0);
   if (memoryError)
    bail (3465131);
   value = value | ((_readByte(((address + 1)|0),0)|0) << 8);
   if (memoryError)
    bail (3465132);
   if (LSH & 0x2)
    _setRegister(Rd,(value << 16) >> 16);
   else
    _setRegister(Rd,value);
   break;
  case 6:
   value = (_readByte(address,0)|0);
   if (memoryError)
    bail (9082095);
   _setRegister(Rd,(value << 24) >> 24);
   break;
  default:
   log ((0), 189351, (2), ((LSH)|0));
   bail (189351);
   return (2);
 }
 if (((!!P)|0) == ((!!W)|0))
  _setRegister(Rn,wbaddress);
 return (0);
}
function _inst_LDM_STM (L, Rn, register_list, addressing_mode, W, S)
{
 L = L|0;
 Rn = Rn|0;
 register_list = register_list|0;
 addressing_mode = addressing_mode|0;
 W = W|0;
 S = S|0;
 var origBase = 0;
 var origPC = 0;
 var i = 0;
 var ptr = 0;
 var value = 0;
 origBase = (_getRegister(Rn)|0);
 origPC = (_getPC()|0);
 ptr = origBase;
 if (ptr & 0x03)
  bail (13451701);
 switch (((addressing_mode)|0))
 {
  case (3):
   ptr = ((ptr + 4)|0);
  case (1):
   for (i = 0; ((i)|0) < 16; i = ((i + 1)|0))
   {
    if (register_list & (1 << i))
    {
     if (L)
     {
      value = (_readWord(ptr,0)|0);
      if (memoryError)
       break;
      _setRegister(i,((i)|0) == (15) ? value & ~3 : value);
     }
     else
     {
      value = (_getRegister(i)|0);
      _writeWord(ptr,value,0);
      if (memoryError)
       break;
     }
     ptr = ((ptr + 4)|0);
    }
   }
   break;
  case (2):
   ptr = ((ptr - 4)|0);
  case (0):
   for (i = 15; ((i)|0) >= 0; i = ((i - 1)|0))
   {
    if (register_list & (1 << i))
    {
     if (L)
     {
      value = (_readWord(ptr,0)|0);
      if (memoryError)
       break;
      _setRegister(i,((i)|0) == (15) ? value & ~3 : value);
     }
     else
     {
      value = (_getRegister(i)|0);
      _writeWord(ptr,value,0);
      if (memoryError)
       break;
     }
     ptr = ((ptr - 4)|0);
    }
   }
   break;
  default:
   bail (3258718);
   break;
 }
 if (memoryError)
 {
  _setRegister(Rn,origBase);
  _setPC(origPC);
  bail (12982);
  return (1);
 }
 if (W)
 {
  switch (((addressing_mode)|0))
  {
   case (3):
    ptr = ((ptr - 4)|0);
    break;
   case (2):
    ptr = ((ptr + 4)|0);
    break;
  }
  _setRegister(Rn,ptr);
 }
 if (S)
 {
  _setCPSR((_getSPSR()|0));
 }
 return (0);
}
function _inst_SWP_SWPB (B, Rd, Rm, Rn)
{
 B = B|0;
 Rd = Rd|0;
 Rm = Rm|0;
 Rn = Rn|0;
 var base = 0;
 var toreg = 0;
 var tomem = 0;
 base = (_getRegister(Rn)|0);
 tomem = (_getRegister(Rm)|0);
 if (B)
  toreg = (_readByte(base,0)|0) & 0xFF;
 else
  toreg = (_readWord(base,0)|0);
 if (memoryError)
  bail (3283017);
 _setRegister(Rd,toreg);
 if (B)
  _writeByte(base,tomem & 0xFF,0);
 else
  _writeWord(base,tomem,0);
 if (memoryError)
  bail (4283019);
 return (0);
}
function _inst_SVC (imm)
{
 imm = imm|0;
 var base = 0;
 var chr = 0;
 if (((imm)|0) == 0x123456)
 {
  switch ((_getRegister((0))|0))
  {
   case 3:
    base = (_getRegister((1))|0);
    chr = (_readByte(base,0)|0);
    print (((chr)|0));
    return (0);
   case 4:
    base = (_getRegister((1))|0);
    while (1)
    {
     chr = (_readByte(base,0)|0);
     if (chr)
      print (((chr)|0));
     else
      break;
     base = ((base + 1)|0);
    }
    return (0);
  }
 }
 bail (1374190);
 return (2);
}
function _inst_MCR (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
{
 Rd = Rd|0;
 cp_num = cp_num|0;
 CRn = CRn|0;
 opcode_1 = opcode_1|0;
 CRm = CRm|0;
 opcode_2 = opcode_2|0;
 if (((cp_num)|0) == 15)
  return (_cp15_write(CRn, opcode_1, CRm, opcode_2, Rd)|0);
 bail (86414);
 return (2);
}
function _inst_MRC (Rd, cp_num, CRn, opcode_1, CRm, opcode_2)
{
 Rd = Rd|0;
 cp_num = cp_num|0;
 CRn = CRn|0;
 opcode_1 = opcode_1|0;
 CRm = CRm|0;
 opcode_2 = opcode_2|0;
 if (((cp_num)|0) == 15)
  return (_cp15_read(CRn, opcode_1, CRm, opcode_2, Rd)|0);
 bail (86415);
 return (2);
}
function _cp15_reset ()
{
 cp15_SCTLR = (0x00050072);
 cp15_DACR = 0;
 cp15_TTBR0 = 0;
 cp15_FSR = 0;
 cp15_FAR = 0;
}
function _cp15_read (CRn, opcode_1, CRm, opcode_2, Rd)
{
 CRn = CRn|0;
 opcode_1 = opcode_1|0;
 CRm = CRm|0;
 opcode_2 = opcode_2|0;
 Rd = Rd|0;
 switch (((CRn)|0))
 {
  case 0:
   if (((opcode_1)|0) == 0)
   {
    switch (CRm << 8 | opcode_2)
    {
     case 0x00:
      _setRegister(Rd,0x41129201);
      return (0);
    }
   }
   break;
  case 1:
   if (((opcode_1)|0) == 0)
   {
    switch (CRm << 8 | opcode_2)
    {
     case 0x00:
      _setRegister(Rd,cp15_SCTLR);
      return (0);
    }
   }
   break;
  case 5:
   if (((opcode_1)|0) == 0)
   {
    if ((CRm | opcode_2) == 0)
    {
     _setRegister(Rd,cp15_FSR);
     return (0);
    }
   }
   break;
  case 6:
   if (((opcode_1)|0) == 0)
   {
    if ((CRm | opcode_2) == 0)
    {
     _setRegister(Rd,cp15_FAR);
     return (0);
    }
   }
   break;
 }
 log (
  (0), 132,
  (2), ((CRn)|0),
  (2), ((opcode_1)|0),
  (2), ((CRm)|0),
  (2), ((opcode_2)|0)
 );
 bail (3384024);
 return (2);
}
function _cp15_write (CRn, opcode_1, CRm, opcode_2, Rd)
{
 CRn = CRn|0;
 opcode_1 = opcode_1|0;
 CRm = CRm|0;
 opcode_2 = opcode_2|0;
 Rd = Rd|0;
 var value = 0;
 value = (_getRegister(Rd)|0);
 switch (((CRn)|0))
 {
  case 1:
   if (((opcode_1)|0) == 0)
   {
    if ((CRm | opcode_2) == 0)
    {
     if ((value & (0xFFE0C480)) != (cp15_SCTLR & (0xFFE0C480)))
      bail (12085902);
     cp15_SCTLR = (cp15_SCTLR & ~(0x00002301)) |
      (value & (0x00002301));
     return (0);
    }
   }
   break;
  case 2:
   if (((opcode_1)|0) == 0)
   {
    if ((CRm | opcode_2) == 0)
    {
     cp15_TTBR0 = value;
     return (0);
    }
   }
   break;
  case 3:
   if (((opcode_1)|0) == 0)
   {
    if ((CRm | opcode_2) == 0)
    {
     cp15_DACR = value;
     return (0);
    }
   }
   break;
  case 7:
   if (((opcode_1)|0) == 0)
   {
    switch (CRm << 4 | opcode_2)
    {
     case 0x50:
      return (0);
     case 0x51:
      return (0);
     case 0x70:
      return (0);
     case 0xA1:
      return (0);
     case 0xA4:
      return (0);
     case 0xE1:
      return (0);
     case 0xE2:
      return (0);
    }
   }
   break;
  case 8:
   if (((opcode_1)|0) == 0)
   {
    switch (CRm << 4 | opcode_2)
    {
     case 0x50:
      return (0);
     case 0x60:
      return (0);
     case 0x70:
      return (0);
    }
   }
   break;
 }
 log (
  (0), 134,
  (2), ((CRn)|0),
  (2), ((opcode_1)|0),
  (2), ((CRm)|0),
  (2), ((opcode_2)|0)
 );
 bail (2384023);
 return (2);
}
function _irqTest (n, cond)
{
 n = n|0;
 cond = cond|0;
 if (!cond)
  return 0;
 if (((_pAICGetType (n))|0) != 2)
  bail (9055893);
 if (((_pAICGetPriority (n))|0) <= ((pAIC_priomask)|0))
  return 0;
 pAIC_IPR = pAIC_IPR | (1 << n);
 _triggerException((0x12));
 return 1;
}
function _irqPoll ()
{
 var now = 0.0;
 if ((_getCPSR()|0) & (1 << 7))
  return;
 now = (+_getMilliseconds());
 do { if (pAIC_IMR & (1 << 1)) if (pST_IMR & (1 << 0)) if (((_irqTest (1, now >= pST_SR_PITS_expiration))|0)) return; } while (0);
 do { if (pAIC_IMR & (1 << 1)) if (pST_IMR & (1 << 3)) if (((_irqTest (1, now >= pST_SR_ALMS_expiration))|0)) return; } while (0);
 if (pAIC_IMR & ~0x00000002)
  bail (1074011);
 if (pST_IMR & ~0x00000009)
  bail (5312453);
}
function _readWordPeripheral (addr)
{
 addr = addr|0;
 if ((addr >> 12) == ~0)
  return ((systemPeripheralRead[addr >> 8 & 0x0F](addr & 0x1FF))|0);
 else if (addr >> 19 == ~0)
  return ((userPeripheralRead[addr >> 14 & 0x1F](addr & 0x3FFF))|0);
 bail (1280799);
 return 0;
}
function _writeWordPeripheral (addr, value)
{
 addr = addr|0;
 value = value|0;
 if ((addr >> 12) == ~0)
 {
  systemPeripheralWrite[addr >> 8 & 0x0F](addr & 0x1FF, value);
  return;
 }
 else if (addr >> 19 == ~0)
 {
  userPeripheralWrite[addr >> 14 & 0x1F](addr & 0x3FFF, value);
  return;
 }
 bail (1893192);
}
function _undefinedPeripheralRead (offset)
{
 offset = offset|0;
 log ((0), 2130657, (1), ((offset)|0));
 bail (2130657);
 return 0;
}
function _undefinedPeripheralWrite (offset, value)
{
 offset = offset|0;
 value = value|0;
 log ((0), 2130668, (1), ((offset)|0));
 bail (2130668);
}
function _pAICStackPush (irq, prio)
{
 irq = irq|0;
 prio = prio|0;
 wordView[((0x0200) + (pAIC_stacksize << 2)) >> 2] = irq;
 wordView[((0x0220) + (pAIC_stacksize << 2)) >> 2] = prio;
 pAIC_stacksize = ((pAIC_stacksize + 1)|0);
}
function _pAICStackPop ()
{
 pAIC_stacksize = ((pAIC_stacksize - 1)|0);
}
function _pAICStackGetIRQ ()
{
 var index = 0;
 index = ((pAIC_stacksize - 1)|0);
 return ((wordView[((0x0200) + (index << 2)) >> 2])|0);
}
function _pAICStackGetPriority ()
{
 var index = 0;
 index = ((pAIC_stacksize - 1)|0);
 return ((wordView[((0x0220) + (index << 2)) >> 2])|0);
}
function _pAICGetPriority (n)
{
 n = n|0;
 return ((wordView[((0x0100) + (n << 2)) >> 2] & 0x07)|0);
}
function _pAICGetType (n)
{
 n = n|0;
 return ((wordView[((0x0100) + (n << 2)) >> 2] >> 5 & 0x03)|0);
}
function _pAICBegin ()
{
 var i = 0;
 var prio = -1;
 var irq = -1;
 var tprio = 0;
 for (i = 0; ((i)|0) < 32; i = ((i + 1)|0))
 {
  if (pAIC_IPR & pAIC_IMR & (1 << i))
  {
   tprio = ((_pAICGetPriority (i))|0);
   if (((tprio)|0) > ((prio)|0))
   {
    irq = i;
    prio = tprio;
   }
  }
 }
 if (((irq)|0) == -1)
  return ((pAIC_SPU)|0);
 if ((1 << irq) <= ((pAIC_priomask)|0))
  bail (5902831);
 pAIC_IPR = pAIC_IPR & ~(1 << irq);
 _pAICStackPush (irq, prio);
 pAIC_priomask = pAIC_priomask | (1 << prio);
 return ((wordView[((0x0180) + (irq << 2)) >> 2])|0);
}
function _pAICEnd ()
{
 var prio = 0;
 if (!pAIC_priomask)
  return;
 prio = ((_pAICStackGetPriority ())|0);
 pAIC_priomask = pAIC_priomask & ~(1 << prio);
 _pAICStackPop ();
}
function _pAICRead (offset)
{
 offset = offset|0;
 if ((offset & 0xFFFFFF83) == 0x00)
 {
  memoryError = (0);
  return ((wordView[((0x0100) + (offset & 0x7F)) >> 2])|0);
 }
 if ((offset & 0xFFFFFF83) == 0x80)
 {
  memoryError = (0);
  return ((wordView[((0x0180) + (offset & 0x7F)) >> 2])|0);
 }
 switch (((offset)|0))
 {
  case 0x100:
   memoryError = (0);
   return ((_pAICBegin ())|0);
  case 0x108:
   memoryError = (0);
   if (pAIC_priomask)
    return ((_pAICStackGetIRQ ())|0);
   else
    return 0;
 }
 log ((0), 3451124, (1), ((offset)|0));
 bail (3451124);
 return 0;
}
function _pAICWrite (offset, value)
{
 offset = offset|0;
 value = value|0;
 if ((offset & 0xFFFFFF83) == 0x00)
 {
  wordView[((0x0100) + (offset & 0x7F)) >> 2] = value & 0x67;
  memoryError = (0);
  return;
 }
 if ((offset & 0xFFFFFF83) == 0x80)
 {
  wordView[((0x0180) + (offset & 0x7F)) >> 2] = value;
  memoryError = (0);
  return;
 }
 switch (((offset)|0))
 {
  case 0x120:
   pAIC_IMR = pAIC_IMR | value;
   memoryError = (0);
   return;
  case 0x124:
   pAIC_IMR = pAIC_IMR & ~value;
   memoryError = (0);
   return;
  case 0x128:
   pAIC_IPR = pAIC_IPR & ~value;
   memoryError = (0);
   return;
  case 0x130:
   _pAICEnd ();
   memoryError = (0);
   return;
  case 0x134:
   pAIC_SPU = value;
   memoryError = (0);
   return;
  case 0x138:
   if (value)
    bail (154481);
   memoryError = (0);
   return;
 }
 log ((0), 3451122, (1), ((offset)|0));
 bail (3451122);
}
function _pDBGURead (offset)
{
 offset = offset|0;
 switch (((offset)|0))
 {
  case 0x40:
   memoryError = (0);
   return 0x09290781;
  case 0x44:
   memoryError = (0);
   return 0;
 }
 bail (19083921);
 return 0;
}
function _pPMCRead (offset)
{
 offset = offset|0;
 offset = offset & 0xFF;
 switch (((offset)|0))
 {
  case 0x24:
   memoryError = (0);
   return (1 << 16) | 512;
  case 0x28:
  case 0x2C:
   memoryError = (0);
   return 0x3F00;
  case 0x30:
   memoryError = (0);
   return 0x01;
 }
 bail (19083932);
 return 0;
}
function _pPMCWrite (offset, value)
{
 offset = offset|0;
 value = value|0;
 offset = offset & 0xFF;
 switch (((offset)|0))
 {
  case 0x00:
  case 0x04:
  case 0x10:
  case 0x14:
   memoryError = (0);
   return;
  case 0x28:
  case 0x2C:
   memoryError = (0);
   return;
 }
 log ((0), 9823127, (1), ((offset)|0));
 bail (9823127);
}
function _pSTUpdateCRTR ()
{
 var elapsedTicks = 0;
 elapsedTicks = ~~(((+_getMilliseconds()) - pST_CRTR_timestamp) / pST_RTMR_ticktime);
 if (((elapsedTicks)|0) > 0)
 {
  pST_CRTR = (pST_CRTR + elapsedTicks) & 0x0FFFFF;
  pST_CRTR_timestamp = pST_CRTR_timestamp + (+(((elapsedTicks)|0))) * pST_RTMR_ticktime;
 }
}
function _pSTUpdateALMS (force)
{
 force = force|0;
 var remainingTicks = 0;
 var newExpiration = 0.0;
 remainingTicks = (pST_RTAR - pST_CRTR) & 0x0FFFFF;
 if (((remainingTicks)|0) == 0)
  remainingTicks = 0x100000;
 newExpiration = pST_CRTR_timestamp + (+(((remainingTicks)|0))) * pST_RTMR_ticktime;
 if (force | (newExpiration < pST_SR_ALMS_expiration))
  pST_SR_ALMS_expiration = newExpiration;
}
function _pSTRead (offset)
{
 offset = offset|0;
 var ret = 0;
 var now = 0.0;
 var elapsed = 0.0;
 offset = offset & 0xFF;
 switch (((offset)|0))
 {
  case 0x10:
   now = (+_getMilliseconds());
   if (now >= pST_SR_PITS_expiration)
   {
    ret = ret | (1 << 0);
    elapsed = now - pST_PIMR_timestamp;
    pST_SR_PITS_expiration = pST_PIMR_timestamp + ((+_ceil(elapsed / pST_PIMR_period)) * pST_PIMR_period);
   }
   if (now >= pST_SR_RTTINC_expiration)
   {
    ret = ret | (1 << 2);
    _pSTUpdateCRTR ();
    pST_SR_RTTINC_expiration = pST_CRTR_timestamp + pST_RTMR_ticktime;
   }
   if (now >= pST_SR_ALMS_expiration)
   {
    ret = ret | (1 << 3);
    _pSTUpdateALMS (1);
   }
   memoryError = (0);
   return ((ret)|0);
  case 0x24:
   _pSTUpdateCRTR ();
   memoryError = (0);
   return ((pST_CRTR)|0);
 }
 bail (390841);
 return 0;
}
function _pSTWrite (offset, value)
{
 offset = offset|0;
 value = value|0;
 offset = offset & 0xFF;
 switch (((offset)|0))
 {
  case 0x04:
   pST_PIMR = value & 0xFFFF;
   pST_PIMR_period = (pST_PIMR ? (+(((pST_PIMR)|0))) : 65536.0) / 32.768;
   pST_PIMR_timestamp = (+_getMilliseconds());
   memoryError = (0);
   return;
  case 0x0C:
   _pSTUpdateCRTR ();
   pST_RTMR = value & 0xFFFF;
   pST_RTMR_ticktime = (pST_RTMR ? (+(((pST_RTMR)|0))) : 65536.0) / 32.768;
   _pSTUpdateALMS (0);
   memoryError = (0);
   return;
  case 0x14:
   pST_IMR = pST_IMR | value;
   memoryError = (0);
   return;
  case 0x18:
   pST_IMR = pST_IMR & ~value;
   memoryError = (0);
   return;
  case 0x20:
   pST_RTAR = value & 0x0FFFFF;
   _pSTUpdateALMS (0);
   memoryError = (0);
   return;
 }
 bail (8823126);
}
var _subexecute_table = [
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_MUL_MLA, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_MUL_MLA, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_MUL_MLA, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_MUL_MLA, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_SMULL_SMLAL_UMULL_UMLAL, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
  _subexecute_MRS, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_SWP_SWPB, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
  _subexecute_MSR_reg, _subexecute_BX, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
  _subexecute_MRS, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_LDR_STR_misc_imm,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
  _subexecute_MSR_reg, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_LDR_STR_misc_imm,
  _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm, _subexecute_DATA_reg_imm, _subexecute_LDR_STR_misc_imm,
            _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_DATA_reg_reg, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND, _subexecute_DATA_reg_imm, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm, _subexecute_MSR_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm, _subexecute_DATA_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm, _subexecute_LDR_STR_LDRB_STRB_imm,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND, _subexecute_LDR_STR_LDRB_STRB_reg, _subexecute_UND,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged, _subexecute_LDM_STM_privileged,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM, _subexecute_LDM_STM,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B, _subexecute_B,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL, _subexecute_BL,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND, _subexecute_UND,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR, _subexecute_UND, _subexecute_MCR,
            _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC, _subexecute_UND, _subexecute_MRC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC,
            _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC, _subexecute_SVC
];
var systemPeripheralRead = [
          _pAICRead,
          _pAICRead,
          _pDBGURead,
          _pDBGURead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _pPMCRead,
          _pSTRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead
];
var userPeripheralRead = [
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead,
          _undefinedPeripheralRead
];
var systemPeripheralWrite = [
          _pAICWrite,
          _pAICWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _pPMCWrite,
          _pSTWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite
];
var userPeripheralWrite = [
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite,
          _undefinedPeripheralWrite
];
 return {
  getPC: _getPC,
  setPC: _setPC,
  getRegister: _getRegister,
  setRegister: _setRegister,
  getCPSR: _getCPSR,
  setCPSR: _setCPSR,
  reset: _reset,
  run: _run
 };
}
};
       
var neededFiles = {
 kernel: {path: "resources/kernelimage"},
 devicetree: {path: "resources/devicetree.dtb"}
};
var fs = require ('fs');
for (var name in neededFiles)
{
 var obj = neededFiles[name];
 obj.buffer = new Uint8Array (fs.readFileSync (obj.path)).buffer;
}
var system;
system = new System ();
system.loadImage (neededFiles.kernel.buffer, 0x20008000);
system.loadImage (neededFiles.devicetree.buffer, 0x21000000);
var writeBuffer = new Buffer (1);
system.onConsoleByte = function (b) {
 writeBuffer[0] = b;
 process.stdout.write (writeBuffer);
};
system.reset ();
system.setPC (0x20008000);
system.setRegister ((1), ~0);
system.setRegister ((2), 0x21000000);
while (1)
 system.run (1000);
