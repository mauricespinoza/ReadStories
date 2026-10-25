#!/usr/bin/env python3
"""Record the CamiloReading audio with Kokoro neural voices (offline, free).

Run this ONCE on your own computer (it needs ~1 GB of free disk and some patience).
It records every word and every sentence of every story, for each voice, as small
mp3 files, and writes data/audio.js so the app knows what exists.

  pip install kokoro-onnx numpy        (also needs ffmpeg:  brew/apt/choco install ffmpeg)
  python3 tools/make_audio.py                         # the 2 default voices (light: ~10 MB, quick)
  python3 tools/make_audio.py --voices af_heart       # just one voice
  python3 tools/make_audio.py --voices af_heart,bf_emma   # any voices from the lists below
  python3 tools/make_audio.py --hq                    # full-size model: better quality, 3x heavier/slower
  python3 tools/make_audio.py --engine test-tone      # fake tones, only to test the app (no model)

  python3 tools/make_audio.py --es-voices em_alex     # Spanish voice: ef_dora (default, female) or em_alex (male)
  python3 tools/make_audio.py --es-voices none        # skip Spanish

The voices you list in a run are exactly the ones the app offers (data/audio.js is rewritten).
Spanish voices record only the sentences (for "Escuchar en español"), not single words.

It is safe to stop (Ctrl+C) and run again: finished files are skipped. After adding
stories to content/stories.txt, just run it again and only the new text is recorded.

Output:
  audio/<voice>/w/<word>.mp3            one file per word
  audio/<voice>/s/<story>/<n>.mp3       one file per sentence (0 = title)
  audio/<voice>/preview.mp3             sample used in the voice picker
  audio/<voice>/greeting.mp3            opening greeting (English voices)
  audio/<voice>/timings.json            where each word starts/ends inside each sentence
  data/audio.js                         index read by the app
"""
import argparse, hashlib, json, math, re, shutil, subprocess, sys, urllib.request, pathlib

try:
    import numpy as np
except ImportError:
    sys.exit("Missing numpy.  Run:  pip install numpy kokoro-onnx")

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build import parse_stories, WORD_RE  # noqa: E402

# ---------------------------------------------------------------------------
# The voices offered to the child. Edit freely: ids come from Kokoro's voice list
# (af_ = American female, am_ = American male, bf_ = British female, bm_ = British male).
# ---------------------------------------------------------------------------
VOICES = [   # offered by default: two voices keep the app light for tablets
    {"id": "af_heart",   "name": "Heart",   "accent": "us", "gender": "f"},
    {"id": "am_michael", "name": "Michael", "accent": "us", "gender": "m"},
]
EXTRA_VOICES = [   # available on request with --voices
    {"id": "af_bella",   "name": "Bella",   "accent": "us", "gender": "f"},
    {"id": "am_adam",    "name": "Adam",    "accent": "us", "gender": "m"},
    {"id": "bf_emma",    "name": "Emma",    "accent": "uk", "gender": "f"},
    {"id": "bm_george",  "name": "George",  "accent": "uk", "gender": "m"},
]
ALL_VOICES = VOICES + EXTRA_VOICES
ES_VOICES = [      # Spanish (Kokoro has few Spanish voices; quality is good but less polished than English)
    {"id": "ef_dora", "name": "Dora", "gender": "f"},
    {"id": "em_alex", "name": "Alex", "gender": "m"},
]
ES_DEFAULT = "ef_dora"
ES_WORD_RE = re.compile(r"[^\W\d_]+(?:['\u2019][^\W\d_]+)*")   # same words as the app's Spanish pane
GREETING = "Hello {name}, let's read beautiful stories together!"   # spoken when the app opens
SENTENCE_SPEED = 0.95   # a little slower than adult speech, good for learners
WORD_SPEED = 0.90
MP3_BITRATE = "32k"
MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"

