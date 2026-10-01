class_name Hud
extends CanvasLayer
## Phase-1 interface in the browser's manuscript language (src/ui/style.css:
## vellum, ink, rubric, gold; EB Garamond text, Grenze Gotisch rubrics):
## room banner, canonical-hour cartouche, interaction prompt, toast, note
## cue, notebook folio (J), pause menu (Esc) and a QA debug panel (F12).
## Reads domain state; never owns it.

signal request(action: String, arg: Variant)

const VELLUM := Color("eee2c4")
const VELLUM_2 := Color("e3d2a9")
const INK := Color("2a1d12")
const INK_2 := Color("4a3826")
const RUBRIC := Color("a4231a")
const GOLD := Color("b58b34")
const GOLD_2 := Color("e2bd62")
const LIGHT := Color("f5e9cc")

var session: GameSession
var content: ContentData
var serif: FontFile
var serif_italic: FontFile
var black: FontFile
var prompt_panel: PanelContainer
var prompt_label: Label
var toast_panel: PanelContainer
var toast_label: Label
var banner: VBoxContainer
var banner_latin: Label
var banner_en: Label
var clock_label: Label
var cue_label: Label
var notebook: PanelContainer
var notebook_box: VBoxContainer
var pause_panel: PanelContainer
var pause_status: Label
var debug_panel: PanelContainer
var stats_label: Label
var _toast_t: float = 0.0
var _banner_t: float = 0.0
var _cue_t: float = 0.0
var boundary_label: Label

func setup(s: GameSession, c: ContentData) -> void:
	session = s
	content = c
	layer = 10
	serif = _font("eb-garamond-latin-400-normal", "eb-garamond-latin-ext-400-normal")
	serif_italic = _font("eb-garamond-latin-400-italic", "")
	black = _font("grenze-gotisch-latin-600-normal", "")
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	root.theme = _theme()
	# banner
	banner = VBoxContainer.new()
	banner.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	banner.position.y = 96
	banner.alignment = BoxContainer.ALIGNMENT_CENTER
	banner.modulate.a = 0.0
	banner_latin = _label(black, 44, LIGHT, true)
	banner_en = _label(serif_italic, 22, LIGHT, true)
	banner.add_child(banner_latin)
	banner.add_child(banner_en)
	root.add_child(banner)
	# clock cartouche
	clock_label = _label(black, 26, LIGHT, true)
	clock_label.position = Vector2(28, 22)
	root.add_child(clock_label)
	# prompt
	prompt_panel = _dark_panel(0.78, false)
	prompt_label = _label(serif, 22, LIGHT, true)
	prompt_panel.add_child(prompt_label)
	prompt_panel.visible = false
	root.add_child(prompt_panel)
	# toast
	toast_panel = _dark_panel(0.82, true)
	toast_label = _label(serif, 21, LIGHT, true)
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.custom_minimum_size = Vector2(760, 0)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_panel.add_child(toast_label)
	toast_panel.modulate.a = 0.0
	root.add_child(toast_panel)
	# note cue
	cue_label = _label(black, 26, GOLD_2, true)
	cue_label.modulate.a = 0.0
	root.add_child(cue_label)
	boundary_label = _label(serif_italic, 18, Color(1, 0.86, 0.7), true)
	boundary_label.visible = false
	root.add_child(boundary_label)
	stats_label = _label(serif, 16, LIGHT, true)
	stats_label.position = Vector2(28, 64)
	stats_label.visible = false
	root.add_child(stats_label)
	_build_notebook(root)
	_build_pause(root)
	_build_debug(root)
	session.toast.connect(func(t: String, ms: int) -> void: show_toast(t, ms))
	session.noted.connect(func(_id: String, title: String) -> void: note_cue(title))
	session.room_changed.connect(func(_o: String, n: String) -> void: show_banner(n))

func _font(main: String, ext: String) -> FontFile:
	var f: FontFile = load("res://assets/fonts/%s.woff2" % main)
	if ext != "":
		var fb: FontFile = load("res://assets/fonts/%s.woff2" % ext)
		f.fallbacks = [fb]
	return f

