class_name SeededRandom
extends RefCounted
## Bit-exact port of the browser's per-figure generator (figure.js rnd()):
## a mulberry32 variant seeded with (seed * 1831 + 13). Used so presentation
## choices (habit wear, clip speed) match the browser for the same seed.

var _a: int

func _init(seed_value: int) -> void:
	_a = (seed_value * 1831 + 13) & 0xFFFFFFFF

static func _i32(x: int) -> int:
	x &= 0xFFFFFFFF
	return x - 0x100000000 if x >= 0x80000000 else x

static func _imul(x: int, y: int) -> int:
	return _i32((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF))

func next() -> float:
	var a: int = _i32(_a)
	a = _i32(a + 0x6D2B79F5)
	_a = a
	var t: int = _imul(a ^ ((a & 0xFFFFFFFF) >> 15), 1 | a)
	t = _i32(_i32(t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), 61 | t)) ^ t)
	return float((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296.0
