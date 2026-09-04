#!/usr/bin/env python3
"""Independent stdlib verifier for the certificate's finite-search proof.

This intentionally does not import or execute the TypeScript evaluator. It verifies
wrapper integrity over the supplied canonical bytes, body/canonical structural equality,
and independently reconstructs the hybrid protocol/audit/minimum-witness proof.
Scientific evaluator replay remains the responsibility of the primary verifier.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any, NoReturn


class VerificationFailure(Exception):
    def __init__(self, check: str, detail: str, checks: list[dict[str, Any]]):
        super().__init__(f"{check}: {detail}")
        self.check = check
        self.detail = detail
        self.checks = checks


def fail(checks: list[dict[str, Any]], check: str, detail: str) -> NoReturn:
    checks.append({"check": check, "pass": False, "detail": detail})
    raise VerificationFailure(check, detail, checks)


def passed(checks: list[dict[str, Any]], check: str, detail: str) -> None:
    checks.append({"check": check, "pass": True, "detail": detail})


def record(value: Any, checks: list[dict[str, Any]], check: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(checks, check, "expected object")
    return value


def array(value: Any, checks: list[dict[str, Any]], check: str) -> list[Any]:
    if not isinstance(value, list):
        fail(checks, check, "expected array")
    return value


def finite_numbers(value: Any, path: str, checks: list[dict[str, Any]]) -> None:
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            fail(checks, "body.finite-json", f"non-finite number at {path}")
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            finite_numbers(item, f"{path}[{index}]", checks)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            finite_numbers(item, f"{path}.{key}", checks)
        return
    fail(checks, "body.finite-json", f"unsupported JSON value at {path}")


def canonical_structure(value: Any) -> str:
    # Structural equality / deterministic keys only; not claimed as RFC8785.
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def normalize_subset(value: Any, allowed: list[str], checks: list[dict[str, Any]], path: str) -> list[str]:
    raw = array(value, checks, path)
    if any(not isinstance(item, str) or not item for item in raw):
        fail(checks, path, "subset entries must be non-empty strings")
    if len(set(raw)) != len(raw):
        fail(checks, path, "duplicate subset entry")
    unknown = sorted(set(raw) - set(allowed))
    if unknown:
        fail(checks, path, f"unknown dimensions: {unknown}")
    return sorted(raw)


def observation_equal(left: Any, right: Any) -> bool:
    return canonical_structure(left) == canonical_structure(right)


def expected_hybrid(
    base: dict[str, Any], target: dict[str, Any], subset: list[str], coordinates: list[str]
) -> dict[str, Any]:
    chosen = set(subset)
    return {name: target[name] if name in chosen else base[name] for name in coordinates}


def verify(path: Path) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    wrapper = record(json.loads(path.read_text(encoding="utf-8")), checks, "wrapper.shape")
    expected_wrapper_keys = {"body", "canonical", "certificateHash", "certificateId"}
    if set(wrapper) != expected_wrapper_keys:
        fail(checks, "wrapper.keys", f"got {sorted(wrapper)}")
    passed(checks, "wrapper.keys", "exact")

    canonical = wrapper["canonical"]
    if not isinstance(canonical, str):
        fail(checks, "wrapper.canonical", "expected string")
    try:
        canonical_body = json.loads(canonical)
    except json.JSONDecodeError as error:
        fail(checks, "wrapper.canonical", f"invalid JSON: {error}")
    body = record(wrapper["body"], checks, "body.shape")
    finite_numbers(body, "$", checks)
    passed(checks, "body.finite-json", "all values finite JSON")
    if canonical_structure(canonical_body) != canonical_structure(body):
        fail(checks, "wrapper.body-binding", "parsed canonical bytes differ structurally from body")
    passed(checks, "wrapper.body-binding", "canonical bytes parse to body")

    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    if wrapper["certificateHash"] != digest:
        fail(checks, "wrapper.hash", "SHA-256 mismatch")
    expected_id = f"mpw-v2-{digest[:16]}"
    if wrapper["certificateId"] != expected_id:
        fail(checks, "wrapper.id", f"expected {expected_id}")
    passed(checks, "wrapper.hash-and-id", expected_id)

    if body.get("kind") != "ProtocolReconciliationCertificate" or body.get("schemaVersion") != 2:
        fail(checks, "body.identity", "unsupported kind/schemaVersion")
    if body.get("hashAlgorithm") != "SHA-256" or body.get("canonicalization") != "RFC8785/JCS":
        fail(checks, "body.identity", "unsupported hash/canonicalization declaration")
    if body.get("direction") not in {"A_TO_B", "B_TO_A"}:
        fail(checks, "body.direction", str(body.get("direction")))
    passed(checks, "body.identity", f"v2 {body['direction']}")

    schema = record(body.get("protocolSchema"), checks, "protocolSchema.shape")
    coordinates_raw = array(schema.get("coordinates"), checks, "protocolSchema.coordinates")
    coordinates: list[str] = []
    coordinate_values: dict[str, list[Any]] = {}
    for index, raw_coordinate in enumerate(coordinates_raw):
        coordinate = record(raw_coordinate, checks, f"protocolSchema.coordinates[{index}]")
        name = coordinate.get("name")
        values = coordinate.get("values")
        if not isinstance(name, str) or not name or name in coordinate_values:
            fail(checks, "protocolSchema.coordinates", f"invalid/duplicate coordinate {name!r}")
        if not isinstance(values, list) or not values:
            fail(checks, "protocolSchema.coordinates", f"coordinate {name} has no values")
        coordinates.append(name)
        coordinate_values[name] = values

    publications = record(body.get("publications"), checks, "publications.shape")
    publication_a = record(publications.get("A"), checks, "publications.A")
    publication_b = record(publications.get("B"), checks, "publications.B")
    protocol_a = record(publication_a.get("protocol"), checks, "publications.A.protocol")
    protocol_b = record(publication_b.get("protocol"), checks, "publications.B.protocol")
    if set(protocol_a) != set(coordinates) or set(protocol_b) != set(coordinates):
        fail(checks, "protocol.endpoints", "endpoint protocol keys differ from schema")
    for name in coordinates:
        if protocol_a[name] not in coordinate_values[name] or protocol_b[name] not in coordinate_values[name]:
            fail(checks, "protocol.endpoints", f"endpoint value outside schema for {name}")
    differences = sorted(name for name in coordinates if protocol_a[name] != protocol_b[name])
    exposed = normalize_subset(body.get("exposedDimensions"), differences, checks, "exposedDimensions")
    omitted = normalize_subset(body.get("omittedDifferences"), differences, checks, "omittedDifferences")
    if sorted(set(exposed) | set(omitted)) != differences or set(exposed) & set(omitted):
        fail(checks, "protocol.exposure", "exposed and omitted dimensions do not partition endpoint differences")
    passed(checks, "protocol.exposure", f"{len(exposed)} exposed, {len(omitted)} omitted")

    base_protocol = protocol_a if body["direction"] == "A_TO_B" else protocol_b
    target_protocol = protocol_b if body["direction"] == "A_TO_B" else protocol_a
    audit = array(body.get("audit"), checks, "audit.shape")
    rows_by_subset: dict[str, dict[str, Any]] = {}
    for index, raw_row in enumerate(audit):
        row = record(raw_row, checks, f"audit[{index}]")
        subset = normalize_subset(row.get("subset"), exposed, checks, f"audit[{index}].subset")
        subset_key = canonical_structure(subset)
        if subset_key in rows_by_subset:
            fail(checks, "audit.unique", f"duplicate subset {subset}")
        protocol = record(row.get("protocol"), checks, f"audit[{index}].protocol")
        if canonical_structure(protocol) != canonical_structure(expected_hybrid(base_protocol, target_protocol, subset, coordinates)):
            fail(checks, "audit.hybrid", f"protocol mismatch for subset {subset}")
        observation = record(row.get("observation"), checks, f"audit[{index}].observation")
        if not isinstance(observation.get("conclusion"), str):
            fail(checks, "audit.observation", f"missing conclusion for subset {subset}")
        if not isinstance(row.get("sufficient"), bool):
            fail(checks, "audit.sufficient", f"non-boolean sufficiency for subset {subset}")
        rows_by_subset[subset_key] = {"subset": subset, "protocol": protocol, "observation": observation, "sufficient": row["sufficient"]}

    decision = record(body.get("decision"), checks, "decision.shape")
    target_conclusion = decision.get("targetConclusion")
    if not isinstance(target_conclusion, str) or not target_conclusion:
        fail(checks, "decision.target", "targetConclusion must be a non-empty string")
    for row in rows_by_subset.values():
        expected_sufficient = row["observation"]["conclusion"] == target_conclusion
        if row["sufficient"] != expected_sufficient:
            fail(checks, "audit.sufficiency-replay", f"wrong sufficiency for {row['subset']}")
    passed(checks, "audit.sufficiency-replay", f"{len(audit)} rows")

    proof = record(body.get("proof"), checks, "proof.shape")
    expected_total = 1 << len(exposed)
    if proof.get("totalSubsetsExact") != str(expected_total):
        fail(checks, "proof.total", f"expected totalSubsetsExact={expected_total}")
    if proof.get("totalSubsets") not in {expected_total, None}:
        fail(checks, "proof.total", f"unexpected numeric total {proof.get('totalSubsets')}")
    if proof.get("evaluatedSubsets") != len(audit):
        fail(checks, "proof.evaluated", "evaluatedSubsets differs from audit length")
    if proof.get("landscapeExhaustive"):
        expected_keys = {
            canonical_structure(sorted(name for bit, name in enumerate(exposed) if mask & (1 << bit)))
            for mask in range(expected_total)
        }
        if set(rows_by_subset) != expected_keys:
            fail(checks, "proof.landscape", "exhaustive audit is missing or adding subsets")
    passed(checks, "proof.landscape", f"{len(rows_by_subset)}/{expected_total} subset rows")

    sufficient = [row["subset"] for row in rows_by_subset.values() if row["sufficient"]]
    if sufficient:
        minimum_cardinality = min(len(subset) for subset in sufficient)
        minimum_witnesses = sorted(
            (subset for subset in sufficient if len(subset) == minimum_cardinality),
            key=canonical_structure,
        )
    else:
        minimum_cardinality = None
        minimum_witnesses = []
    declared_witnesses = [normalize_subset(value, exposed, checks, "decision.minimumWitnesses[]") for value in array(decision.get("minimumWitnesses"), checks, "decision.minimumWitnesses")]
    declared_witnesses = sorted(declared_witnesses, key=canonical_structure)
    if decision.get("minimumCardinality") != minimum_cardinality or declared_witnesses != minimum_witnesses:
        fail(checks, "decision.minimum", f"recomputed {minimum_cardinality}/{minimum_witnesses}")
    if proof.get("minimumProven") is not True or proof.get("coMinimumComplete") is not True:
        fail(checks, "proof.minimum", "certificate does not claim a complete minimum proof")
    passed(checks, "decision.minimum", f"cardinality={minimum_cardinality}, witnesses={minimum_witnesses}")

    selected_raw = decision.get("selectedCandidate")
    selected = None if selected_raw is None else normalize_subset(selected_raw, exposed, checks, "decision.selectedCandidate")
    if not sufficient:
        expected_status = "NO_WITNESS"
    elif selected is None:
        expected_status = "UNSELECTED"
    else:
        selected_row = rows_by_subset.get(canonical_structure(selected))
        if selected_row is None:
            fail(checks, "decision.selected", "selected candidate absent from audit")
        if not selected_row["sufficient"]:
            expected_status = "NOT_SUFFICIENT"
        elif selected not in minimum_witnesses:
            expected_status = "NON_MINIMUM"
        else:
            expected_status = "VERIFIED"
    if decision.get("status") != expected_status:
        fail(checks, "decision.status", f"declared {decision.get('status')} != recomputed {expected_status}")
    passed(checks, "decision.status", expected_status)

    empty_row = rows_by_subset.get(canonical_structure([]))
    full_row = rows_by_subset.get(canonical_structure(exposed))
    source_replay = record(body.get("sourceReplay"), checks, "sourceReplay.shape")
    if empty_row is None or full_row is None:
        fail(checks, "sourceReplay.endpoints", "missing empty/full audit rows")
    if not observation_equal(empty_row["observation"], source_replay.get("base")):
        fail(checks, "sourceReplay.base", "base observation differs from empty-subset row")
    if not observation_equal(full_row["observation"], source_replay.get("target")):
        fail(checks, "sourceReplay.target", "target observation differs from full-subset row")
    if target_conclusion != full_row["observation"]["conclusion"]:
        fail(checks, "sourceReplay.target", "decision target differs from full-subset conclusion")
    passed(checks, "sourceReplay.endpoints", "empty/full rows agree")

    return {
        "status": "INDEPENDENT_AUDIT_VALID",
        "certificateId": wrapper["certificateId"],
        "scope": "wrapper hash + body binding + finite hybrid/audit/minimum proof; evaluator not rerun",
        "checks": checks,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("certificate", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.certificate), indent=2, ensure_ascii=False))
        return 0
    except (OSError, json.JSONDecodeError, VerificationFailure, ValueError) as error:
        checks = error.checks if isinstance(error, VerificationFailure) else []
        print(json.dumps({"status": "INVALID", "error": str(error), "checks": checks}, indent=2, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