func _theme() -> Theme:
	var t := Theme.new()
	t.default_font = serif
	t.default_font_size = 20
	var b := StyleBoxFlat.new()
	b.bg_color = VELLUM_2
	b.border_color = GOLD
	b.set_border_width_all(1)
	b.set_corner_radius_all(2)
	b.content_margin_left = 12; b.content_margin_right = 12; b.content_margin_top = 4; b.content_margin_bottom = 4
	t.set_stylebox("normal", "Button", b)
	var h: StyleBoxFlat = b.duplicate()
	h.bg_color = VELLUM
	h.border_color = RUBRIC
	t.set_stylebox("hover", "Button", h)
	t.set_stylebox("pressed", "Button", h)
	t.set_stylebox("focus", "Button", h)
	t.set_color("font_color", "Button", INK)
	t.set_color("font_hover_color", "Button", RUBRIC)
	t.set_color("font_pressed_color", "Button", RUBRIC)
	t.set_color("font_focus_color", "Button", RUBRIC)
	return t

func _label(font: Font, size: int, color: Color, shadow: bool) -> Label:
	var l := Label.new()
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if shadow:
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
		l.add_theme_constant_override("shadow_offset_y", 2)
		l.add_theme_constant_override("shadow_outline_size", 6)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _dark_panel(alpha: float, gold: bool) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(20 / 255.0, 10 / 255.0, 4 / 255.0, alpha)
	if gold:
		sb.border_color = GOLD
		sb.border_width_top = 1
		sb.border_width_bottom = 1
	sb.content_margin_left = 18; sb.content_margin_right = 18; sb.content_margin_top = 8; sb.content_margin_bottom = 7
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

func _vellum_panel() -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = VELLUM
	sb.border_color = Color("b89d6a")
	sb.set_border_width_all(2)
	sb.shadow_color = Color(0, 0, 0, 0.55)
	sb.shadow_size = 18
	sb.content_margin_left = 34; sb.content_margin_right = 34; sb.content_margin_top = 26; sb.content_margin_bottom = 26
	p.add_theme_stylebox_override("panel", sb)
	return p

func _build_notebook(root: Control) -> void:
	notebook = _vellum_panel()
	notebook.custom_minimum_size = Vector2(760, 620)
	notebook.visible = false
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(700, 560)
	notebook_box = VBoxContainer.new()
	notebook_box.custom_minimum_size = Vector2(680, 0)
	notebook_box.add_theme_constant_override("separation", 10)
	sc.add_child(notebook_box)
	notebook.add_child(sc)
	root.add_child(notebook)

func refresh_notebook() -> void:
	for c: Node in notebook_box.get_children():
		c.queue_free()
	var title := _label(black, 40, INK, false)
	title.text = "Notabilia"
	notebook_box.add_child(title)
	var sub := _label(serif_italic, 18, INK_2, false)
	sub.text = "Things seen in the abbey, in the order they were noticed."
	notebook_box.add_child(sub)
	if session.knowledge.notes.is_empty():
		var e := _label(serif_italic, 20, INK_2, false)
		e.text = "Nothing noted yet."
		notebook_box.add_child(e)
	for id: String in session.knowledge.ordered():
		var d: Dictionary = content.discovery(id)
		var h := _label(black, 26, RUBRIC, false)
		h.text = String(d.get("title", id))
		notebook_box.add_child(h)
		var w := _label(serif_italic, 17, INK_2, false)
		var by: String = String(session.knowledge.notes[id].get("by", ""))
		w.text = String(d.get("where", "")) + ("" if by == "" else " · told by " + by.capitalize())
		notebook_box.add_child(w)
		for key: String in ["seen", "reading"]:
			if d.has(key):
				var p := _label(serif_italic if key == "reading" else serif, 20, INK, false)
				p.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
				p.custom_minimum_size = Vector2(660, 0)
				p.text = d[key]
				notebook_box.add_child(p)
	if session.knowledge.route >= 0:
		var r := _label(serif_italic, 18, INK_2, false)
		r.text = "The passage under the church: walked to its first landing."
		notebook_box.add_child(r)

func toggle_notebook() -> void:
	notebook.visible = not notebook.visible
	if notebook.visible:
		refresh_notebook()
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _build_pause(root: Control) -> void:
	pause_panel = _vellum_panel()
	pause_panel.visible = false
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	var t := _label(black, 38, INK, false)
	t.text = "Interruptio"
	v.add_child(t)
	for pair: Array in [["Resume", "resume"], ["Save", "save"], ["Load", "load"], ["Quit", "quit"]]:
		var b := Button.new()
		b.text = pair[0]
		b.pressed.connect(func() -> void: request.emit(pair[1], null))
		v.add_child(b)
	pause_status = _label(serif_italic, 16, INK_2, false)
	pause_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	pause_status.custom_minimum_size = Vector2(420, 0)
	v.add_child(pause_status)
	pause_panel.add_child(v)
	root.add_child(pause_panel)

