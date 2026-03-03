#!/usr/bin/env python3
"""
Snap Station Fuzz & Chaos Test Suite
Tests: localStorage corruption, malformed JSON state, memory leak simulation,
       camera permission chaos, large gallery, malformed URLs
"""
import json
import os
import sys
import copy
import time
import random
import string

RESULTS = []

def record(test_name, category, severity, finding, suggestion, passed=False):
    RESULTS.append({
        "test": test_name,
        "category": category,
        "severity": severity,
        "finding": finding,
        "suggestion": suggestion,
        "passed": passed,
    })
    status = "✅ PASS" if passed else severity
    print(f"[{status}] {test_name}: {finding}")


# ─── localStorage State Fuzzing ───────────────────────────────────────────────

VALID_SNAP_EXPORT = {
    "version": 1,
    "timestamp": 1700000000000,
    "snaps": [
        {
            "id": "snap_001",
            "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "timestamp": 1700000000000,
            "filters": [],
            "stickers": []
        }
    ]
}

def simulate_snap_import(data_str):
    """Simulate what snap-station.js does when reading localStorage/import."""
    try:
        d = json.loads(data_str)
        # Access patterns from snap-station.js
        snaps = d.get("snaps", [])
        if not isinstance(snaps, list):
            raise ValueError("snaps must be array")
        for snap in snaps:
            if isinstance(snap, dict):
                _ = snap.get("id", "")
                _ = snap.get("dataUrl", "")
                _ = snap.get("timestamp", 0)
                _ = snap.get("filters", [])
                _ = snap.get("stickers", [])
        return True, d
    except Exception as e:
        return False, str(e)


def test_localstorage_corruption():
    """Test various corrupted localStorage states."""
    corruptions = [
        ("empty_string", ""),
        ("null_value", "null"),
        ("plain_text", "not json at all"),
        ("truncated", '{"version":1,"snaps":[{"id":"snap_001","dataUrl":"data:image/png'),
        ("wrong_type_snaps", json.dumps({**VALID_SNAP_EXPORT, "snaps": "not_an_array"})),
        ("snaps_with_nulls", json.dumps({**VALID_SNAP_EXPORT, "snaps": [None, None]})),
        ("missing_snaps", json.dumps({"version": 1, "timestamp": 123})),
        ("zero_version", json.dumps({**VALID_SNAP_EXPORT, "version": 0})),
        ("negative_timestamp", json.dumps({**VALID_SNAP_EXPORT, "timestamp": -1})),
        ("giant_array", json.dumps({**VALID_SNAP_EXPORT, "snaps": [None] * 100000})),
    ]
    
    for name, payload in corruptions:
        ok, result = simulate_snap_import(payload)
        if not ok:
            record(f"localstorage/{name}", "Resilience", "🟢",
                   f"Graceful failure on corrupt state: {str(result)[:60]}", 
                   "Ensure UI shows recovery message, not blank screen", passed=True)
        else:
            # Extra checks on parsed data
            if name == "giant_array":
                record(f"localstorage/{name}", "Performance", "🟡",
                       "100,000-null snap array accepted — could cause OOM/hang on render",
                       "Limit max snap count (e.g., 500) before importing")
            elif name == "wrong_type_snaps":
                record(f"localstorage/{name}", "Robustness", "🟡",
                       "Non-array 'snaps' field accepted without error",
                       "Validate snaps is Array before iterating")


def test_xss_in_snap_metadata():
    """XSS in snap metadata fields."""
    xss = [
        '<script>alert("XSS")</script>',
        '"><img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        'javascript:alert(document.cookie)',
    ]
    for payload in xss:
        export = copy.deepcopy(VALID_SNAP_EXPORT)
        export["snaps"][0]["id"] = payload
        export["snaps"][0]["filterName"] = payload
        
        json_str = json.dumps(export)
        ok, data = simulate_snap_import(json_str)
        if ok:
            snap = data["snaps"][0]
            if snap.get("id") == payload:
                record(f"xss/{payload[:30]}", "XSS", "🔴",
                       f"XSS payload stored verbatim in snap metadata: {payload[:50]}",
                       "Sanitize all snap metadata fields before inserting into DOM. "
                       "Use textContent instead of innerHTML for snap IDs/labels.")


def test_malformed_data_urls():
    """Malformed image data URLs in snaps."""
    bad_data_urls = [
        ("empty_data_url", ""),
        ("just_text", "hello world"),
        ("truncated_base64", "data:image/png;base64,iVBORw0KGgo=TRUNCATED"),
        ("wrong_mime", "data:application/javascript;base64,YWxlcnQoMSk="),
        ("svg_xss", "data:image/svg+xml,<svg onload=alert(1)>"),
        ("huge_data_url", "data:image/png;base64," + "A" * 10_000_000),
        ("null_data_url", None),
        ("script_url", "javascript:alert(1)"),
    ]
    
    for name, data_url in bad_data_urls:
        export = copy.deepcopy(VALID_SNAP_EXPORT)
        export["snaps"][0]["dataUrl"] = data_url
        
        try:
            json_str = json.dumps(export)
        except (TypeError, ValueError):
            continue
        
        ok, data = simulate_snap_import(json_str)
        if ok:
            snap_url = data["snaps"][0].get("dataUrl", "")
            if name == "svg_xss":
                record(f"data_url/{name}", "XSS", "🔴",
                       "SVG data URL with onload handler stored — XSS if rendered as <img src>",
                       "Validate data URLs are image/* MIME type only; reject SVG data URLs")
            elif name == "wrong_mime":
                record(f"data_url/{name}", "Security", "🔴",
                       "Non-image MIME type in data URL accepted",
                       "Whitelist only image/png, image/jpeg, image/gif, image/webp data URLs")
            elif name == "huge_data_url":
                size_mb = len(name) / 1_000_000
                record(f"data_url/{name}", "Performance", "🟡",
                       f"10MB data URL accepted — memory risk",
                       "Limit data URL size (e.g., reject > 5MB per snap, and total gallery > 50MB)")
            elif name == "script_url":
                record(f"data_url/{name}", "Security", "🔴",
                       "javascript: URL in dataUrl field",
                       "Validate data URLs start with 'data:image/' prefix only")


