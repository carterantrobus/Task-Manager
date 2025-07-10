FROM python:3.11-slim

# Working directory inside the container
WORKDIR / app

# Copy the backend code into the container's /app directory
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port 5000 so it can be mapped from the host
EXPOSE 5000

# Start the Flask app with Gunicorn
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:5000", "wsgi:app"] 