FROM python:3.11-slim

# Environment settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Working directory inside the container
WORKDIR /app

# Install build deps only if needed (kept minimal here)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copy the backend code into the container's /app directory
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip cache purge || true

COPY . .

# Create non-root user and adjust ownership
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 5000 so it can be mapped from the host
EXPOSE 5000

# Start the Flask app with Gunicorn
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:5000", "wsgi:app"]