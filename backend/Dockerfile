FROM python:3.11-slim

# Install system dependencies for PostGIS and GeoDjango
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

EXPOSE 8000

CMD python manage.py migrate && \
    python manage.py seed_demo_data && \
    python manage.py runserver 0.0.0.0:${PORT:-8000}