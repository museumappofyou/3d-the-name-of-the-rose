class_name InteractionRules
extends RefCounted
## Domain reducer for interactions (main.js act() / interactionLabel()):
## the first rule whose allowlisted condition holds applies its actions to
## knowledge and portal state. Presentation (toasts, sounds) is returned for
## adapters to show; nothing here touches the scene.

static func label(def: Dictionary, ctx: RuleContext) -> String:
	for lw: Dictionary in def.get("label_when", []):
		if Conditions.eval(lw["if"], ctx):
			return lw["label"]
	return def.get("label", "")

static func act(def: Dictionary, ctx: RuleContext, day: int = 0) -> Dictionary:
	var out: Dictionary = {"id": def.get("id", ""), "toast": "", "ms": 0, "notes": [], "sound": "", "portals": []}
	for r: Dictionary in def.get("rules", []):
		if not Conditions.eval(r["if"], ctx):
			continue
		for a: Dictionary in r["do"]:
			if a.has("note"):
				if ctx.knowledge.add(String(a["note"]), a.get("extra", {}), -1, day, ctx.hours):
					(out["notes"] as Array).append(a["note"])
			if a.has("toast"):
				out["toast"] = a["toast"]
				out["ms"] = int(a.get("ms", 6000))
			if a.has("portal_target"):
				ctx.portals.set_target(String(a["portal_target"][0]), int(a["portal_target"][1]))
				(out["portals"] as Array).append(a["portal_target"][0])
			if a.has("sound"):
				out["sound"] = a["sound"]
		break
	return out
