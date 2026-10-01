extends Node3D
## W0 foundation scene: proves the package boots, reports the active renderer
## and exits after a smoke interval when launched with `-- --smoke`.

func _ready() -> void:
	var info: Dictionary = {
		"engine": Engine.get_version_info().get("string", ""),
		"renderer": RenderingServer.get_current_rendering_method(),
		"driver": RenderingServer.get_current_rendering_driver_name(),
		"adapter": RenderingServer.get_video_adapter_name(),
		"vendor": RenderingServer.get_video_adapter_vendor(),
		"api": RenderingServer.get_video_adapter_api_version(),
		"os": OS.get_name(),
		"physics": ProjectSettings.get_setting("physics/3d/physics_engine"),
		"user_dir": OS.get_user_data_dir(),
	}
	print("[boot] ", JSON.stringify(info))
	if "--smoke" in OS.get_cmdline_user_args():
		await get_tree().create_timer(2.0).timeout
		get_tree().quit(0)
