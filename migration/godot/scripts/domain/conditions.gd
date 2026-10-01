class_name Conditions
extends RefCounted
## Evaluator for the small allowlisted condition vocabulary used by
## interactions, routines and derived discoveries (validated offline by
## scripts/migration/build_content.py). No expressions, no scripting.

const KEYS: PackedStringArray = ["any", "all", "not", "known", "any_known", "all_known", "known_derived", "phase_in", "office_in", "no_office", "phase_start_after", "hour_between", "portal_target", "curfew"]

static func eval(c: Dictionary, ctx: RuleContext) -> bool:
	for k: String in c.keys():
		if not KEYS.has(k):
			push_error("[conditions] operator not allowlisted: " + k)
			return false
		if not _op(k, c[k], ctx):
			return false
	return true

static func _op(k: String, v: Variant, ctx: RuleContext) -> bool:
	match k:
		"any":
			for x: Dictionary in v:
				if eval(x, ctx):
					return true
			return false
		"all":
			for x: Dictionary in v:
				if not eval(x, ctx):
					return false
			return true
		"not":
			return not eval(v as Dictionary, ctx)
		"known":
			return ctx.knows(String(v))
		"any_known":
			for x: String in v:
				if ctx.knows(x):
					return true
			return false
		"all_known":
			for x: String in v:
				if not ctx.knows(x):
					return false
			return true
		"known_derived":
			var rule: Dictionary = ctx.derived.get(String(v), {})
			var only: Dictionary = {}
			for rk: String in rule.keys():
				if KEYS.has(rk):
					only[rk] = rule[rk]
			return not only.is_empty() and eval(only, ctx)
		"phase_in":
			return (v as Array).has(String(ctx.horarium.phase_at(ctx.hours)["id"]))
		"office_in":
			return (v as Array).has(ctx.horarium.office_id(ctx.hours))
		"no_office":
			return ctx.horarium.office_at(ctx.hours).is_empty() == bool(v)
		"phase_start_after":
			return float(ctx.horarium.phase_at(ctx.hours)["t0"]) > float(v)
		"hour_between":
			var h: float = Horarium.wrap_hours(ctx.hours)
			return h >= float(v[0]) and h < float(v[1])
		"portal_target":
			return ctx.portals != null and ctx.portals.target(String(v[0])) == int(v[1])
		"curfew":
			return ctx.horarium.curfew_barred(String(v), ctx.hours)
	return false