# ---------------------------------------------------------------------------
# Engines
# ---------------------------------------------------------------------------
class KokoroEngine:
    sr = 24000

    def __init__(self, int8=False):
        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            sys.exit("Missing kokoro-onnx.  Run:  pip install kokoro-onnx numpy")
        models = ROOT / "tools" / "models"
        models.mkdir(parents=True, exist_ok=True)
        onnx = "kokoro-v1.0.int8.onnx" if int8 else "kokoro-v1.0.onnx"
        for name in (onnx, "voices-v1.0.bin"):
            self._fetch(MODEL_URL + name, models / name)
        self.k = Kokoro(str(models / onnx), str(models / "voices-v1.0.bin"))

    @staticmethod
    def _fetch(url, dest):
        if dest.exists() and dest.stat().st_size > 1_000_000:
            return
        print(f"Downloading {dest.name} ...")
        try:
            tmp = dest.with_suffix(dest.suffix + ".part")
            with urllib.request.urlopen(url) as r, open(tmp, "wb") as f:
                total = int(r.headers.get("Content-Length") or 0)
                done = 0
                while chunk := r.read(1 << 20):
                    f.write(chunk); done += len(chunk)
                    if total:
                        print(f"\r  {done / 1e6:6.0f} / {total / 1e6:.0f} MB", end="", flush=True)
            tmp.rename(dest); print()
        except Exception as e:
            sys.exit(f"\nCould not download {url}\n  ({e})\nDownload it by hand from the Releases page of "
                     f"github.com/thewh1teagle/kokoro-onnx (tag model-files-v1.0) and put it in {dest.parent}")

    def say(self, text, voice, speed):
        lang = {"a": "en-us", "b": "en-gb", "e": "es"}.get(voice[0], "en-us")
        samples, sr = self.k.create(text, voice=voice, speed=speed, lang=lang)
        return np.asarray(samples, dtype=np.float32), sr


class ToneEngine:
    """Fake 'voice' made of beeps. ONLY for testing the app without the model."""
    sr = 24000

    def __init__(self, **_):
        pass

    def say(self, text, voice, speed):
        f0 = 180 + (sum(map(ord, voice)) % 200)
        out = [np.zeros(int(self.sr * 0.08), dtype=np.float32)]
        for m in re.finditer(r"[^\W\d_]+(?:'[^\W\d_]+)*|[.,!?;:]", text):
            tok = m.group(0)
            if tok in ".!?":
                out.append(np.zeros(int(self.sr * 0.35), dtype=np.float32)); continue
            if tok in ",;:":
                out.append(np.zeros(int(self.sr * 0.18), dtype=np.float32)); continue
            d = (0.07 + 0.05 * len(tok)) / speed
            t = np.arange(int(self.sr * d)) / self.sr
            env = np.minimum(1, np.minimum(t, d - t) / 0.02)
            out.append((0.3 * env * np.sin(2 * math.pi * (f0 + 12 * len(tok)) * t)).astype(np.float32))
            out.append(np.zeros(int(self.sr * 0.05), dtype=np.float32))
        return np.concatenate(out), self.sr


# ---------------------------------------------------------------------------
# Audio helpers
# ---------------------------------------------------------------------------
def trim(samples, sr, thresh=0.006, pad=0.03):
    idx = np.where(np.abs(samples) > thresh)[0]
    if not len(idx):
        return samples
    a = max(0, idx[0] - int(pad * sr)); b = min(len(samples), idx[-1] + int(pad * sr))
    return samples[a:b]


def write_mp3(samples, sr, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-",
           "-codec:a", "libmp3lame", "-b:a", MP3_BITRATE, str(path)]
    p = subprocess.run(cmd, input=pcm, capture_output=True)
    if p.returncode:
        sys.exit("ffmpeg failed: " + p.stderr.decode(errors="replace"))
    return len(samples) / sr


