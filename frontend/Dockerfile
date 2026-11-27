FROM python:3.15.2-slim-bookworm

WORKDIR /app
COPY . .

EXPOSE 80
CMD ["python3", "-m", "http.server", "80", "--bind", "0.0.0.0"]