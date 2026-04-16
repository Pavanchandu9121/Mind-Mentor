FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
# Librosa requires some system libs for soundfile
RUN apt-get update && apt-get install -y libsndfile1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5008
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5008"]
