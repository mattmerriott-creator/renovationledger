#!/usr/bin/env python3
"""Write the HyperFrames composition for a TikTok edit.

usage: build.py PROJECT_DIR

Reads  PROJECT_DIR/edit.json, words.json, assets/cut.mp4
Writes PROJECT_DIR/index.html, compositions/captions.html, compositions/overlays.html,
       hyperframes.json, meta.json, assets/vendor/gsap.min.js

edit.json (every key optional except none):
{
  "hook":     {"text": "WE MADE *$43K* ON THIS FLIP", "duration": 3.0},
  "callouts": [{"text": "$42K REHAB", "at": 6.1, "duration": 1.8, "color": "green"}],
  "zooms":    "auto" | [{"at": 4.2, "scale": 1.18, "duration": 0.25}],
  "cta":      {"duration": 3.5, "headline": "I BUY HOUSES", "phone": "918-268-8788",
               "kicker": "CALL OR TEXT", "sub": "ANY CONDITION  ·  CASH  ·  FAST"},
  "captions": {"words_per_group": 3, "emphasis_words": ["profit", "cash"]}
}
*word* in hook text marks words drawn in the highlight colour.
Callout colours: green (money/wins), yellow (key facts), red (problems, costs).
"""
import html, json, os, re, shutil, sys

W, H = 1080, 1920
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = {
    "font": "Montserrat",
    "white": "#FFFFFF",
    "yellow": "#FFE600",
    "green": "#2BE04A",
    "red": "#FF3B30",
    "ink": "#0A0A0A",
}
FILLERS = {"um", "uh", "umm", "uhh", "erm", "er", "hmm", "hm", "ah", "mm"}


def clean_word(t):
    t = t.strip()
    t = re.sub(r"^[\"'(\[]+|[\"')\].,!?;:]+$", "", t)  # keep $ , % inside the word
    return t.upper()


def is_emphasis(word, extra):
    w = word.lower().strip(".,!?")
    return bool(re.search(r"[$%]|\d", word)) or w in extra


def group_words(words, per):
    groups, cur = [], []
    for k, w in enumerate(words):
        if re.sub(r"[^a-z]", "", w["text"].lower()) in FILLERS:
            continue
        cur.append(k)
        nxt = words[k + 1] if k + 1 < len(words) else None
        long_word = len(clean_word(w["text"])) >= 9
        brk = (
            len(cur) >= per
            or (long_word and len(cur) >= 2)
            or re.search(r"[.?!,]$", w["text"])
            or nxt is None
            or nxt["start"] - w["end"] >= 0.25
        )
        if brk:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


