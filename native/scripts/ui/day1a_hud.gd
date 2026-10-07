class_name Day1aHud
extends CanvasLayer
## Day-1A interface, in the proof's manuscript language: subtitles (the
## speaker as Adso knows him — a description until he has heard a name),
## optional sound captions, numbered choices (1–4), the end card, and the
## accessibility options shown in the pause menu (text size, captions, look
## sensitivity). No quest tracker, objective, minimap, waypoint, clock or
## score; the base HUD's room banner and hour cartouche are hidden.

signal chose(option_id: String)

const VELLUM := Color("eee2c4")
const INK := Color("2a1d12")
const INK_2 := Color("4a3826")
const RUBRIC := Color("a4231a")
const GOLD := Color("b58b34")
const GOLD_2 := Color("e2bd62")
const LIGHT := Color("f5e9cc")

var serif: FontFile
var serif_italic: FontFile
var black: FontFile
var root: Control
var sub_box: VBoxContainer
var lines: Array = []                 # [{"node", "until"}]
var caption_label: Label
var _caption_t: float = 0.0
var choice_box: PanelContainer
var choice_list: VBoxContainer
var options: Array = []
var end_card: PanelContainer
var text_scale: float = 1.0
var captions_on: bool = true
var options_box: VBoxContainer

func setup() -> void:
	layer = 11
	serif = load("res://assets/fonts/eb-garamond-latin-400-normal.woff2")
	serif.fallbacks = [load("res://assets/fonts/eb-garamond-latin-ext-400-normal.woff2")]
	serif_italic = load("res://assets/fonts/eb-garamond-latin-400-italic.woff2")
	black = load("res://assets/fonts/grenze-gotisch-latin-600-normal.woff2")
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	sub_box = VBoxContainer.new()
	sub_box.alignment = BoxContainer.ALIGNMENT_END
	sub_box.add_theme_constant_override("separation", 4)
	sub_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(sub_box)
	caption_label = _label(serif_italic, 19, Color(0.92, 0.88, 0.78), true)
	caption_label.modulate.a = 0.0
	root.add_child(caption_label)
	choice_box = PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(20 / 255.0, 10 / 255.0, 4 / 255.0, 0.78)
	sb.border_color = GOLD
	sb.border_width_top = 1
	sb.border_width_bottom = 1
	sb.content_margin_left = 22; sb.content_margin_right = 22; sb.content_margin_top = 10; sb.content_margin_bottom = 10
	choice_box.add_theme_stylebox_override("panel", sb)
	choice_box.visible = false
	choice_list = VBoxContainer.new()
	choice_list.add_theme_constant_override("separation", 6)
	choice_box.add_child(choice_list)
	root.add_child(choice_box)
	end_card = PanelContainer.new()
	var vb := StyleBoxFlat.new()
	vb.bg_color = VELLUM
	vb.border_color = Color("b89d6a")
	vb.set_border_width_all(2)
	vb.content_margin_left = 40; vb.content_margin_right = 40; vb.content_margin_top = 30; vb.content_margin_bottom = 30
	end_card.add_theme_stylebox_override("panel", vb)
	var ev := VBoxContainer.new()
	ev.add_theme_constant_override("separation", 8)
	var t1 := _label(black, 34, INK, false)
	t1.text = "Nona"
	var t2 := _label(serif_italic, 21, INK_2, false)
	t2.text = "Here the first half of the first day ends."
	var t3 := _label(serif, 17, INK_2, false)
	t3.text = "Day 1A prototype — the road, the gate, the guest house, the meal, Nones.\nEsc opens the menu."
	ev.add_child(t1)
	ev.add_child(t2)
	ev.add_child(t3)
	end_card.add_child(ev)
	end_card.visible = false
	root.add_child(end_card)

func _label(font: Font, size: int, color: Color, shadow: bool) -> Label:
	var l := Label.new()
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if shadow:
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.92))
		l.add_theme_constant_override("shadow_offset_y", 2)
		l.add_theme_constant_override("shadow_outline_size", 7)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func say(label: String, text: String, seconds: float, is_adso: bool) -> void:
	var rt := RichTextLabel.new()
	rt.bbcode_enabled = true
	rt.fit_content = true
	rt.scroll_active = false
	rt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rt.custom_minimum_size = Vector2(900, 0)
	rt.add_theme_font_override("normal_font", serif)
	rt.add_theme_font_override("italics_font", serif_italic)
	rt.add_theme_font_size_override("normal_font_size", int(23 * text_scale))
	rt.add_theme_font_size_override("italics_font_size", int(23 * text_scale))
	rt.add_theme_color_override("default_color", LIGHT)
	rt.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	rt.add_theme_constant_override("shadow_outline_size", 7)
	rt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var who: String = "[color=#%s]%s[/color]" % [(GOLD_2 if not is_adso else Color("c9b48a")).to_html(false), label]
	rt.text = "[center]%s  %s[/center]" % [who, text]
	sub_box.add_child(rt)
	lines.append({"node": rt, "until": Time.get_ticks_msec() / 1000.0 + seconds})
	while lines.size() > 2:
		(lines.pop_front()["node"] as Node).queue_free()

