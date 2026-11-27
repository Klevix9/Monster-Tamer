FROM python:3.15.2-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# A user without root rights. The requirements say every container runs in user mode.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip setuptools \
    && rm -rf /usr/local/lib/python3.15/ensurepip

COPY app ./app

# The seed (monsters.json + images) comes from the repo's seed/ folder, passed in as
# an extra build context named "seed" (see docker-compose.yml and ci.yml).
# Owned by root and read-only for the app user: the service reads it, never changes it.
COPY --from=seed monsters.json ./seed/monsters.json
COPY --from=seed images ./seed/images
ENV SEED_DIR=/app/seed

USER app

EXPOSE 5002

# HTTPS directly in the service, using the certificate mounted by docker compose.
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "5002", \
     "--ssl-keyfile", "/certs/service.key", \
     "--ssl-certfile", "/certs/service.crt"]
