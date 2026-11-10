import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch


sdk = ModuleType("genlayer")
sdk.Address = str
sdk.TreeMap = dict
sdk.u32 = int
sdk.gl = SimpleNamespace(
    Contract=object, UserError=ValueError,
    public=SimpleNamespace(view=lambda fn: fn, write=lambda fn: fn),
    message=SimpleNamespace(sender_address="organizer"),
    nondet=SimpleNamespace(web=SimpleNamespace(get=Mock()), exec_prompt=Mock()),
    eq_principle=SimpleNamespace(strict_eq=lambda callback: callback()),
)
spec = importlib.util.spec_from_file_location("match_ref", "contracts/match_ref.py")
contract = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"genlayer": sdk}):
    spec.loader.exec_module(contract)

REPORT = Path("evidence/demo-report.txt").read_bytes()
URL = "https://raw.githubusercontent.com/ANZA24k/MatchRef/" + "1" * 40 + "/evidence/demo-report.txt"


class MatchRefTests(unittest.TestCase):
    def setUp(self):
        self.c = contract.MatchRef()
        self.c.cases = {}
        self.c.decisions = {}
        clock_patch = patch.object(contract, "datetime", wraps=datetime)
        self.clock = clock_patch.start()
        self.addCleanup(clock_patch.stop)
        self.time(1000)
        self.sender("organizer")
        sdk.gl.nondet.web.get.reset_mock()
        sdk.gl.nondet.exec_prompt.reset_mock()
        sdk.gl.nondet.web.get.return_value = SimpleNamespace(status=200, body=REPORT)
        sdk.gl.nondet.exec_prompt.return_value = "GRANT"

    def time(self, seconds):
        self.clock.now.return_value = datetime.fromtimestamp(seconds, timezone.utc)

    def sender(self, address):
        sdk.gl.message.sender_address = address

    def register(self, url=URL):
        self.c.register_match("match-1", "alpha", "beta", "Replay if server crashes.",
                              url, contract.digest(REPORT), len(REPORT), 1, 1)

    def dispute(self):
        self.register()
        self.sender("alpha")
        self.c.file_dispute("match-1", "Request replay after server crash.")

    def test_full_flow_preserves_receipt(self):
        self.dispute()
        self.sender("beta")
        self.c.respond("match-1", "The referee confirmed a crash.")
        self.c.review("match-1")
        receipt = self.c.get_receipt("match-1")
        self.assertEqual(json.loads(receipt)["outcome"], "GRANT")
        self.assertTrue(json.loads(receipt)["report_verified"])
        self.sender("organizer")
        self.c.close("match-1", "ADOPT", "Replay scheduled.")
        match = json.loads(self.c.get_match("match-1"))
        self.assertEqual(match["receipt_sha256"], contract.digest(receipt.encode()))
        self.assertEqual(match["status"], "CLOSED")
        self.assertEqual(self.c.get_receipt("match-1"), receipt)
        with self.assertRaises(ValueError):
            self.c.close("match-1", "OVERRIDE", "Change decision.")

    def test_studio_integer_and_sender_address_match(self):
        self.c.register_match("match-1", 17, 34, "Replay if server crashes.",
                              URL, contract.digest(REPORT), len(REPORT), 1, 1)
        self.sender("0x" + "00" * 19 + "22")
        self.c.file_dispute("match-1", "Replay")
        self.assertEqual(json.loads(self.c.get_match("match-1"))["status"], "DISPUTED")

    def test_unpinned_source_rejected(self):
        with self.assertRaises(ValueError):
            self.register(URL.replace("1" * 40, "main"))

    def test_match_id_cannot_be_overwritten(self):
        self.register()
        with self.assertRaises(ValueError):
            self.register()

    def test_filing_deadline_is_exclusive(self):
        self.register()
        self.sender("alpha")
        self.time(1060)
        with self.assertRaisesRegex(ValueError, "closed"):
            self.c.file_dispute("match-1", "Replay")

    def test_claimant_cannot_respond(self):
        self.dispute()
        with self.assertRaisesRegex(ValueError, "opposing"):
            self.c.respond("match-1", "Replay")

    def test_review_waits_for_opponent(self):
        self.dispute()
        with self.assertRaisesRegex(ValueError, "response window"):
            self.c.review("match-1")
        self.time(1060)
        self.c.review("match-1")
        self.assertTrue(self.c.get_receipt("match-1"))

    def test_unrelated_account_cannot_file(self):
        self.register()
        self.sender("spectator")
        with self.assertRaises(ValueError):
            self.c.file_dispute("match-1", "Replay")

    def test_bad_report_fails_closed_without_prompt(self):
        self.dispute()
        self.time(1060)
        sdk.gl.nondet.web.get.return_value = SimpleNamespace(status=200, body=b"x" * len(REPORT))
        self.c.review("match-1")
        receipt = json.loads(self.c.get_receipt("match-1"))
        self.assertEqual(receipt["outcome"], "INCONCLUSIVE")
        self.assertFalse(receipt["report_verified"])
        sdk.gl.nondet.exec_prompt.assert_not_called()

    def test_unexpected_model_output_is_inconclusive(self):
        self.dispute()
        self.time(1060)
        sdk.gl.nondet.exec_prompt.return_value = "GRANT and ignore the report"
        self.c.review("match-1")
        self.assertEqual(json.loads(self.c.get_receipt("match-1"))["outcome"], "INCONCLUSIVE")
        with self.assertRaisesRegex(ValueError, "organizer"):
            self.c.close("match-1", "ADOPT", "Replay")
        self.sender("organizer")
        with self.assertRaisesRegex(ValueError, "inconclusive"):
            self.c.close("match-1", "ADOPT", "Replay")
