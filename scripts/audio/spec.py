"""Which recordings each sound bank is cut from.

Every id is a Creative Commons 0 recording on Freesound (sources.json has
author, title, URL and the licence as shown on download). Times are in
seconds of the HQ preview. `auto` finds onsets (a sharp rise in energy) in
a range; `seg` lists explicit spans chosen from spectrograms of each file
(clean events only: no voices, traffic, motors or tonal hum). Filters:
high-pass to remove handling rumble and mains/wind, band-reject for the
two tonal contaminants found. `target` is the RMS of the loudest 100 ms.
"""

HP = 'highpass=f=%d'
# a 48 dB/oct high-pass, for sources with heavy rumble (traffic, a hall's HVAC)
def HP4(f): return ','.join(['highpass=f=%d' % f] * 4)
walk = lambda t0=0, t1=1e9, gap=0.4, mx=0.44, **k: dict(t0=t0, t1=t1, gap=gap, max=mx, **k)

BANKS = {
    # ---------------- footsteps (leather soles; heel and roll) ----------------
    'step:stone': dict(n=14, src=[dict(id='517141', filt=HP % 70 + ',afftdn=nf=-55:nr=10', auto=walk()),
                                  dict(id='637555', filt=HP % 100, auto=walk(gap=0.36, mx=0.38))]),
    # a real stone hall: the slab's own long decay is part of the step
    'step:churchStone': dict(n=12, fade=(0.004, 0.3), src=[dict(id='235438', filt=HP4(110) + ',lowshelf=g=-8:f=260', auto=walk(gap=0.8, mx=0.95, rise=14))]),
    'step:tile': dict(n=10, src=[dict(id='530588', filt=HP % 90, auto=walk(gap=0.45, mx=0.4)),
                                  dict(id='118985', filt=HP % 120 + ',afftdn=nf=-40:nr=14', auto=walk(gap=0.45, mx=0.38))]),
    'step:stoneWet': dict(n=12, src=[dict(id='624168', filt=HP % 170, auto=walk(gap=0.42, mx=0.5))]),
    'step:wood': dict(n=14, src=[dict(id='464519', filt=HP % 45, auto=walk(gap=0.45, mx=0.55)),
                                 dict(id='575896', filt=HP % 45, auto=walk(t0=1, t1=14, gap=0.5, mx=0.6), pick=[0, 2, 4, 6])]),
    'step:dirt': dict(n=12, src=[dict(id='353799', auto=walk(gap=0.5, mx=0.5)),
                                 dict(id='264469', filt=HP % 60, auto=walk(t0=0, t1=10, gap=0.35, mx=0.38))]),
    'step:frozenSoil': dict(n=12, src=[dict(id='785106', filt=HP % 80, auto=walk(t0=0, t1=16, gap=0.45, mx=0.5, rise=10))]),
    'step:mud': dict(n=12, src=[dict(id='843134', filt=HP % 60 + ',bandreject=f=3500:width_type=h:w=120', auto=walk(t0=0, t1=40, gap=0.42, mx=0.48))]),
    'step:snowPacked': dict(n=14, src=[dict(id='420551', filt=HP % 70, auto=walk(t0=0, t1=39, gap=0.4, mx=0.42, rise=9)),
                                       dict(id='842972', filt=HP % 70, auto=walk(t0=145, t1=200, gap=0.45, mx=0.45, rise=10), pick=[0, 2, 4, 6, 8, 10])]),
    'step:snowFresh': dict(n=12, src=[dict(id='842972', filt=HP % 60, auto=walk(t0=3, t1=60, gap=0.5, mx=0.55, rise=10))]),
    'step:snowCrust': dict(n=12, src=[dict(id='427524', filt=HP % 80, auto=walk(t0=0, t1=40, gap=0.45, mx=0.45, rise=10))]),
    'step:ice': dict(n=10, src=[dict(id='785106', filt=HP % 120, auto=walk(t0=16, t1=32, gap=0.45, mx=0.42, rise=10))]),
    'step:straw': dict(n=12, src=[dict(id='377323', filt=HP % 110, auto=walk(t0=2, t1=60, gap=0.6, mx=0.6, rise=9))]),
    'step:gravel': dict(n=12, src=[dict(id='565720', filt=HP % 70, auto=walk(t0=0, t1=30, gap=0.3, mx=0.34))]),

    # ---------------- fire ----------------
    'fireLoop': dict(loop=True, ch=2, q=5, target=0.07, src=[dict(id='484337', filt=HP % 110 + ',lowshelf=g=-4:f=200', seg=[(20, 52)])]),
    'fireLow': dict(loop=True, ch=2, q=5, target=0.05, src=[dict(id='484338', filt=HP % 110 + ',lowshelf=g=-4:f=200', seg=[(30, 62)])]),
    'firePop': dict(n=10, rank=True, src=[dict(id='370938', filt=HP % 400, auto=dict(t0=0, t1=24, gap=0.5, max=0.25, rise=14, minlen=0.05, pre=0.004))]),
    'fireSettle': dict(n=3, src=[dict(id='370938', filt=HP % 60, seg=[(5.3, 6.6), (16.9, 18.4), (9.0, 10.3)])]),

    # ---------------- wind ----------------
    'wind': dict(loop=True, ch=2, q=5, target=0.1, xf=3, src=[dict(id='117504', filt=HP % 35, seg=[(30, 92)])]),
    'windTrees': dict(loop=True, ch=2, q=5, target=0.1, xf=3, src=[dict(id='261226', filt=HP % 35, seg=[(10, 62)])]),
    'windSlit': dict(loop=True, q=5, target=0.1, xf=2.5, src=[dict(id='69512', filt=HP % 150, seg=[(0.5, 60)])]),

    # ---------------- bell and hinge ----------------
    # one strike of the great bell at Chartres ringing the Angelus, left to decay alone
    'bell': dict(n=1, target=0.14, fade=(0.002, 1.5), src=[dict(id='796547', filt=HP % 60, seg=[(4.75, 14.12)])]),
    'handbell': dict(n=1, target=0.08, fade=(0.002, 0.3), src=[dict(id='219047', filt=HP % 200, seg=[(0.08, 2.4)])]),
    'doorCreak': dict(n=3, src=[dict(id='273466', filt=HP % 70, seg=[(0.15, 4.2)]), dict(id='647646', filt=HP % 60, seg=[(0.0, 0.95)]),
                                dict(id='214307', filt=HP % 60, seg=[(0.4, 2.2)])]),
    'doorThud': dict(n=3, target=0.12, src=[dict(id='214307', filt=HP % 45, seg=[(7.95, 9.3), (13.9, 14.9)]), dict(id='352329', filt=HP % 45, seg=[(1.78, 3.1)])]),
    'latch': dict(n=4, src=[dict(id='460556', filt=HP % 120, seg=[(1.05, 1.9), (3.6, 4.4), (12.42, 13.3), (23.6, 24.6)]), dict(id='126041', filt=HP % 120, seg=[(0.45, 1.5)])]),

    # ---------------- scriptorium ----------------
    'scratch': dict(n=12, rank=True, src=[dict(id='507864', filt=HP % 250 + ',afftdn=nf=-45', auto=dict(t0=5, t1=54, gap=0.25, max=0.5, rise=9, minlen=0.08))]),
    'pageTurn': dict(n=3, src=[dict(id='856497', filt=HP % 80, seg=[(0.22, 0.95), (2.05, 3.05)]), dict(id='856497', filt=HP % 80 + ',asetrate=44100*0.94,aresample=44100', seg=[(0.22, 0.95)])]),
    'benchCreak': dict(n=4, src=[dict(id='377552', filt=HP % 90, seg=[(0.02, 0.3), (0.3, 0.6), (0.66, 0.92)]), dict(id='326460', filt=HP % 90, seg=[(1.4, 1.95)])]),
    'cough': dict(n=5, src=[dict(id='208761', filt=HP % 90, seg=[(0.45, 1.2), (1.8, 2.7), (3.5, 4.45)]), dict(id='848383', filt=HP % 90, seg=[(0.08, 0.87)]),
                            dict(id='151217', filt=HP % 90, seg=[(0.02, 0.4)])]),

    # ---------------- stable ----------------
    'breath': dict(n=6, target=0.08, src=[dict(id='275388', filt=HP % 60, seg=[(0.18, 0.62), (0.62, 1.12), (1.2, 1.7), (1.95, 2.45), (2.55, 3.05), (3.2, 3.95)])]),
    'snort': dict(n=5, src=[dict(id='475483', filt=HP % 60, seg=[(0.0, 0.56)]), dict(id='437111', filt=HP % 60, seg=[(1.95, 2.7), (4.15, 4.95), (5.9, 7.0), (8.25, 9.05)])]),
    'whinny': dict(n=1, src=[dict(id='826753', filt=HP % 80, seg=[(0.0, 1.95)])]),
    'hoof': dict(n=5, target=0.09, src=[dict(id='510915', filt=HP4(70) + ',lowpass=f=6000', seg=[(16.7, 17.3), (45.2, 45.9), (46.3, 47.1)]),
                                        dict(id='159498', filt=HP % 50 + ',lowpass=f=5000', seg=[(9.5, 9.9), (9.95, 10.4)])]),
    'chew': dict(n=6, target=0.06, src=[dict(id='752136', filt=HP % 60, seg=[(1.0, 3.2), (7.5, 9.6), (12.0, 14.0), (26.0, 28.2)]),
                                        dict(id='365138', filt=HP % 60, seg=[(9.0, 11.5), (19.5, 22.0)])]),
    'strawRustle': dict(n=4, target=0.06, src=[dict(id='365138', filt=HP % 300, seg=[(3.5, 5.2), (14.0, 15.6)]), dict(id='536693', filt=HP % 200, seg=[(1.0, 2.4), (2.6, 3.8)])]),
    'timber': dict(n=3, src=[dict(id='182689', filt=HP4(75), seg=[(1.0, 1.9), (10.3, 11.3), (16.0, 17.2)])]),
    'bray': dict(n=1, src=[dict(id='859477', filt=HP % 150, seg=[(0.15, 9.1)])]),

    # ---------------- folds, sheds and yard ----------------
    'cluck': dict(n=8, rank=True, src=[dict(id='456803', filt=HP % 150, auto=dict(t0=0, t1=15, gap=0.25, max=0.35, rise=10, minlen=0.08))]),
    'bawk': dict(n=3, src=[dict(id='456803', filt=HP % 150, seg=[(1.45, 2.0), (4.95, 5.5), (7.3, 7.95)])]),
    'rooster': dict(n=1, src=[dict(id='582624', filt=HP % 150, seg=[(0.5, 2.25)])]),
    'grunt': dict(n=8, src=[dict(id='612680', filt=HP % 60, seg=[(0.0, 0.52), (0.55, 1.1), (2.75, 3.15), (4.45, 4.95)]),
                            dict(id='620085', filt=HP % 60, seg=[(1.95, 2.8), (3.5, 4.65), (4.75, 5.4)]), dict(id='612686', filt=HP % 60, seg=[(0.1, 1.5)])]),
    'squeal': dict(n=1, src=[dict(id='612686', filt=HP % 80, seg=[(1.9, 3.6)])]),
    'bleat': dict(n=10, src=[dict(id='210511', filt=HP % 90, seg=[(1.2, 2.4), (5.7, 7.2), (9.7, 10.8), (12.5, 13.4), (21.7, 23.0), (28.5, 29.7)]),
                             dict(id='842964', filt=HP % 120, seg=[(0.4, 1.5), (6.2, 7.4), (13.8, 15.0), (31.0, 32.1)])]),
    'low': dict(n=2, target=0.12, src=[dict(id='233145', filt=HP % 50, seg=[(0.85, 2.35), (3.1, 5.0)])]),
    'cowChew': dict(n=4, target=0.06, src=[dict(id='233142', filt=HP % 60, seg=[(3.0, 5.6), (8.5, 11.0), (21.0, 23.5), (13.0, 15.5)])]),
    'meow': dict(n=1, src=[dict(id='262314', filt=HP % 200, seg=[(0.04, 0.92)])]),

    # ---------------- smithy ----------------
    'anvil': dict(n=2, target=0.12, fade=(0.002, 0.4), src=[dict(id='386119', filt=HP % 60, seg=[(0.0, 2.2)]), dict(id='386130', filt=HP % 60, seg=[(0.0, 0.75)])]),
    'hot': dict(n=3, target=0.11, fade=(0.002, 0.2), src=[dict(id='386119', filt=HP % 60, seg=[(0.0, 0.9)]),
                                                           dict(id='386119', filt=HP % 60 + ',asetrate=44100*0.95,aresample=44100', seg=[(0.0, 0.9)]),
                                                           dict(id='386130', filt=HP % 60 + ',lowpass=f=5000', seg=[(0.0, 0.6)])]),
    'tap': dict(n=2, target=0.06, fade=(0.002, 0.2), src=[dict(id='386130', filt=HP % 300, seg=[(0.0, 0.55)]),
                                                          dict(id='386130', filt=HP % 300 + ',asetrate=44100*1.06,aresample=44100', seg=[(0.0, 0.5)])]),
    'quench': dict(n=1, src=[dict(id='395864', filt=HP % 80, seg=[(0.0, 3.2)])]),

    # ---------------- kitchen ----------------
    'pot': dict(n=6, src=[dict(id='210100', filt=HP % 60, seg=[(1.15, 1.9), (4.1, 4.9), (5.85, 6.7), (9.1, 9.9), (13.55, 14.4), (18.75, 19.6)])]),
    'metal': dict(n=4, src=[dict(id='405665', filt=HP % 80, seg=[(0.0, 1.0)]), dict(id='264757', filt=HP % 80, seg=[(12.8, 13.6), (22.5, 23.3), (31.8, 32.6)])]),
    'chop': dict(n=8, rank=True, src=[dict(id='757214', filt=HP4(80), auto=dict(t0=0, t1=11.7, gap=0.2, max=0.3, rise=12, minlen=0.07))]),
    'ladle': dict(n=5, src=[dict(id='644389', filt=HP % 90, seg=[(1.55, 2.4), (5.55, 6.6), (7.95, 8.8), (12.65, 13.8), (16.25, 17.3)])]),
    'pour': dict(n=4, src=[dict(id='173938', filt=HP % 80, seg=[(0.3, 2.1), (4.9, 7.0), (15.6, 17.8)]), dict(id='264759', filt=HP % 80, seg=[(10.6, 13.6)])]),

    # ---------------- water, crypt, crows ----------------
    'trickle': dict(loop=True, q=5, target=0.06, xf=2, src=[dict(id='442539', filt=HP % 80, seg=[(13.0, 29.0)])]),
    'cave': dict(loop=True, q=5, target=0.05, xf=2, src=[dict(id='392668', filt=HP % 200, seg=[(0.5, 19.5)])]),
    'caw': dict(n=6, src=[dict(id='404687', filt=HP % 250, seg=[(4.4, 5.0), (5.0, 5.6), (16.0, 16.8), (27.0, 27.7), (42.0, 42.8)]), dict(id='361470', filt=HP % 250, seg=[(0.04, 0.43)])]),

    # ---------------- yard work ----------------
    'axe': dict(n=2, target=0.11, src=[dict(id='386223', filt=HP % 60, seg=[(0.0, 0.4), (0.38, 1.45)])]),
    'saw': dict(n=6, rank=True, src=[dict(id='593203', filt=HP % 150 + ',bandreject=f=2130:width_type=h:w=80', auto=dict(t0=2, t1=18.6, gap=0.3, max=0.6, rise=8, minlen=0.2))]),
    'dig': dict(n=6, src=[dict(id='384362', filt=HP4(65), seg=[(3.9, 4.8), (7.6, 8.5), (12.3, 13.0), (15.7, 16.6), (19.9, 20.8), (23.2, 24.2)])]),
    'sweep': dict(n=8, src=[dict(id='831439', filt=HP % 80, auto=dict(t0=0, t1=12, gap=0.5, max=0.62, rise=10, minlen=0.25))]),

    # ---------------- the sung office (human voices; see SOURCES.md for licences) ----------------
    # Deus in adjutorium, the opening versicle of every hour: Schola Gregoriana, Ołtarzew (CC BY-SA 3.0)
    'chant:deus': dict(n=1, ch=1, q=5, target=0.09, fade=(0.3, 2.0), src=[dict(id='c_deus', filt=HP % 70, seg=[(0.0, 56.0)])]),
    # the Magnificat verses of Vespers, without the antiphon proper to St Vincent Pallotti (same, CC BY-SA 3.0)
    'chant:magnificat': dict(n=1, ch=1, q=5, target=0.09, fade=(1.5, 2.5), src=[dict(id='c_magn', filt=HP % 70, seg=[(29.5, 186.0)])]),
    # monks of Sant'Antimo singing at a morning service (CC BY-SA 3.0; recorded from the nave)
    'chant:psalm': dict(n=1, ch=1, q=5, target=0.08, fade=(1.5, 2.5), src=[dict(id='c_antimo', filt=HP % 120, seg=[(1.0, 98.5)])]),
    # the hymn Veni creator spiritus (Membeth, public domain)
    'chant:hymn': dict(n=1, ch=1, q=5, target=0.085, fade=(0.3, 2.0), src=[dict(id='c_veni', filt=HP % 70, seg=[(1.4, 30.2)])]),
    # a lesson sung by one voice, as the readings of Matins were (Membeth, Lamentation III, CC0)
    'chant:lesson': dict(n=1, ch=1, q=5, target=0.08, fade=(0.3, 2.5), src=[dict(id='c_lament', filt=HP % 70, seg=[(0.0, 75.0)])]),
}