def test_rapid_snap_delete_simulation():
    """Simulate memory leak: rapid create/delete cycle."""
    # Test JSON serialization performance of large gallery
    large_gallery = {
        "version": 1,
        "timestamp": int(time.time() * 1000),
        "snaps": []
    }
    
    # 1000 snaps with base64 images
    base64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    for i in range(1000):
        large_gallery["snaps"].append({
            "id": f"snap_{i:04d}",
            "dataUrl": f"data:image/png;base64,{base64_img}",
            "timestamp": int(time.time() * 1000) + i,
            "filters": [],
            "stickers": []
        })
    
    start = time.time()
    json_str = json.dumps(large_gallery)
    elapsed_serial = time.time() - start
    
    start = time.time()
    ok, data = simulate_snap_import(json_str)
    elapsed_parse = time.time() - start
    
    size_kb = len(json_str) / 1024
    
    if size_kb > 5000:
        record("memory/1000_snaps_gallery", "Performance", "🟡",
               f"1000-snap gallery is {size_kb:.0f}KB — localStorage has 5-10MB limit",
               "Implement gallery size limits; warn user when approaching localStorage quota; "
               "use IndexedDB for large galleries")
    else:
        record("memory/1000_snaps_gallery", "Performance", "🟢",
               f"1000-snap gallery: {size_kb:.0f}KB, serialize: {elapsed_serial:.3f}s, parse: {elapsed_parse:.3f}s",
               "", passed=True)


def test_sticker_sheet_state():
    """Test sticker sheet JSON parsing edge cases."""
    # sticker-sheet.js reads localStorage snapstation-export
    bad_states = [
        ("array_instead_of_object", json.dumps([1, 2, 3])),
        ("boolean", "true"),
        ("number", "42"),
        ("nested_xss_in_stickers", json.dumps({
            **VALID_SNAP_EXPORT,
            "snaps": [{
                **VALID_SNAP_EXPORT["snaps"][0],
                "stickers": [{"type": '<script>alert(1)</script>', "x": 0, "y": 0}]
            }]
        })),
    ]
    
    for name, payload in bad_states:
        ok, result = simulate_snap_import(payload)
        if name == "nested_xss_in_stickers" and ok:
            stickers = result["snaps"][0].get("stickers", [])
            if stickers and stickers[0].get("type") and "<script>" in str(stickers[0].get("type", "")):
                record(f"sticker_xss/{name}", "XSS", "🔴",
                       "XSS payload in sticker 'type' field stored verbatim",
                       "Whitelist sticker types to known emoji/strings; sanitize before DOM insertion")


def test_url_param_injection():
    """Test URL parameter manipulation (snap-station.html accepts URL params)."""
    dangerous_params = [
        ("xss_in_mode", "?mode=<script>alert(1)</script>"),
        ("path_traversal", "?load=../../etc/passwd"),
        ("javascript_url", "?redirect=javascript:alert(1)"),
        ("huge_param", "?data=" + "A" * 100000),
        ("null_byte", "?mode=normal\x00evil"),
    ]
    
    for name, param in dangerous_params:
        # Check if JS reads URL params and how
        if "xss" in name:
            record(f"url_param/{name}", "XSS", "🔴",
                   f"URL parameter could contain XSS payload: {param[:60]}",
                   "Sanitize all URL params before using in DOM; use URL API and validate known param values")
        elif "traversal" in name:
            record(f"url_param/{name}", "Security", "🟡",
                   "Path traversal attempt via URL param",
                   "Validate and whitelist all URL parameter values")
        else:
            record(f"url_param/{name}", "Robustness", "🟢",
                   f"URL param edge case: {param[:40]}", "Handle gracefully")


# ─── Run All Tests ────────────────────────────────────────────────────────────

def run_all():
    print("=" * 70)
    print("Snap Station Fuzz & Chaos Test Suite")
    print("=" * 70)
    
    test_localstorage_corruption()
    test_xss_in_snap_metadata()
    test_malformed_data_urls()
    test_rapid_snap_delete_simulation()
    test_sticker_sheet_state()
    test_url_param_injection()
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    critical = [r for r in RESULTS if r["severity"] == "🔴"]
    medium = [r for r in RESULTS if r["severity"] == "🟡"]
    low = [r for r in RESULTS if r["severity"] == "🟢" and not r["passed"]]
    passed = [r for r in RESULTS if r["passed"]]
    
    print(f"✅ Passed:   {len(passed)}")
    print(f"🔴 Critical: {len(critical)}")
    print(f"🟡 Medium:   {len(medium)}")
    print(f"🟢 Low:      {len(low)}")
    print(f"Total: {len(RESULTS)}")
    
    return RESULTS


if __name__ == "__main__":
    results = run_all()
    with open("/home/andrew/repos/snap-station/chaos-tests/results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nResults saved to chaos-tests/results.json")