func show_pause(on: bool, status: String = "") -> void:
	pause_panel.visible = on
	pause_status.text = status

func _build_debug(root: Control) -> void:
	debug_panel = _vellum_panel()
	debug_panel.visible = false
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 8)
	g.add_theme_constant_override("v_separation", 6)
	var head := _label(black, 26, RUBRIC, false)
	head.text = "QA (study tools)"
	g.add_child(head)
	g.add_child(Control.new())
	var items: Array = [
		["15:00 (work after None)", "time", 15.0], ["Prime 7:40", "time", 7.66], ["9:30 (morning work)", "time", 9.5],
		["Vespers 16:40", "time", 16.66], ["Night 20:00", "time", 20.0], ["Time runs ×60", "rate", 60.0],
		["Jump: porch", "jump", "porch"], ["Jump: cloister door", "jump", "door"], ["Jump: skull altar", "jump", "altar"],
		["Jump: stair landing", "jump", "landing"], ["Jump: door fixture (outside)", "jump", "fixture_out"], ["Jump: door fixture (inside)", "jump", "fixture_in"],
		["Reset test save", "reset", null], ["Toggle stats", "stats", null],
	]
	for it: Array in items:
		var b := Button.new()
		b.text = it[0]
		b.pressed.connect(func() -> void: request.emit(it[1], it[2]))
		g.add_child(b)
	debug_panel.add_child(g)
	debug_panel.position = Vector2(28, 120)
	root.add_child(debug_panel)

func toggle_debug() -> void:
	debug_panel.visible = not debug_panel.visible
	if debug_panel.visible:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func any_panel() -> bool:
	return notebook.visible or pause_panel.visible or debug_panel.visible

func set_prompt(label: String) -> void:
	prompt_panel.visible = label != ""
	prompt_label.text = ("E  ·  " + label) if label != "" else ""

func show_toast(text: String, ms: int) -> void:
	toast_label.text = text
	_toast_t = ms / 1000.0
	toast_panel.modulate.a = 1.0

func note_cue(title: String) -> void:
	cue_label.text = "Noted · " + title
	_cue_t = 3.2
	cue_label.modulate.a = 1.0

func show_banner(room_id: String) -> void:
	var r: Dictionary = session.rooms.room(room_id)
	banner_latin.text = String(r.get("latin", ""))
	banner_en.text = String(r.get("en", ""))
	_banner_t = 3.0

func show_boundary(text: String) -> void:
	boundary_label.visible = text != ""
	boundary_label.text = text

func set_stats(text: String) -> void:
	stats_label.text = text

func _process(dt: float) -> void:
	var vp: Vector2 = get_viewport().get_visible_rect().size
	prompt_panel.position = Vector2((vp.x - prompt_panel.size.x) / 2.0, vp.y / 2.0 + 34.0)
	toast_panel.position = Vector2((vp.x - toast_panel.size.x) / 2.0, vp.y - 150.0 - toast_panel.size.y)
	cue_label.position = Vector2((vp.x - cue_label.size.x) / 2.0, vp.y - 96.0)
	boundary_label.position = Vector2((vp.x - boundary_label.size.x) / 2.0, vp.y / 2.0 + 80.0)
	banner.position = Vector2((vp.x - banner.size.x) / 2.0, 96.0)
	notebook.position = (vp - notebook.size) / 2.0
	pause_panel.position = (vp - pause_panel.size) / 2.0
	_toast_t -= dt
	toast_panel.modulate.a = clampf(_toast_t / 0.4, 0.0, 1.0)
	_cue_t -= dt
	cue_label.modulate.a = clampf(_cue_t / 0.6, 0.0, 1.0)
	_banner_t -= dt
	banner.modulate.a = clampf(minf(_banner_t / 1.2, 1.0), 0.0, 1.0)
	var h: float = session.clock.hours
	var o: Dictionary = session.horarium.office_def(session.clock.office())
	var hh: int = int(h)
	var mm: int = int((h - hh) * 60.0)
	clock_label.text = "%s  ·  %02d:%02d" % [String(o.get("latin", session.clock.phase_id().capitalize())), hh, mm]