def align(samples, sr, text, word_re=WORD_RE):
    """Boundaries b[0..n]: word i is heard between b[i] and b[i+1] (seconds).

    First guess = proportional to word length (+ extra for pauses at punctuation),
    then each boundary is moved to the quietest moment nearby, which is where the
    speaker really separates the words."""
    toks = [(m.start(), m.end()) for m in word_re.finditer(text)]
    n = len(toks)
    if n == 0:
        return []
    dur = len(samples) / sr
    weights = []
    for i, (s, e) in enumerate(toks):
        w = (e - s) + 1.5
        if i < n - 1:
            gap = text[e:toks[i + 1][0]]
            if re.search(r"[.!?]", gap): w += 5
            elif re.search(r"[,;:—–-]", gap): w += 3
        weights.append(w)
    cum = np.cumsum(weights)
    guess = [0.0] + list(cum[:-1] / cum[-1] * dur) + [dur]

    hop = sr // 100
    nfr = max(1, len(samples) // hop)
    fr = samples[: nfr * hop].reshape(nfr, hop)
    en = np.sqrt((fr ** 2).mean(axis=1))
    en = np.convolve(en, np.ones(3) / 3, mode="same")
    en = en / (en.max() or 1)

    b = [0.0]
    prev = 0
    for i in range(1, n):
        c = int(round(guess[i] * 100))
        lo, hi = max(prev + 5, c - 12), min(nfr - 1, c + 12)
        if lo >= hi:
            f = min(max(c, prev + 5), nfr - 1)
        else:
            f = min(range(lo, hi + 1), key=lambda k: en[k] + 0.004 * abs(k - c))
        b.append(f / 100 + 0.005); prev = f
    b.append(dur)
    return [round(x, 2) for x in b]


def safe(word):
    return word.replace("'", "_")


def digest(*parts):
    return hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:8]


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voices", help="comma list of voice ids (default: " + ",".join(v["id"] for v in VOICES) + ")")
    ap.add_argument("--engine", choices=["kokoro", "test-tone"], default="kokoro")
    ap.add_argument("--hq", action="store_true", help="use the full-size model (default: the light int8 model)")
    ap.add_argument("--force", action="store_true", help="record everything again")
    ap.add_argument("--name", default="Camilo", help="name used in the opening greeting (default: Camilo)")
    ap.add_argument("--es-voices", default=ES_DEFAULT, help="Spanish voice ids, comma list, or 'none' (default: ef_dora)")
    ap.add_argument("--out", default=str(ROOT / "audio"), help="folder for the mp3 files")
    ap.add_argument("--manifest", default=str(ROOT / "data" / "audio.js"), help="where to write the index")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found. Install it first (macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg · Windows: choco install ffmpeg).")

    out = pathlib.Path(args.out)
    wanted = [v.strip() for v in args.voices.split(",")] if args.voices else [v["id"] for v in VOICES]
    known = {v["id"]: v for v in ALL_VOICES}
    bad = [w for w in wanted if w not in known]
    if bad or not wanted:
        sys.exit(f"Unknown voice(s): {', '.join(bad)}. Known ids: " + ", ".join(known))
    voices = [known[w] for w in wanted]
    es_known = {v["id"]: v for v in ES_VOICES}
    es_wanted = [] if args.es_voices.strip().lower() == "none" else [v.strip() for v in args.es_voices.split(",") if v.strip()]
    bad = [w for w in es_wanted if w not in es_known]
    if bad:
        sys.exit(f"Unknown Spanish voice(s): {', '.join(bad)}. Known ids: " + ", ".join(es_known))
    es_voices = [es_known[w] for w in es_wanted]

    stories = parse_stories(ROOT / "content" / "stories.txt")
    words = sorted({w.lower().replace("’", "'") for s in stories for p in s["paragraphs"] for en, _ in p
                    for w in WORD_RE.findall(en)} | {w.lower() for s in stories for w in WORD_RE.findall(s["title"])})
    sents, sents_es = [], []  # (story_id, n, text)
    for s in stories:
        sents.append((s["id"], 0, s["title"]))
        sents_es.append((s["id"], 0, s.get("title_es", "")))
        n = 1
        for p in s["paragraphs"]:
            for en, es in p:
                sents.append((s["id"], n, en)); sents_es.append((s["id"], n, es)); n += 1

    engine = (KokoroEngine(int8=not args.hq) if args.engine == "kokoro" else ToneEngine())
    print(f"English: {len(words)} words + {len(sents)} sentences, {len(voices)} voice(s).  "
          f"Spanish: {len(sents_es)} sentences, {len(es_voices)} voice(s).")

    for vi, v in enumerate(voices, 1):
        vid, vdir = v["id"], out / v["id"]
        tpath = vdir / "timings.json"
        timings = json.loads(tpath.read_text()) if tpath.exists() else {}
        todo = 0
        # preview
        pv = vdir / "preview.mp3"
        if args.force or not pv.exists():
            smp, sr = engine.say(f"Hello! My name is {v['name']}. Let's read a story together.", vid, SENTENCE_SPEED)
            write_mp3(trim(smp, sr), sr, pv)
        # greeting for the opening screen
        gm, gt = vdir / "greeting.mp3", vdir / "greeting.txt"
        if args.force or not gm.exists() or not gt.exists() or gt.read_text(encoding="utf-8") != args.name:
            smp, sr = engine.say(GREETING.format(name=args.name), vid, SENTENCE_SPEED)
            write_mp3(trim(smp, sr), sr, gm)
            gt.write_text(args.name, encoding="utf-8")
        # words
        for i, w in enumerate(words, 1):
            f = vdir / "w" / f"{safe(w)}.mp3"
            if f.exists() and not args.force:
                continue
            todo += 1
            smp, sr = engine.say(w + ".", vid, WORD_SPEED)
            write_mp3(trim(smp, sr), sr, f)
            if i % 25 == 0:
                print(f"\r[{vi}/{len(voices)} {vid}] words {i}/{len(words)}   ", end="", flush=True)
        # sentences
        for j, (sid, n, text) in enumerate(sents, 1):
            f = vdir / "s" / sid / f"{n}.mp3"
            h = digest(text, vid, SENTENCE_SPEED, args.engine)
            cur = timings.get(sid, {}).get(str(n))
            if f.exists() and cur and cur.get("h") == h and not args.force:
                continue
            todo += 1
            smp, sr = engine.say(text, vid, SENTENCE_SPEED)
            smp = trim(smp, sr)
            write_mp3(smp, sr, f)
            timings.setdefault(sid, {})[str(n)] = {"h": h, "b": align(smp, sr, text)}
            tpath.parent.mkdir(parents=True, exist_ok=True)
            tpath.write_text(json.dumps(timings, separators=(",", ":")))
            if j % 10 == 0:
                print(f"\r[{vi}/{len(voices)} {vid}] sentences {j}/{len(sents)}   ", end="", flush=True)
        tpath.write_text(json.dumps(timings, separators=(",", ":")))
        print(f"\r[{vi}/{len(voices)} {vid}] done ({todo} new files)            ")

    for vi, v in enumerate(es_voices, 1):
        vid, vdir = v["id"], out / v["id"]
        tpath = vdir / "timings.json"
        timings = json.loads(tpath.read_text()) if tpath.exists() else {}
        todo = 0
        pv = vdir / "preview.mp3"
        if args.force or not pv.exists():
            smp, sr = engine.say(f"¡Hola! Me llamo {v['name']}. ¡Vamos a leer un cuento juntos!", vid, SENTENCE_SPEED)
            write_mp3(trim(smp, sr), sr, pv)
        for j, (sid, n, text) in enumerate(sents_es, 1):
            if not text.strip():
                continue
            f = vdir / "s" / sid / f"{n}.mp3"
            h = digest(text, vid, SENTENCE_SPEED, args.engine)
            cur = timings.get(sid, {}).get(str(n))
            if f.exists() and cur and cur.get("h") == h and not args.force:
                continue
            todo += 1
            smp, sr = engine.say(text, vid, SENTENCE_SPEED)
            smp = trim(smp, sr)
            write_mp3(smp, sr, f)
            timings.setdefault(sid, {})[str(n)] = {"h": h, "b": align(smp, sr, text, ES_WORD_RE)}
            tpath.parent.mkdir(parents=True, exist_ok=True)
            tpath.write_text(json.dumps(timings, separators=(",", ":")))
            if j % 10 == 0:
                print(f"\r[ES {vi}/{len(es_voices)} {vid}] sentences {j}/{len(sents_es)}   ", end="", flush=True)
        tpath.parent.mkdir(parents=True, exist_ok=True)
        tpath.write_text(json.dumps(timings, separators=(",", ":")))
        print(f"\r[ES {vi}/{len(es_voices)} {vid}] done ({todo} new files)            ")

    write_manifest(out, pathlib.Path(args.manifest), voices, es_voices)
    allv = voices + es_voices
    mine = sum(f.stat().st_size for v in allv for f in (out / v["id"]).rglob("*.mp3")) / 1e6
    print(f"\nOffered voices: {', '.join(v['name'] for v in allv)} ({mine:.1f} MB).  Index written to {args.manifest}")
    stale = [d.name for d in out.iterdir() if d.is_dir() and d.name not in {v['id'] for v in allv}] if out.exists() else []
    if stale:
        print("Not offered (you can delete these folders from audio/ to save space): " + ", ".join(stale))


