class_name AccessRules
extends RefCounted
## Door/curfew/egress rules (src/systems/worldState.js aedificiumExitPermit
## and main.js updateCurfew), shared by the noncanonical door fixture.

## doors: [{x, z, nx, nz, th}] in world metres. The room polygon reaches the
## wall centre; the closed bar lies farther inside. Grant the exit permit
## only well inside, and keep it until an exiting capsule has cleared the
## doorway, so closing the bar can never trap the player.
static func exit_permit(feet: Vector3, inside: bool, doors: Array, previous: bool = false) -> bool:
	if doors.is_empty():
		return inside
	var clear_inside: bool = inside
	if clear_inside:
		for d: Dictionary in doors:
			var dist: float = Vector2(feet.x - float(d["x"]), feet.z - float(d["z"])).length()
			var depth: float = (feet.x - float(d["x"])) * float(d["nx"]) + (feet.z - float(d["z"])) * float(d["nz"])
			if not (dist > 4.0 or depth < -(float(d.get("th", 1.2)) / 2.0 + 0.45)):
				clear_inside = false
				break
	if clear_inside:
		return true
	if not previous:
		return false
	if inside:
		return true
	for d: Dictionary in doors:
		if Vector2(feet.x - float(d["x"]), feet.z - float(d["z"])).length() < 2.0:
			return true
	return false

## updateCurfew(): the bar is solid when the rule bars the door and the
## walker holds no exit permit.
static func barred(curfew_active: bool, exit_allowed: bool) -> bool:
	return curfew_active and not exit_allowed