def captions_html(words, groups, emph_extra, dur):
    data = []
    for gi, g in enumerate(groups):
        first, last = words[g[0]], words[g[-1]]
        start = max(0.12, first["start"] - 0.04)
        nxt = words[groups[gi + 1][0]]["start"] - 0.04 if gi + 1 < len(groups) else dur
        end = min(last["end"] + 0.35, nxt, dur)
        if end - start < 0.25:
            end = min(start + 0.25, dur)
        data.append({
            "start": round(start, 3), "end": round(end, 3),
            "words": [{"t": clean_word(words[k]["text"]), "s": words[k]["start"],
                       "e": words[k]["end"], "em": is_emphasis(words[k]["text"], emph_extra)}
                      for k in g],
        })
    b = BRAND
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap-group {{
      position: absolute; left: 0; top: 1100px; width: 100%; height: 300px;
      padding: 0 150px 0 110px; box-sizing: border-box;
      display: flex; flex-wrap: wrap; align-content: center; justify-content: center;
      gap: 4px 40px; opacity: 0; visibility: hidden; overflow: visible;
    }}
    .cap-word {{
      display: inline-block; font-family: "{b['font']}", sans-serif; font-weight: 900;
      line-height: 1.02; letter-spacing: -0.01em; color: {b['white']};
      text-shadow:
        0 0 2px #000, 5px 5px 0 #000, -5px 5px 0 #000, 5px -5px 0 #000, -5px -5px 0 #000,
        0 7px 0 #000, 0 -7px 0 #000, 7px 0 0 #000, -7px 0 0 #000, 0 14px 28px rgba(0,0,0,.55);
      transform-origin: 50% 60%;
    }}
    .cap-word.em {{ color: {b['green']}; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="{W}" data-height="{H}"
       data-layout-allow-overflow>
    <div id="cap-container"></div>
  </div>
  <script>
    (function () {{
      var GROUPS = {json.dumps(data)};
      var YELLOW = "{b['yellow']}", WHITE = "{b['white']}", GREEN = "{b['green']}";
      var container = document.getElementById("cap-container");
      var tl = gsap.timeline({{ paused: true }});
      var fit = (window.__hyperframes && window.__hyperframes.fitTextFontSize) || null;
      GROUPS.forEach(function (g, gi) {{
        var el = document.createElement("div");
        el.className = "cap-group";
        el.id = "cap-g" + gi;
        var text = g.words.map(function (w) {{ return w.t; }}).join(" ");
        var size = 112;
        if (fit) size = fit(text, {{ fontFamily: "{b['font']}", fontWeight: 900, maxWidth: 820 / 1.08,
                                    baseFontSize: 112, minFontSize: 64, step: 2 }}).fontSize;
        g.words.forEach(function (w, wi) {{
          var s = document.createElement("span");
          s.className = "cap-word" + (w.em ? " em" : "");
          s.id = "cap-g" + gi + "-w" + wi;
          s.textContent = w.t;
          s.style.fontSize = size + "px";
          el.appendChild(s);
        }});
        container.appendChild(el);

        tl.set(el, {{ visibility: "visible" }}, g.start);
        tl.fromTo(el, {{ opacity: 0, scale: 0.72 }},
                  {{ opacity: 1, scale: 1, duration: 0.14, ease: "back.out(2.4)" }}, g.start);
        g.words.forEach(function (w, wi) {{
          var we = el.children[wi];
          var on = Math.max(g.start, w.s);
          // the spoken word lights up: yellow (money stays green) and a small pop
          tl.to(we, {{ color: w.em ? GREEN : YELLOW, scale: 1.08, duration: 0.07, ease: "power2.out" }}, on);
          if (wi < g.words.length - 1) {{
            var off = Math.max(on + 0.08, Math.min(w.e, g.words[wi + 1].s));
            tl.to(we, {{ color: w.em ? GREEN : WHITE, scale: 1, duration: 0.08, ease: "power2.in" }}, off);
          }}
        }});
        tl.to(el, {{ opacity: 0, duration: 0.06, ease: "power2.in" }}, g.end - 0.06);
        tl.set(el, {{ opacity: 0, visibility: "hidden" }}, g.end);
      }});
      tl.seek(0);
      window.__timelines["captions"] = tl;
    }})();
  </script>
</template>
"""


def hook_markup(text):
    out = []
    for part in re.split(r"(\*[^*]+\*)", text):
        if part.startswith("*") and part.endswith("*"):
            out.append(f'<span class="hl">{html.escape(part[1:-1])}</span>')
        else:
            out.append(html.escape(part))
    return "".join(out)


def overlays_html(edit, dur):
    b = BRAND
    hook = edit.get("hook")
    callouts = edit.get("callouts", [])
    cta = edit.get("cta")
    els, tweens = [], []

    if hook and hook.get("text"):
        hd = min(float(hook.get("duration", 3.0)), dur)
        els.append(f'<div id="ov-hook" class="clip" data-start="0" data-duration="{hd}">'
                   f'<div id="ov-hook-box"><div id="ov-hook-text">{hook_markup(hook["text"])}</div></div></div>')
        # on screen at frame 0 (it is the thumbnail), then a small settle and a clean exit
        tweens.append('tl.fromTo("#ov-hook-box", {scale: 1.06}, {scale: 1, duration: 0.5, ease: "power3.out"}, 0);')
        tweens.append(f'tl.to("#ov-hook-box", {{opacity: 0, y: -30, duration: 0.25, ease: "power2.in"}}, {hd - 0.27:.3f});')

    for i, c in enumerate(callouts):
        at, cd = float(c["at"]), float(c.get("duration", 1.8))
        cd = min(cd, dur - at)
        if cd <= 0.3:
            continue
        col = b.get(c.get("color", "green"), b["green"])
        txt_col = b["white"] if c.get("color") == "red" else b["ink"]
        els.append(f'<div id="ov-c{i}" class="clip ov-callout" data-start="{at}" data-duration="{cd:.3f}">'
                   f'<div id="ov-c{i}-pill" class="ov-pill" style="background:{col};color:{txt_col}">'
                   f'{html.escape(c["text"])}</div></div>')
        tweens.append(f'tl.fromTo("#ov-c{i}-pill", {{scale: 0.4, rotation: -6, opacity: 0}}, '
                      f'{{scale: 1, rotation: -3, opacity: 1, duration: 0.28, ease: "back.out(2.2)"}}, {at});')
        tweens.append(f'tl.to("#ov-c{i}-pill", {{scale: 0.85, opacity: 0, duration: 0.18, ease: "power2.in"}}, {at + cd - 0.2:.3f});')

    if cta:
        cdur = min(float(cta.get("duration", 3.5)), dur)
        cs = round(dur - cdur, 3)
        els.append(
            f'<div id="ov-cta" class="clip" data-start="{cs}" data-duration="{cdur}">'
            f'<div id="ov-cta-scrim"></div>'
            f'<div id="ov-cta-card">'
            f'<div id="ov-cta-head">{html.escape(cta.get("headline", "I BUY HOUSES"))}</div>'
            f'<div id="ov-cta-kicker">{html.escape(cta.get("kicker", "CALL OR TEXT"))}</div>'
            f'<div id="ov-cta-phone">{html.escape(cta.get("phone", "918-268-8788"))}</div>'
            f'<div id="ov-cta-sub">{html.escape(cta.get("sub", "ANY CONDITION  ·  CASH  ·  FAST"))}</div>'
            f'</div></div>')
        tweens += [
            f'tl.fromTo("#ov-cta-scrim", {{opacity: 0}}, {{opacity: 1, duration: 0.35, ease: "power2.out"}}, {cs});',
            f'tl.fromTo("#ov-cta-head", {{y: 60, opacity: 0}}, {{y: 0, opacity: 1, duration: 0.35, ease: "power3.out"}}, {cs + 0.1:.3f});',
            f'tl.fromTo("#ov-cta-kicker", {{opacity: 0}}, {{opacity: 1, duration: 0.25}}, {cs + 0.35:.3f});',
            f'tl.fromTo("#ov-cta-phone", {{scale: 0.5, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)"}}, {cs + 0.45:.3f});',
            f'tl.fromTo("#ov-cta-sub", {{y: 20, opacity: 0}}, {{y: 0, opacity: 1, duration: 0.3, ease: "power2.out"}}, {cs + 0.75:.3f});',
            f'tl.to("#ov-cta-phone", {{scale: 1.06, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 1}}, {cs + 1.3:.3f});',
        ]

    stroke = ("0 0 2px #000, 5px 5px 0 #000, -5px 5px 0 #000, 5px -5px 0 #000, -5px -5px 0 #000, "
              "0 7px 0 #000, 0 -7px 0 #000, 7px 0 0 #000, -7px 0 0 #000")
    no_timeline = "" if els else " data-no-timeline"
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; font-family: "{b['font']}", sans-serif; }}
    #ov-hook {{ position: absolute; left: 0; top: 230px; width: 100%; display: flex; justify-content: center; }}
    #ov-hook-box {{ max-width: 900px; padding: 26px 40px 30px; border-radius: 28px;
                   background: rgba(10,10,10,.72); text-align: center; }}
    #ov-hook-text {{ color: {b['white']}; font-weight: 900; font-size: 84px; line-height: 1.04;
                    text-transform: uppercase; letter-spacing: -0.01em; }}
    #ov-hook-text .hl {{ color: {b['yellow']}; }}
    .ov-callout {{ position: absolute; left: 0; top: 560px; width: 100%; display: flex; justify-content: center; }}
    .ov-pill {{ font-weight: 900; font-size: 104px; line-height: 1; padding: 26px 46px 30px;
               border-radius: 26px; text-transform: uppercase; letter-spacing: -0.01em;
               box-shadow: 0 18px 50px rgba(0,0,0,.45); border: 6px solid #000; }}
    #ov-cta {{ position: absolute; inset: 0; }}
    #ov-cta-scrim {{ position: absolute; inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.70) 55%, rgba(0,0,0,.35) 100%); }}
    #ov-cta-card {{ position: absolute; left: 0; top: 380px; width: 100%; text-align: center; }}
    #ov-cta-head {{ color: {b['white']}; font-weight: 900; font-size: 132px; line-height: 1;
                   letter-spacing: -0.02em; text-shadow: {stroke}; }}
    #ov-cta-kicker {{ margin-top: 70px; color: {b['white']}; font-weight: 800; font-size: 46px; letter-spacing: .12em; }}
    #ov-cta-phone {{ margin: 18px auto 0; display: inline-block; color: {b['ink']}; background: {b['yellow']};
                    font-weight: 900; font-size: 112px; line-height: 1; padding: 22px 40px 26px; border-radius: 24px; }}
    #ov-cta-sub {{ margin-top: 48px; color: {b['white']}; font-weight: 800; font-size: 44px; letter-spacing: .06em; }}
  </style>
  <div id="root" data-composition-id="overlays" data-width="{W}" data-height="{H}"{no_timeline}>
    {''.join(els)}
  </div>
  <script>
    var tl = gsap.timeline({{ paused: true }});
    {chr(10).join('    ' + t for t in tweens).strip()}
    window.__timelines["overlays"] = tl;
  </script>
</template>
"""


def zoom_tweens(edit, joins, dur):
    z = edit.get("zooms", "auto")
    out = []
    if z == "auto":
        # alternate framing at every jump cut so cuts read as intentional, Hormozi style
        level = [1.0, 1.12]
        for i, t in enumerate(joins):
            out.append(f'tl.set("#cam", {{scale: {level[(i + 1) % 2]}}}, {t});')
        z = []
    for p in z or []:
        at, sc, d = float(p["at"]), float(p.get("scale", 1.15)), float(p.get("duration", 0.25))
        if at < dur:
            out.append(f'tl.to("#cam", {{scale: {sc}, duration: {d}, ease: "power3.out"}}, {at});')
            if "until" in p:
                out.append(f'tl.to("#cam", {{scale: 1, duration: 0.3, ease: "power2.inOut"}}, {float(p["until"])});')
    return out


def index_html(dur, zooms):
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; }}
      #cam {{ position: absolute; inset: 0; transform-origin: 50% 38%; }}
      #footage {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
      #captions {{ z-index: 30; }}
      #overlays {{ z-index: 20; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{dur}"
         data-width="{W}" data-height="{H}">
      <div id="cam">
        <video id="footage" class="clip" src="assets/cut.mp4" data-start="0" data-duration="{dur}"
               data-track-index="0" data-has-audio="true" playsinline></video>
      </div>
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html"
           data-start="0" data-duration="{dur}" data-track-index="1" data-track-kind="captions"
           data-width="{W}" data-height="{H}"></div>
      <div id="overlays" data-composition-id="overlays" data-composition-src="compositions/overlays.html"
           data-start="0" data-duration="{dur}" data-track-index="2" data-track-kind="graphics"
           data-width="{W}" data-height="{H}"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      tl.set("#cam", {{ scale: 1 }}, 0);
      {chr(10).join('      ' + t for t in zooms).strip()}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


