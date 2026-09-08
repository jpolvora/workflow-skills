"""Retry urllib on transient HTTP and network failures."""
from __future__ import annotations

import time
import urllib.error
import urllib.request

RETRY_STATUS = {429, 500, 502, 503, 504}


def urlopen_retry(request, timeout=60, attempts=3, delay=0.5):
    last: BaseException | None = None
    for index in range(attempts):
        try:
            return urllib.request.urlopen(request, timeout=timeout)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in RETRY_STATUS or index == attempts - 1:
                raise
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last = exc
            if index == attempts - 1:
                raise
        time.sleep(delay * (2 ** index))
    raise last  # pragma: no cover
