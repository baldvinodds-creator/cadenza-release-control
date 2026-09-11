import hashlib
import importlib.util
import io
from pathlib import Path
import stat
import tarfile
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("unpack", Path(__file__).with_name("unpack-prebuilt.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class UnpackTests(unittest.TestCase):
    def run_case(self, extra=None, bad_hash=False):
        with tempfile.TemporaryDirectory() as root:
            archive = Path(root) / "artifact.zip"
            data = io.BytesIO()
            with tarfile.open(fileobj=data, mode="w") as tar:
                for name, body in [("manifest.json", b"{}"), ("output/config.json", b'{"version":3}'), ("output/run", b"fixture")]:
                    item = tarfile.TarInfo(name)
                    item.size = len(body)
                    item.mode = 0o700 if name.endswith("run") else 0o600
                    tar.addfile(item, io.BytesIO(body))
                for item in (extra if isinstance(extra, list) else [extra] if extra else []):
                    tar.addfile(item, io.BytesIO(b"x" * item.size) if item.isfile() else None)
            with zipfile.ZipFile(archive, "w") as zipped:
                zipped.writestr("prebuilt.tar", data.getvalue())
            digest = "0" * 64 if bad_hash else hashlib.sha256(archive.read_bytes()).hexdigest()
            destination = Path(root) / "unpacked"
            result = module.unpack_prebuilt(archive, destination, digest)
            self.assertTrue((destination / "output/run").stat().st_mode & stat.S_IXUSR)
            self.assertFalse((destination / "manifest.json").stat().st_mode & stat.S_IXUSR)
            if isinstance(extra, list) and any(item.issym() for item in extra):
                alias = destination / "output/functions/api/route.func"
                self.assertTrue(alias.is_symlink())
                self.assertEqual((alias / ".vc-config.json").read_bytes(), b"x")
            return result

    def test_complete_package_preserves_executable_mode(self):
        self.assertEqual(self.run_case()["files_and_directories"], 3)

    def test_provider_digest_mismatch(self):
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            self.run_case(bad_hash=True)

    def test_escape_and_duplicate_paths(self):
        for name in ("../outside", "/outside", "output/../../outside", "output/config.json", "unrelated/file", "output/./file"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.run_case(tarfile.TarInfo(name))

    def test_links_and_special_files(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.FIFOTYPE):
            item = tarfile.TarInfo("output/link")
            item.type = kind
            item.linkname = "/outside"
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, "links"):
                self.run_case(item)

    def test_function_aliases_and_denials(self):
        config = tarfile.TarInfo("output/functions/group.func/.vc-config.json")
        config.size = 1
        alias = tarfile.TarInfo("output/functions/api/route.func")
        alias.type = tarfile.SYMTYPE
        alias.linkname = "../group.func"
        self.assertEqual(self.run_case([config, alias])["files_and_directories"], 5)
        for target in ("/outside.func", "../../../outside.func", "../missing.func", "../api/route.func"):
            alias.linkname = target
            with self.subTest(target=target), self.assertRaises(ValueError):
                self.run_case([config, alias])
        alias.linkname = "../group.func"
        collision = tarfile.TarInfo("output/functions/api/route.func/overwrite")
        with self.assertRaises(ValueError):
            self.run_case([config, alias, collision])


if __name__ == "__main__":
    unittest.main()
