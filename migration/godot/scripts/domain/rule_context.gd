class_name RuleContext
extends RefCounted
## What an allowlisted condition may read: knowledge, the clock, portal
## targets and curfew rules. Nothing scene-related.

var knowledge: KnowledgeState
var horarium: Horarium
var portals: PortalStates
var derived: Dictionary = {}
var hours: float = 12.0

func knows(id: String) -> bool:
	return knowledge != null and knowledge.has(id)