def write_manifest(out, manifest_path, voices, es_voices=()):
    """Describe, for the voices offered in this run, which words and sentences have audio."""
    entries = []
    for v in voices:
        vid, vdir = v["id"], out / v["id"]
        wl = sorted(p.stem.replace("_", "'") for p in (vdir / "w").glob("*.mp3"))
        t = json.loads((vdir / "timings.json").read_text()) if (vdir / "timings.json").exists() else {}
        t = {sid: {n: d["b"] for n, d in ns.items() if (vdir / "s" / sid / f"{n}.mp3").exists()} for sid, ns in t.items()}
        entries.append({
            "id": vid, "name": v["name"], "accent": v["accent"], "gender": v["gender"],
            "preview": (vdir / "preview.mp3").exists(),
            "greeting": (vdir / "greeting.mp3").exists() and (vdir / "greeting.txt").exists(),
            "greetName": (vdir / "greeting.txt").read_text(encoding="utf-8") if (vdir / "greeting.txt").exists() else "",
            "words": " ".join(wl), "sent": t,
        })
    es_entries = []
    for v in es_voices:
        vid, vdir = v["id"], out / v["id"]
        t = json.loads((vdir / "timings.json").read_text()) if (vdir / "timings.json").exists() else {}
        t = {sid: {n: d["b"] for n, d in ns.items() if (vdir / "s" / sid / f"{n}.mp3").exists()} for sid, ns in t.items()}
        es_entries.append({"id": vid, "name": v["name"], "gender": v["gender"],
                           "preview": (vdir / "preview.mp3").exists(), "sent": t})
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        "// Generated by tools/make_audio.py — do not edit.\n"
        "window.AUDIO = " + json.dumps({"base": "audio/", "voices": entries, "es": es_entries}, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")


if __name__ == "__main__":
    main()