def main():
    proj = sys.argv[1]
    edit = json.load(open(os.path.join(proj, "edit.json")))
    wj = json.load(open(os.path.join(proj, "words.json")))
    words, dur = wj["words"], round(wj["duration"] - 0.02, 3)
    per = int(edit.get("captions", {}).get("words_per_group", 3))
    extra = {w.lower() for w in edit.get("captions", {}).get("emphasis_words", [])}
    groups = group_words(words, per) if edit.get("captions", {}).get("enabled", True) else []

    write(os.path.join(proj, "compositions", "captions.html"), captions_html(words, groups, extra, dur))
    write(os.path.join(proj, "compositions", "overlays.html"), overlays_html(edit, dur))
    write(os.path.join(proj, "index.html"), index_html(dur, zoom_tweens(edit, wj.get("joins", []), dur)))
    os.makedirs(os.path.join(proj, "assets", "vendor"), exist_ok=True)
    shutil.copy(os.path.join(SKILL, "assets", "gsap.min.js"), os.path.join(proj, "assets", "vendor", "gsap.min.js"))
    slug = os.path.basename(os.path.abspath(proj))
    write(os.path.join(proj, "meta.json"), json.dumps({"id": slug, "name": slug}, indent=2))
    write(os.path.join(proj, "hyperframes.json"), json.dumps({
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True}, "authoringSkill": "hyperframes"}, indent=2))
    print(json.dumps({"ok": True, "duration": dur, "caption_groups": len(groups),
                      "callouts": len(edit.get("callouts", [])), "joins": len(wj.get("joins", []))}))


if __name__ == "__main__":
    main()
