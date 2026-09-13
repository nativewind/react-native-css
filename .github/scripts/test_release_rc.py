import base64
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

from release_rc import validate_version, verify_archive, verify_latest, verify_registry


class ReleaseGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.archive = Path(self.temp.name) / "package.tgz"
        self.descriptor = {"name": "react-native-css", "version": "3.1.0-rc.0"}

    def pack(self, **metadata):
        package = {**self.descriptor, **metadata}
        data = json.dumps(package).encode()
        with tarfile.open(self.archive, "w:gz") as tar:
            entry = tarfile.TarInfo("package/package.json")
            entry.size = len(data)
            tar.addfile(entry, io.BytesIO(data))
        archive_bytes = self.archive.read_bytes()
        self.descriptor.update({
            "sha256": hashlib.sha256(archive_bytes).hexdigest(),
            "integrity": "sha512-" + base64.b64encode(hashlib.sha512(archive_bytes).digest()).decode(),
        })

    def test_only_exact_rc_versions_are_accepted(self):
        validate_version("3.1.0-rc.0")
        for version in ("3.1.0", "3.1.0-preview.0", "rc", "../../3.1.0-rc.0", "3.1.0-rc.0; npm publish"):
            with self.subTest(version=version), self.assertRaises(RuntimeError):
                validate_version(version)

    def test_reviewed_archive_passes(self):
        self.pack()
        verify_archive(self.archive, self.descriptor)

    def test_changed_archive_is_rejected_before_publication(self):
        self.pack()
        self.archive.write_bytes(self.archive.read_bytes() + b"unreviewed bytes")
        with self.assertRaisesRegex(RuntimeError, "SHA256"):
            verify_archive(self.archive, self.descriptor)

    def test_mismatched_integrity_is_rejected(self):
        self.pack()
        self.descriptor["integrity"] = "sha512-other"
        with self.assertRaisesRegex(RuntimeError, "integrity"):
            verify_archive(self.archive, self.descriptor)

    def test_different_package_or_version_is_rejected(self):
        for metadata in ({"name": "other-package"}, {"version": "3.1.0"}):
            with self.subTest(metadata=metadata):
                self.pack(**metadata)
                with self.assertRaises(RuntimeError):
                    verify_archive(self.archive, self.descriptor)

    def test_local_dependencies_are_rejected(self):
        for field in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            for dependency in ("file:../engine.tgz", "link:../engine", "workspace:*"):
                with self.subTest(field=field, dependency=dependency):
                    self.pack(**{field: {"engine": dependency}})
                    with self.assertRaisesRegex(RuntimeError, "Local dependency"):
                        verify_archive(self.archive, self.descriptor)

    def test_retry_accepts_identical_registry_bytes(self):
        self.pack()
        metadata = {"name": self.descriptor["name"], "version": self.descriptor["version"],
                    "dist": {"integrity": self.descriptor["integrity"]}}
        verify_registry(metadata, self.descriptor)

    def test_registry_collision_is_rejected(self):
        self.pack()
        metadata = {"name": self.descriptor["name"], "version": self.descriptor["version"],
                    "dist": {"integrity": "sha512-other"}}
        with self.assertRaisesRegex(RuntimeError, "different bytes"):
            verify_registry(metadata, self.descriptor)

    def test_rc_tag_can_advance_without_changing_latest(self):
        verify_latest({"latest": "3.0.7"}, {"latest": "3.0.7", "rc": "3.1.0-rc.0"})

    def test_stable_tag_change_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "latest"):
            verify_latest({"latest": "3.0.7"}, {"latest": "3.1.0-rc.0"})


if __name__ == "__main__":
    unittest.main()
