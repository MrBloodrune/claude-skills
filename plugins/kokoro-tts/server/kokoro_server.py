#!/usr/bin/env python3
"""Persistent Kokoro TTS HTTP server.

Keeps the ONNX model resident in memory and serves TTS requests via HTTP.
Supports per-session playback tracking with interrupt capability.

Uses a threading.Event for safe cross-thread cancellation and a single-thread
executor for all sounddevice calls, avoiding portaudio corruption.
"""

import asyncio
import html
import logging
import os
import re
import sys
import threading
import unicodedata
import wave

import numpy as np
import sounddevice as sd
from aiohttp import web
from kokoro_onnx import Kokoro
from kokoro_onnx.config import SAMPLE_RATE

import mistune
from mistune.plugins.formatting import strikethrough as strikethrough_plugin

log = logging.getLogger("kokoro-server")


# --- Markdown stripping ---

class PlainTextRenderer(mistune.HTMLRenderer):
    def text(self, text):
        return text

    def emphasis(self, text):
        return text

    def strong(self, text):
        return text

    def codespan(self, text):
        return ""

    def block_code(self, code, info=None):
        return ""

    def link(self, text, url, title=None):
        return text or ""

    def image(self, alt, url, title=None):
        return alt or ""

    def heading(self, text, level, **attrs):
        return text + ". "

    def paragraph(self, text):
        return text + " "

    def list(self, text, ordered, **attrs):
        return text

    def list_item(self, text, **attrs):
        return text.strip() + ". "

    def thematic_break(self):
        return ""

    def block_quote(self, text):
        return text

    def linebreak(self):
        return " "

    def softbreak(self):
        return " "

    def block_html(self, html_text):
        return ""

    def inline_html(self, html_text):
        return ""

    def strikethrough(self, text):
        return text


_md_renderer = PlainTextRenderer()
_md_parser = mistune.create_markdown(renderer=_md_renderer, plugins=[strikethrough_plugin])


def strip_markdown(text: str) -> str:
    text = re.sub(r"https?://[^\s\)]+", "", text)
    text = re.sub(r"`[~/][^`]+`", "", text)
    text = re.sub(r"(?:^|\s)~/[a-zA-Z0-9_./-]+", " ", text)
    text = re.sub(r"(?:^|\s)/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_./-]*", " ", text)
    text = re.sub(r"^\|.*\|$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\|[-:\s|]+\|\s*$", "", text, flags=re.MULTILINE)

    result = _md_parser(text)

    result = re.sub(r"`", "", result)
    result = re.sub(r"\[\]|\(\)", "", result)
    result = re.sub(r"\s+", " ", result)
    result = "".join(
        c for c in result
        if unicodedata.category(c) != "So" and not (0xFE00 <= ord(c) <= 0xFE0F)
    )
    result = html.unescape(result)
    result = re.sub(r"\s+", " ", result)
    return result.strip()


# --- Thread-safe audio playback ---

def play_samples_interruptible(samples: np.ndarray, sr: int, cancel: threading.Event):
    """Play audio samples, checking cancel event. All sd calls on same thread."""
    if cancel.is_set():
        return
    sd.play(samples, samplerate=sr)
    while sd.get_stream().active:
        if cancel.is_set():
            sd.stop()
            return
        cancel.wait(timeout=0.05)


# --- Server ---

