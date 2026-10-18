import unittest

from apps.api.main import app, health


class HealthTests(unittest.TestCase):
    def test_health_answers_without_calling_the_ai(self):
        self.assertEqual(health(), {"status": "ok"})
        self.assertIn("/api/health", {r.path for r in app.routes})


if __name__ == "__main__":
    unittest.main()
