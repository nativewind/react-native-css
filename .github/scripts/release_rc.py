"""Publish a reviewed archive without rebuilding or changing the stable tag."""

import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import time
import urllib.error
import urllib.request


REGISTRY = "https://registry.npmjs.org"


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def validate_version(version):
    check(re.fullmatch(r"\d+\.\d+\.\d+-rc\.\d+", version), "Invalid RC version")


def verify_archive(archive, descriptor):
    data = archive.read_bytes()
    check(hashlib.sha256(data).hexdigest() == descriptor["sha256"], "Archive SHA256 mismatch")
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()
    check(integrity == descriptor["integrity"], "Archive integrity mismatch")
    with tarfile.open(archive) as tar:
        package = json.load(tar.extractfile("package/package.json"))
    check(package["name"] == descriptor["name"], "Wrong package")
    check(package["version"] == descriptor["version"], "Wrong version")
    for field in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        check(not any(value.startswith(("file:", "link:", "workspace:"))
                      for value in package.get(field, {}).values()), "Local dependency in archive")


def verify_registry(metadata, descriptor):
    check(metadata["name"] == descriptor["name"], "Registry package mismatch")
    check(metadata["version"] == descriptor["version"], "Registry version mismatch")
    check(metadata["dist"]["integrity"] == descriptor["integrity"], "Published version has different bytes")


def verify_latest(before, after):
    check(before.get("latest") == after.get("latest"), "The stable latest tag changed")


def registry_json(route, missing_ok=False, attempts=1):
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(REGISTRY + route, headers={"Cache-Control": "no-cache"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            if attempt + 1 < attempts:
                print("Waiting for npm registry visibility...", flush=True)
                time.sleep(10)
                continue
            if missing_ok:
                return None
            raise


def wait_for_rc_tag(before, version, attempts=31):
    for attempt in range(attempts):
        after = registry_json("/-/package/react-native-css/dist-tags")
        verify_latest(before, after)
        if after.get("rc") == version:
            return after
        if attempt + 1 < attempts:
            time.sleep(10)
    raise RuntimeError("RC tag is not visible after waiting for the registry")


def run(*args, cwd=None, env=None):
    subprocess.run(args, cwd=cwd, env=env, check=True)


def verify_consumer(root, work, descriptor):
    consumer = work / "consumer"
    consumer.mkdir()
    dependencies = {**descriptor["consumerDependencies"], descriptor["name"]: descriptor["version"]}
    (consumer / "package.json").write_text(json.dumps({"name": "rc-registry-check", "private": True,
                                                     "version": "0.0.0", "dependencies": dependencies}))
    public_env = {key: value for key, value in os.environ.items()
                  if key not in ("GH_TOKEN", "GITHUB_TOKEN", "NPM_TOKEN", "NODE_AUTH_TOKEN")}
    public_env["NODE_AUTH_TOKEN"] = ""
    run("npm", "install", "--no-audit", "--no-fund", "--registry=" + REGISTRY, cwd=consumer, env=public_env)
    lock = json.loads((consumer / "package-lock.json").read_text())
    engines = {key: value for key, value in lock["packages"].items()
               if key.endswith("node_modules/react-native-css")}
    check(list(engines) == ["node_modules/react-native-css"], "Expected one engine runtime")
    installed = engines["node_modules/react-native-css"]
    check(installed["version"] == descriptor["version"], "Installed version mismatch")
    check(installed["integrity"] == descriptor["integrity"], "Installed archive integrity mismatch")
    check(installed["resolved"].startswith(REGISTRY + "/react-native-css/-/"), "Engine did not come from npm")
    engine = consumer / "node_modules/react-native-css"
    tests = consumer / "tests"
    tests.mkdir()
    for source in (root / "node/__tests__").glob("*.mjs"):
        # Only relocate private helper entry paths; keep every assertion unchanged.
        content = source.read_text().replace("../../dist/", str(engine / "dist") + "/")
        (tests / source.name).write_text(content)
    public_env["CSS_COMPONENT_REGISTRY_ROOT"] = str(engine)
    public_env["CSS_TYPESCRIPT_SETUP_ENTRY"] = str(engine / "dist/commonjs/metro/typescript.js")
    public_env["CSS_LOADER_UNDER_TEST"] = str(engine / "dist/commonjs/compiler/lightningcss-loader.js")
    run("node", "--test", *map(str, sorted(tests.glob("*.mjs"))), cwd=consumer, env=public_env)


def main():
    version = os.environ["RC_VERSION"]
    validate_version(version)
    root = Path(__file__).resolve().parents[2]
    descriptor = json.loads((root / ".github/releases" / (version + ".json")).read_text())
    check(descriptor["name"] == "react-native-css" and descriptor["version"] == version, "Invalid release descriptor")
    check(descriptor["archive"] == "react-native-css-" + version + ".tgz", "Invalid archive name")
    run("git", "merge-base", "--is-ancestor", descriptor["sourceCommit"], "HEAD", cwd=root)
    release = json.loads(subprocess.check_output(
        ["gh", "release", "view", version, "--json", "isDraft,isPrerelease,targetCommitish"], text=True))
    check(release["targetCommitish"] == descriptor["sourceCommit"], "Release targets different source")
    check(release["isPrerelease"], "Expected a GitHub prerelease")
    work = Path(os.environ["RUNNER_TEMP"]) / "rc-publication"
    work.mkdir(exist_ok=True)
    run("gh", "release", "download", version, "--pattern", descriptor["archive"], "--dir", str(work))
    archive = work / descriptor["archive"]
    verify_archive(archive, descriptor)
    tag_route = "/-/package/react-native-css/dist-tags"
    version_route = "/react-native-css/" + version
    before = registry_json(tag_route)
    existing = registry_json(version_route, missing_ok=True)
    if existing is not None:
        verify_registry(existing, descriptor)
    receipt = {"descriptor": descriptor, "tagsBefore": before, "stage": "preflight-passed"}
    receipt_file = work / "publication.json"

    def save(stage):
        receipt["stage"] = stage
        receipt_file.write_text(json.dumps(receipt, indent=2) + "\n")

    save("preflight-passed")
    if os.environ.get("RC_PUBLISH") != "true":
        print("RC preflight passed; publication was not requested.")
        return
    if existing is None:
        run("npm", "publish", str(archive), "--tag", "rc-staging", "--access", "public",
            "--ignore-scripts", "--registry=" + REGISTRY, "--loglevel=warn")
    metadata = registry_json(version_route, attempts=31)
    verify_registry(metadata, descriptor)
    receipt["registry"] = metadata
    save("registry-integrity-verified")
    downloaded = work / "registry"
    downloaded.mkdir()
    run("npm", "pack", "react-native-css@" + version, "--ignore-scripts", "--pack-destination",
        str(downloaded), "--registry=" + REGISTRY, "--loglevel=warn")
    verify_archive(downloaded / descriptor["archive"], descriptor)
    verify_consumer(root, work, descriptor)
    save("registry-consumer-passed")
    verify_latest(before, registry_json(tag_route))
    run("npm", "dist-tag", "add", "react-native-css@" + version, "rc", "--registry=" + REGISTRY)
    after = wait_for_rc_tag(before, version)
    receipt["tagsAfter"] = after
    save("rc-published")
    run("gh", "release", "edit", version, "--draft=false", "--prerelease", "--latest=false")
    save("complete")


if __name__ == "__main__":
    main()