class KokoroServer:
    def __init__(self, model_path: str, voices_path: str):
        log.info("Loading Kokoro model from %s", model_path)
        self.kokoro = Kokoro(model_path, voices_path)
        log.info("Model loaded successfully")
        self.active_playbacks: dict[str, asyncio.Task] = {}
        self.cancel_events: dict[str, threading.Event] = {}
        self._audio_executor = None

    def _get_audio_executor(self):
        if self._audio_executor is None:
            from concurrent.futures import ThreadPoolExecutor
            self._audio_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="audio")
        return self._audio_executor

    async def _play_stream(self, text: str, voice: str, speed: float, session_id: str):
        cancel = self.cancel_events.get(session_id)
        if not cancel:
            return
        try:
            stream = self.kokoro.create_stream(text, voice=voice, speed=speed)
            loop = asyncio.get_event_loop()
            executor = self._get_audio_executor()
            async for samples, sr in stream:
                if cancel.is_set():
                    break
                await loop.run_in_executor(
                    executor, play_samples_interruptible, samples, sr, cancel
                )
                if cancel.is_set():
                    break
        except asyncio.CancelledError:
            log.info("Playback cancelled for session %s", session_id)
        except Exception:
            log.exception("Playback error for session %s", session_id)
        finally:
            self.active_playbacks.pop(session_id, None)
            self.cancel_events.pop(session_id, None)

    def _cancel_session(self, session_id: str):
        cancel = self.cancel_events.get(session_id)
        if cancel:
            cancel.set()
        existing = self.active_playbacks.get(session_id)
        if existing and not existing.done():
            existing.cancel()

    async def handle_speak(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "invalid json"}, status=400)

        text = data.get("text", "").strip()
        if not text:
            return web.json_response({"error": "empty text"}, status=400)

        session_id = data.get("session_id", "default")
        voice = data.get("voice", "af_sky")
        speed = float(data.get("speed", 1.0))
        do_strip = data.get("strip_markdown", True)

        if do_strip:
            text = strip_markdown(text)
            if not text:
                return web.json_response({"status": "empty_after_strip"})

        was_active = session_id in self.active_playbacks and not self.active_playbacks[session_id].done()
        self._cancel_session(session_id)
        if was_active:
            await asyncio.sleep(0.1)

        cancel = threading.Event()
        self.cancel_events[session_id] = cancel
        task = asyncio.create_task(self._play_stream(text, voice, speed, session_id))
        self.active_playbacks[session_id] = task

        return web.json_response({"status": "playing", "session_id": session_id})

    async def handle_interrupt(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "invalid json"}, status=400)

        session_id = data.get("session_id", "default")
        existing = self.active_playbacks.get(session_id)
        if existing and not existing.done():
            self._cancel_session(session_id)
            return web.json_response({"status": "interrupted", "session_id": session_id})
        return web.json_response({"status": "nothing_playing", "session_id": session_id})

    async def handle_cleanup(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "invalid json"}, status=400)

        session_id = data.get("session_id", "default")
        self._cancel_session(session_id)
        self.active_playbacks.pop(session_id, None)
        self.cancel_events.pop(session_id, None)
        return web.json_response({"status": "cleaned", "session_id": session_id})

    async def handle_interrupt_all(self, request: web.Request) -> web.Response:
        sessions = [
            sid for sid, task in self.active_playbacks.items()
            if not task.done()
        ]
        for sid in sessions:
            self._cancel_session(sid)
        return web.json_response({
            "status": "interrupted",
            "sessions_cancelled": len(sessions),
        })

    async def handle_play_sound(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "invalid json"}, status=400)

        sound = data.get("sound", "").strip()
        valid_sounds = {"working", "done", "attention", "error"}
        if sound not in valid_sounds:
            return web.json_response(
                {"error": f"invalid sound, must be one of: {', '.join(sorted(valid_sounds))}"},
                status=400,
            )

        session_id = data.get("session_id", "default")
        volume = float(data.get("volume", 1.0))

        assets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
        wav_path = os.path.join(assets_dir, f"{sound}.wav")

        if not os.path.isfile(wav_path):
            return web.json_response({"error": f"asset not found: {sound}.wav"}, status=404)

        with wave.open(wav_path, "rb") as wf:
            frames = wf.readframes(wf.getnframes())
            samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            sr = wf.getframerate()

        if volume != 1.0:
            samples = samples * volume

        self._cancel_session(session_id)
        cancel = threading.Event()
        self.cancel_events[session_id] = cancel
        executor = self._get_audio_executor()
        loop = asyncio.get_event_loop()

        async def _play():
            try:
                await loop.run_in_executor(executor, play_samples_interruptible, samples, sr, cancel)
            finally:
                self.active_playbacks.pop(session_id, None)
                self.cancel_events.pop(session_id, None)

        task = asyncio.create_task(_play())
        self.active_playbacks[session_id] = task

        return web.json_response({"status": "playing", "sound": sound, "session_id": session_id})

    async def handle_health(self, request: web.Request) -> web.Response:
        active = {k: not v.done() for k, v in self.active_playbacks.items()}
        return web.json_response({
            "status": "ok",
            "model": os.path.basename(self.kokoro.config.model_path),
            "voices": list(self.kokoro.get_voices()),
            "active_sessions": sum(1 for v in active.values() if v),
        })


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    model_path = os.environ.get(
        "KOKORO_MODEL",
        os.path.expanduser("~/.local/share/kokoro-tts/kokoro-v1.0.onnx"),
    )
    voices_path = os.environ.get(
        "KOKORO_VOICES",
        os.path.expanduser("~/.local/share/kokoro-tts/voices-v1.0.bin"),
    )
    port = int(os.environ.get("KOKORO_PORT", "6789"))

    server = KokoroServer(model_path, voices_path)
    app = web.Application()
    app.router.add_post("/speak", server.handle_speak)
    app.router.add_post("/interrupt", server.handle_interrupt)
    app.router.add_post("/interrupt-all", server.handle_interrupt_all)
    app.router.add_post("/cleanup", server.handle_cleanup)
    app.router.add_get("/health", server.handle_health)
    app.router.add_post("/play-sound", server.handle_play_sound)

    log.info("Starting Kokoro TTS server on 127.0.0.1:%d", port)
    web.run_app(app, host="127.0.0.1", port=port, print=None)


if __name__ == "__main__":
    main()