func caption(text: String) -> void:
	if not captions_on:
		return
	caption_label.text = text
	caption_label.add_theme_font_size_override("font_size", int(19 * text_scale))
	_caption_t = 4.0

func show_choice(opts: Array) -> void:
	options = opts
	for c: Node in choice_list.get_children():
		c.queue_free()
	for i: int in opts.size():
		var l := _label(serif, int(22 * text_scale), LIGHT, true)
		l.text = "%d   %s" % [i + 1, String(opts[i]["text"])]
		choice_list.add_child(l)
	choice_box.visible = true

func hide_choice() -> void:
	choice_box.visible = false
	options = []

func pick(i: int) -> bool:
	if not choice_box.visible or i < 0 or i >= options.size():
		return false
	var id: String = options[i]["id"]
	hide_choice()
	chose.emit(id)
	return true

func set_end(on: bool) -> void:
	end_card.visible = on

## Subtitles, caption and replies belonging to the state being replaced.
func clear_transient() -> void:
	for L: Dictionary in lines:
		(L["node"] as Node).queue_free()
	lines.clear()
	caption_label.text = ""
	_caption_t = 0.0
	hide_choice()

## options shown in the pause menu (Day-1A)
func add_options(pause_box: Container, player: PlayerController) -> void:
	options_box = VBoxContainer.new()
	var hdr := _label(black, 24, RUBRIC, false)
	hdr.text = "Optiones"
	options_box.add_child(hdr)
	var bt := Button.new()
	bt.text = "Text size: normal"
	bt.pressed.connect(func() -> void:
		text_scale = {1.0: 1.25, 1.25: 1.5, 1.5: 1.0}.get(text_scale, 1.0)
		bt.text = "Text size: " + {1.0: "normal", 1.25: "large", 1.5: "very large"}[text_scale])
	options_box.add_child(bt)
	var bc := Button.new()
	bc.text = "Sound captions: on"
	bc.pressed.connect(func() -> void:
		captions_on = not captions_on
		bc.text = "Sound captions: " + ("on" if captions_on else "off"))
	options_box.add_child(bc)
	var bs := Button.new()
	bs.text = "Look sensitivity: medium"
	bs.pressed.connect(func() -> void:
		var steps: Array = [0.0012, 0.0017, 0.0022, 0.003, 0.004]
		var i: int = (steps.find(player.look_sens) + 1) % steps.size()
		player.look_sens = steps[i]
		bs.text = "Look sensitivity: " + ["very low", "low", "medium", "high", "very high"][i])
	options_box.add_child(bs)
	var help := _label(serif, 16, INK_2, false)
	help.text = "WASD / arrows walk · Shift hurry · mouse look · E take, give, sit, speak · 1–4 answer · Esc menu · F5 save · F9 load"
	help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help.custom_minimum_size = Vector2(420, 0)
	options_box.add_child(help)
	pause_box.add_child(options_box)

func _process(dt: float) -> void:
	var vp: Vector2 = get_viewport().get_visible_rect().size
	var now: float = Time.get_ticks_msec() / 1000.0
	for i: int in range(lines.size() - 1, -1, -1):
		var L: Dictionary = lines[i]
		var n: Control = L["node"]
		var left: float = float(L["until"]) - now
		n.modulate.a = clampf(left / 0.5, 0.0, 1.0)
		if left <= 0.0:
			n.queue_free()
			lines.remove_at(i)
	sub_box.position = Vector2((vp.x - sub_box.size.x) / 2.0, vp.y - 70.0 - sub_box.size.y)
	_caption_t -= dt
	caption_label.modulate.a = clampf(_caption_t / 0.6, 0.0, 1.0)
	caption_label.position = Vector2((vp.x - caption_label.size.x) / 2.0, vp.y - 82.0 - sub_box.size.y - caption_label.size.y)
	choice_box.position = Vector2((vp.x - choice_box.size.x) / 2.0, vp.y - 110.0 - sub_box.size.y - choice_box.size.y)
	end_card.position = (vp - end_card.size) / 2.0
