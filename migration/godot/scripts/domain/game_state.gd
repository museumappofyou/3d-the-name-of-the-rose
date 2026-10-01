extends Node
## Autoload `Game`: hosts the GameSession for scene adapters. Command-line
## user arguments (after `--`): --time=H, --save-dir=user://..., --seed=N.
## Test runs use a separate save directory; nothing here reads or writes the
## browser's localStorage notebook.

var session: GameSession
var args: Dictionary = {}

func _ready() -> void:
	for a: String in OS.get_cmdline_user_args():
		if a.begins_with("--") and a.contains("="):
			args[a.substr(2, a.find("=") - 2)] = a.substr(a.find("=") + 1)
		elif a.begins_with("--"):
			args[a.substr(2)] = true
	var hours: float = float(args.get("time", "15.0"))
	session = GameSession.new(Content.db, String(args.get("save-dir", "user://saves")), hours, int(args.get("seed", "1")))
