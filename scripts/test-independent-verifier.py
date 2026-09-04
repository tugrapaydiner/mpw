#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERIFIER = ROOT / "scripts" / "verify-certificate-audit.py"
CERTIFICATE = ROOT / "data" / "certificates" / "canonical-v2.json"


def run(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(VERIFIER), str(path)], text=True, capture_output=True, check=False)


def compact(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def rewrap(wrapper: dict) -> dict:
    canonical = compact(wrapper["body"])
    digest = hashlib.sha256(canonical.encode()).hexdigest()
    wrapper["canonical"] = canonical
    wrapper["certificateHash"] = digest
    wrapper["certificateId"] = f"mpw-v2-{digest[:16]}"
    return wrapper


def main() -> int:
    valid = run(CERTIFICATE)
    if valid.returncode != 0 or json.loads(valid.stdout).get("status") != "INDEPENDENT_AUDIT_VALID":
        raise AssertionError(valid.stderr or valid.stdout)

    original = json.loads(CERTIFICATE.read_text())
    cases: list[tuple[str, dict]] = []

    bad_sufficiency = json.loads(json.dumps(original))
    bad_sufficiency["body"]["audit"][0]["sufficient"] = not bad_sufficiency["body"]["audit"][0]["sufficient"]
    cases.append(("sufficiency", rewrap(bad_sufficiency)))

    bad_minimum = json.loads(json.dumps(original))
    bad_minimum["body"]["decision"]["minimumWitnesses"] = []
    cases.append(("minimum", rewrap(bad_minimum)))

    bad_hybrid = json.loads(json.dumps(original))
    row = bad_hybrid["body"]["audit"][1]
    key = next(iter(row["protocol"]))
    row["protocol"][key] = bad_hybrid["body"]["publications"]["B"]["protocol"][key]
    cases.append(("hybrid", rewrap(bad_hybrid)))

    bad_endpoint = json.loads(json.dumps(original))
    bad_endpoint["body"]["sourceReplay"]["target"]["conclusion"] = "INCONCLUSIVE"
    cases.append(("endpoint", rewrap(bad_endpoint)))

    with tempfile.TemporaryDirectory() as directory:
        for name, wrapper in cases:
            path = Path(directory) / f"{name}.json"
            path.write_text(json.dumps(wrapper), encoding="utf-8")
            result = run(path)
            if result.returncode == 0:
                raise AssertionError(f"tampered case {name} unexpectedly passed: {result.stdout}")

    print(json.dumps({"status": "PASS", "valid": 1, "tamperedRejected": len(cases)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
