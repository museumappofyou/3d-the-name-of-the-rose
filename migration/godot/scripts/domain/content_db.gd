extends Node
## Autoload `Content`: one shared ContentData for scene adapters. Domain code
## takes a ContentData explicitly so headless tests can build their own.

var db: ContentData = ContentData.new()

func _init() -> void:
	if not db.load_dir("res://content"):
		for e: String in db.errors:
			push_error("[content] " + e)

func person(id: String) -> Dictionary:
	return db.person(id)
