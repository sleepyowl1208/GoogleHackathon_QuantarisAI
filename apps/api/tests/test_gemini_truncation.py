import io
import json
import unittest
from unittest import mock

from apps.api.integrations.gemini_client import GeminiClient


def reply(text, finish="STOP"):
    return io.BytesIO(json.dumps({"candidates": [{"finishReason": finish, "content": {"parts": [{"text": text}]}}]}).encode())


class TruncationTests(unittest.TestCase):
    def test_a_cut_off_answer_is_retried_with_a_bigger_budget(self):
        client = GeminiClient(); client.key = "test-key"
        sent = []

        def fake(request, timeout=None):
            sent.append(json.loads(request.data)["generationConfig"]["maxOutputTokens"])
            return reply('{"a": 1', "MAX_TOKENS") if len(sent) == 1 else reply('{"a": 1}')

        with mock.patch("urllib.request.urlopen", fake):
            self.assertEqual(client.generate_json("s", [{"text": "x"}], {"type": "OBJECT"}, max_tokens=8000), {"a": 1})
        self.assertEqual(sent[0], 8000); self.assertGreater(sent[1], 12000); self.assertLessEqual(sent[1], 16000)

    def test_two_cut_offs_give_a_friendly_error_not_a_crash(self):
        from apps.api.domain.plan import PlanUnavailable
        client = GeminiClient(); client.key = "test-key"
        with mock.patch("urllib.request.urlopen", lambda r, timeout=None: reply('{"a"', "MAX_TOKENS")):
            with self.assertRaises(PlanUnavailable):
                client.generate_json("s", [{"text": "x"}], {"type": "OBJECT"}, max_tokens=8000)


if __name__ == "__main__":
    unittest.main()


class VeoClientTests(unittest.TestCase):
    def client(self):
        c = GeminiClient(); c.key = "test-key"; return c

    def run_check(self, payload):
        c = self.client()
        with mock.patch.object(GeminiClient, "_veo_request", return_value=payload):
            return c.check_video("operations/abc")

    def test_reading_the_state_of_a_clip(self):
        self.assertEqual(self.run_check({"done": False}), ("working", ""))
        self.assertEqual(self.run_check({"done": True, "response": {"generateVideoResponse": {"generatedSamples": [{"video": {"uri": "https://generativelanguage.googleapis.com/v1beta/files/x:download"}}]}}}), ("done", "https://generativelanguage.googleapis.com/v1beta/files/x:download"))
        self.assertEqual(self.run_check({"done": True, "error": {"message": "internal detail"}})[0], "failed")
        state, msg = self.run_check({"done": True, "response": {"generateVideoResponse": {"raiMediaFilteredReasons": ["blocked"]}}})
        self.assertEqual(state, "failed"); self.assertIn("declined", msg); self.assertNotIn("blocked", msg)   # internal reasons are not shown
        self.assertEqual(self.run_check({"done": True, "response": {}})[0], "failed")

    def test_only_google_download_links_with_a_real_video_inside_are_accepted(self):
        from apps.api.domain.plan import PlanUnavailable
        c = self.client()
        with self.assertRaises(PlanUnavailable): c.download_video("https://evil.example/v.mp4")
        with self.assertRaises(PlanUnavailable): c.download_video("http://generativelanguage.googleapis.com/v1/x")
        class Resp:
            def __init__(self, data): self.data = data
            def read(self, n=-1): return self.data[:n]
        with mock.patch("urllib.request.urlopen", lambda *a, **k: Resp(b"<html>not a video</html>")):
            with self.assertRaises(PlanUnavailable): c.download_video("https://generativelanguage.googleapis.com/v1beta/files/x:download")
        with mock.patch("urllib.request.urlopen", lambda *a, **k: Resp(b"\x00\x00\x00\x18ftypmp42" + b"0" * 10)):
            self.assertTrue(c.download_video("https://generativelanguage.googleapis.com/v1beta/files/x:download").startswith(b"\x00\x00\x00\x18ftyp"))
