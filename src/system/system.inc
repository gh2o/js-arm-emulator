// vim:ft=c
#pragma once

#define ROTATE_RIGHT(x,y) ( ((x)>>>(y)) | ((x)<<(32-(y))) )
#define EXTRACT_NIBBLE(x,off) ((x) >> (off) & 0x0F)
