# Telegram Trip-PDF Bot — deterministic image for Railway.
#
# WeasyPrint (Phase 3 PDF rendering) needs native libraries (Pango, Cairo,
# GDK-PixBuf, fonts). Installing them via apt here is more reliable across
# Railway/Nixpacks updates than auto-detection, so we pin a Dockerfile build.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Native deps for WeasyPrint + a base font so PDFs always have glyphs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libcairo2 \
        libffi-dev \
        shared-mime-info \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Long-polling worker — no web port to bind.
CMD ["python", "bot.py"]
