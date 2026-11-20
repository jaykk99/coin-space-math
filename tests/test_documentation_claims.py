"""Source-level guardrails for claims about the static browser demonstration."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class DocumentationClaimsTest(unittest.TestCase):
    def test_static_runtime_is_disclosed(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8").lower()
        self.assertIn("not a hosted python execution service", readme)
        self.assertIn("not executed by a python interpreter", readme)
        self.assertIn("volume iv remains unpublished", readme)

    def test_site_is_static_and_uses_external_dependencies(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8").lower()
        self.assertIn("https://cdn.jsdelivr.net/", html)
        self.assertIn("https://cdn.tailwindcss.com", html)

if __name__ == "__main__":
    unittest.main()
