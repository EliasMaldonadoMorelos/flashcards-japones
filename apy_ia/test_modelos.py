import os
import urllib.request
import json
from dotenv import load_dotenv

# Cargar tu llave mágica
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ No se encontró la API Key en el .env")
    exit()

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print("🔍 Preguntándole a los servidores de Google...")
try:
    respuesta = urllib.request.urlopen(url)
    datos = json.loads(respuesta.read())
    
    print("\n✅ Modelos que SÍ existen y están activos en tu cuenta:\n")
    for modelo in datos.get('models', []):
        # Filtramos solo los que sirven para generar texto
        if 'generateContent' in modelo.get('supportedGenerationMethods', []):
            nombre_limpio = modelo['name'].replace('models/', '')
            print(f"👉 {nombre_limpio}")
            
except Exception as e:
    print(f"❌ Error de conexión: {e}")