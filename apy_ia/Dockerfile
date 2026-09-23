FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .

RUN apt-get update && apt-get install -y gcc g++ \
    && pip install --no-cache-dir -r requirements.txt \
    && python -m spacy download ja_core_news_sm

COPY . .

EXPOSE 8000
CMD ["uvicorn", "analizador:app", "--host", "0.0.0.0", "--port", "8000"]
