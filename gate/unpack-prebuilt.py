"""Extract an immutable GitHub artifact as data, never as executable code.

The protected caller obtains expected_zip_sha256 from GitHub's artifact API,
not an input supplied by the release requester. Attestation and full manifest
verification are separate subsequent requirements. No provider credentials here.
"""
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tarfile
import zipfile

LIMIT = 8 * 1024**3


def unpack_prebuilt(archive, destination, expected_zip_sha256):
    if not re.fullmatch(r"[a-f0-9]{64}", expected_zip_sha256):
        raise ValueError("Provider archive digest required")
    path = Path(archive)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > LIMIT:
        raise ValueError("Regular bounded artifact archive required")
    with path.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected_zip_sha256:
            raise ValueError("Provider artifact digest mismatch")
    destination = Path(destination)
    destination.mkdir(mode=0o700)  # Never merge or overwrite existing state.
    seen = set()
    total = 0
    with zipfile.ZipFile(path) as zipped:
        entries = zipped.infolist()
        if len(entries) != 1 or entries[0].filename != "prebuilt.tar" or entries[0].file_size > LIMIT or entries[0].flag_bits & 1:
            raise ValueError("Exactly one bounded unencrypted prebuilt.tar required")
        with zipped.open(entries[0]) as stream:
            with tarfile.open(fileobj=stream, mode="r|") as tar:
                for item in tar:
                    name = item.name
                    if name == "." and item.isdir():
                        continue
                    if name.startswith("./"):
                        name = name[2:]
                    if not name or name.startswith("/") or "\\" in name or any(ord(c) < 32 or ord(c) == 127 for c in name):
                        raise ValueError("Invalid artifact path")
                    pieces = name.rstrip("/").split("/")
                    if any(p in ("", ".", "..") for p in pieces) or pieces[0] not in ("output", "manifest.json"):
                        raise ValueError("Artifact path outside package")
                    key = str(PurePosixPath(*pieces))
                    if key in seen or len(seen) >= 100002:
                        raise ValueError("Duplicate or excessive artifact entries")
                    seen.add(key)
                    if not (item.isfile() or item.isdir()):
                        raise ValueError("Artifact links and special files refused")
                    if pieces[0] == "manifest.json" and (len(pieces) != 1 or not item.isfile()):
                        raise ValueError("Invalid manifest entry")
                    target = destination.joinpath(*pieces)
                    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                    if item.isdir():
                        target.mkdir(exist_ok=True, mode=0o700)
                        continue
                    total += item.size
                    if item.size < 0 or total > LIMIT:
                        raise ValueError("Artifact resource limit exceeded")
                    copied = 0
                    with tar.extractfile(item) as source, target.open("xb") as output:
                        while chunk := source.read(1024 * 1024):
                            copied += len(chunk)
                            if copied > item.size:
                                raise ValueError("Artifact member size mismatch")
                            output.write(chunk)
                    if copied != item.size:
                        raise ValueError("Incomplete artifact member")
                    os.chmod(target, 0o700 if item.mode & 0o111 else 0o600)
            # Read through EOF to force the ZIP CRC check even with TAR end padding.
            while stream.read(1024 * 1024):
                pass
    if not (destination / "manifest.json").is_file() or not (destination / "output/config.json").is_file():
        raise ValueError("Incomplete prebuilt package")
    return {"files_and_directories": len(seen), "bytes": total}


if __name__ == "__main__":
    import argparse
    import json
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("destination")
    parser.add_argument("provider_digest")
    args = parser.parse_args()
    print(json.dumps(unpack_prebuilt(args.archive, args.destination, args.provider_digest)))
