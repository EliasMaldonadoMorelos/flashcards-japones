import os
from dotenv import load_dotenv
import re
import smtplib
from email.message import EmailMessage
import random
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from deep_translator import GoogleTranslator
import spacy
from pymongo import MongoClient
import certifi
import pykakasi
import jwt
from datetime import datetime, timedelta
import bcrypt
from google import genai
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))
MONGO_URI = os.getenv("MONGO_URI")
GMAIL_USER = os.getenv("EMAIL_SENDER")
GMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    cliente_ia = genai.Client(api_key=GEMINI_API_KEY)

# INICIALIZAR APLICACIÓN Y HERRAMIENTAS
app = FastAPI(title="API de Analizador Japonés Seguro")
nlp = spacy.load("ja_core_news_sm")
kks = pykakasi.kakasi()

# CONEXIÓN A BASE DE DATOS
cliente = MongoClient(MONGO_URI, tlsCAFile=certifi.where()) 
db = cliente["estudio_japones"] 
coleccion = db["flashcards"]
coleccion_usuarios = db["usuarios"]

# CONFIGURACIÓN DE SEGURIDAD (CORS y Encriptación)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ==========================================
# MODELOS DE DATOS (Pydantic)
# ==========================================
class TextoInput(BaseModel):
    texto: str
    usuario: str
    idioma: str = "ja"

class UsuarioRegistro(BaseModel):
    usuario: str
    email: str
    password: str

class UsuarioAuth(BaseModel):
    usuario: str
    password: str

class VerificacionCodigo(BaseModel):
    usuario: str
    codigo: str

class CambioPassword(BaseModel):
    usuario: str
    password_actual: str
    password_nueva: str

class EliminarCuenta(BaseModel):
    usuario: str
    password: str

class SolicitarRecuperacion(BaseModel):
    usuario: str

class ResetearPassword(BaseModel):
    usuario: str
    codigo: str
    nueva_password: str

class PeticionEjemplo(BaseModel):
    palabra_japones: str
    usuario: str

class PeticionSurvival(BaseModel):
    palabra_japones: str
    usuario: str

class PeticionSurvivalLote(BaseModel):
    palabras_japones: list[str]  # Ahora recibe una lista completa
    usuario: str

# ==========================================
# FUNCIONES AUXILIARES DE SEGURIDAD
# ==========================================
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ==========================================
# CORREO VERIFICACIÓN
# ==========================================

def enviar_correo_verificacion(destinatario: str, codigo: str, usuario: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Flashcards Nihongo <{GMAIL_USER}>"
        msg['To'] = destinatario
        msg['Subject'] = "Código de Verificación ⛩️ Flashcards Nihongo"

        html = f"""
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f5; border-radius: 10px;">
            <h2 style="color: #0284c7;">¡Bienvenido, {usuario}! ⛩️</h2>
            <p style="color: #475569;">Tu código de activación es:</p>
            <h1 style="font-size: 40px; letter-spacing: 8px; color: #0f172a; background: #e2e8f0; padding: 10px; border-radius: 8px;">{codigo}</h1>
            <p style="color: #475569;">Ingrésalo en la aplicación para desbloquear tu cuenta.</p>
        </div>
        """
        msg.attach(MIMEText(html, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Correo de verificación enviado con éxito a {destinatario}")
    except Exception as e:
        print(f"❌ Error al enviar correo con Gmail: {e}")

def enviar_correo_recuperacion(destinatario: str, codigo: str, usuario: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Flashcards Nihongo <{GMAIL_USER}>"
        msg['To'] = destinatario
        msg['Subject'] = "Rescate de Contraseña 🔑 Flashcards Nihongo"

        html = f"""
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f5; border-radius: 10px;">
            <h2 style="color: #d97706;">Solicitud de Rescate 🔑</h2>
            <p style="color: #475569;">Hola {usuario}, tu código temporal (válido por 15 min) es:</p>
            <h1 style="font-size: 40px; letter-spacing: 8px; color: #92400e; background: #fef3c7; padding: 10px; border-radius: 8px;">{codigo}</h1>
        </div>
        """
        msg.attach(MIMEText(html, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Correo de recuperación enviado con éxito a {destinatario}")
    except Exception as e:
        print(f"❌ Error al enviar correo con Gmail: {e}")

# ==========================================
# AUTENTICACIÓN (LOGIN Y REGISTRO)
# ==========================================
@app.post("/registro")
async def registrar_usuario(user: UsuarioRegistro):
    usuario_existente = coleccion_usuarios.find_one({"usuario": user.usuario.lower()})
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Este alias ya está en uso")
    
    codigo_secreto = str(random.randint(100000, 999999))
    hashed_password = get_password_hash(user.password)
    
    nuevo_usuario = {
        "usuario": user.usuario.lower(),
        "email": user.email,
        "password": hashed_password,
        "verificado": False,
        "codigo": codigo_secreto
    }
    coleccion_usuarios.insert_one(nuevo_usuario)
    enviar_correo_verificacion(user.email, codigo_secreto, user.usuario)
    return {"mensaje": "Usuario registrado. Revisa tu correo para el código de verificación."}

@app.post("/verificar-codigo")
async def verificar_codigo(datos: VerificacionCodigo):
    user = coleccion_usuarios.find_one({"usuario": datos.usuario.lower()})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user["verificado"]:
        return {"mensaje": "El usuario ya estaba verificado"}
    if user["codigo"] != datos.codigo:
        raise HTTPException(status_code=400, detail="Código incorrecto")
    
    coleccion_usuarios.update_one(
        {"usuario": datos.usuario.lower()},
        {"$set": {"verificado": True}}
    )
    return {"mensaje": "Cuenta verificada con éxito. Ya puedes iniciar sesión."}

@app.post("/login")
async def login_usuario(user: UsuarioAuth):
    db_user = coleccion_usuarios.find_one({"usuario": user.usuario.lower()})
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    if "bloqueado_hasta" in db_user and db_user["bloqueado_hasta"]:
        if datetime.utcnow() < db_user["bloqueado_hasta"]:
            minutos_restantes = (db_user["bloqueado_hasta"] - datetime.utcnow()).seconds // 60
            raise HTTPException(status_code=403, detail=f"Cuenta bloqueada temporalmente. Intenta en {minutos_restantes + 1} minutos o restablece tu contraseña.")
        else:
            coleccion_usuarios.update_one({"usuario": user.usuario.lower()}, {"$set": {"intentos_fallidos": 0, "bloqueado_hasta": None}})

    if not verify_password(user.password, db_user["password"]):
        intentos = db_user.get("intentos_fallidos", 0) + 1
        update_data = {"intentos_fallidos": intentos}
        
        if intentos >= 5:
            update_data["bloqueado_hasta"] = datetime.utcnow() + timedelta(minutes=10)
            
        coleccion_usuarios.update_one({"usuario": user.usuario.lower()}, {"$set": update_data})
        
        if intentos >= 5:
            raise HTTPException(status_code=403, detail="Demasiados intentos fallidos. Cuenta bloqueada por 10 minutos. 🛑")
        else:
            raise HTTPException(status_code=401, detail=f"Contraseña incorrecta. Te quedan {5 - intentos} intentos.")

    coleccion_usuarios.update_one({"usuario": user.usuario.lower()}, {"$set": {"intentos_fallidos": 0, "bloqueado_hasta": None}})
    if not db_user.get("verificado", False):
        raise HTTPException(status_code=403, detail="Debes verificar tu correo antes de entrar")

    access_token = create_access_token(data={"sub": user.usuario.lower()})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "usuario": user.usuario.lower()
    }

@app.get("/racha/{usuario}")
async def obtener_racha(usuario: str):
    usuario_db = coleccion_usuarios.find_one({"usuario": usuario})
    
    if not usuario_db:
        return {"racha": 0}
        
    racha = usuario_db.get("racha", 0)
    ultimo_repaso = usuario_db.get("ultimo_repaso")
    
    if ultimo_repaso:
        fecha_ultimo = datetime.strptime(ultimo_repaso, "%Y-%m-%d").date()
        hoy = datetime.utcnow().date()
        diferencia = (hoy - fecha_ultimo).days
        
        if diferencia >= 2:
            racha = 0
            coleccion_usuarios.update_one(
                {"usuario": usuario},
                {"$set": {"racha": 0}}
            )
            
    return {"racha": racha}

@app.post("/registrar-estudio/{usuario}")
async def registrar_estudio(usuario: str):
    hoy = datetime.utcnow().isoformat()[:10]
    
    usuario_db = coleccion_usuarios.find_one({"usuario": usuario})
    
    if not usuario_db:
        coleccion_usuarios.insert_one({
            "usuario": usuario,
            "racha": 1,
            "ultimo_repaso": hoy
        })
        return {"racha": 1}
        
    racha = usuario_db.get("racha", 0)
    ultimo_repaso = usuario_db.get("ultimo_repaso")
    
    if ultimo_repaso == hoy:
        pass
    else:
        if ultimo_repaso:
            fecha_ultimo = datetime.strptime(ultimo_repaso, "%Y-%m-%d").date()
            diferencia = (datetime.utcnow().date() - fecha_ultimo).days
            
            if diferencia == 1:
                racha += 1
            else:
                racha = 1
        else:
            racha = 1
            
        coleccion_usuarios.update_one(
            {"usuario": usuario},
            {"$set": {"racha": racha, "ultimo_repaso": hoy}}
        )
        
    return {"racha": racha}
# ==========================================
# RECUPERACIÓN DE CONTRASEÑA
# ==========================================

@app.post("/solicitar-recuperacion")
async def solicitar_recuperacion(datos: SolicitarRecuperacion):
    user = coleccion_usuarios.find_one({"usuario": datos.usuario.lower()})
    
    if not user:
        return {"mensaje": "Si el usuario existe, se ha enviado un correo con instrucciones."}
    
    codigo_rescate = str(random.randint(100000, 999999))
    hora_expiracion = datetime.utcnow() + timedelta(minutes=15)
    
    coleccion_usuarios.update_one(
        {"usuario": datos.usuario.lower()},
        {"$set": {
            "codigo_recuperacion": codigo_rescate,
            "codigo_expiracion": hora_expiracion
        }}
    )
    
    enviar_correo_recuperacion(user["email"], codigo_rescate, user["usuario"])
    return {"mensaje": "Si el usuario existe, se ha enviado un correo con instrucciones."}


@app.post("/resetear-password")
async def resetear_password(datos: ResetearPassword):
    user = coleccion_usuarios.find_one({"usuario": datos.usuario.lower()})
    
    if not user or "codigo_recuperacion" not in user:
        raise HTTPException(status_code=400, detail="Código inválido o no solicitado ❌")
        
    if user["codigo_recuperacion"] != datos.codigo:
        raise HTTPException(status_code=400, detail="Código incorrecto ❌")
        
    if "codigo_expiracion" in user and datetime.utcnow() > user["codigo_expiracion"]:
        coleccion_usuarios.update_one(
            {"usuario": datos.usuario.lower()},
            {"$unset": {"codigo_recuperacion": "", "codigo_expiracion": ""}}
        )
        raise HTTPException(status_code=400, detail="El código ha expirado (pasaron más de 15 min). Solicita uno nuevo ⏱️")
    
    nueva_password_hashed = get_password_hash(datos.nueva_password)
    coleccion_usuarios.update_one(
        {"usuario": datos.usuario.lower()},
        {
            "$set": {
                "password": nueva_password_hashed,
                "intentos_fallidos": 0,
                "bloqueado_hasta": None
            },
            "$unset": {
                "codigo_recuperacion": "", 
                "codigo_expiracion": ""
            } 
        }
    )
    return {"mensaje": "¡Contraseña restaurada con éxito! Tu cuenta ha sido desbloqueada. 🔓"}

# ==========================================
# MÓDULO DE PERFIL (DANGER ZONE)
# ==========================================

@app.put("/cambiar-password")
async def cambiar_password(datos: CambioPassword):
    user = coleccion_usuarios.find_one({"usuario": datos.usuario.lower()})
    
    if not user or not verify_password(datos.password_actual, user["password"]):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta ❌")
    
    nueva_password_hashed = get_password_hash(datos.password_nueva)
    coleccion_usuarios.update_one(
        {"usuario": datos.usuario.lower()},
        {"$set": {"password": nueva_password_hashed}}
    )
    return {"mensaje": "¡Contraseña actualizada con éxito! 🔒"}


@app.delete("/eliminar-cuenta")
async def eliminar_cuenta(datos: EliminarCuenta):
    user = coleccion_usuarios.find_one({"usuario": datos.usuario.lower()})
    
    if not user or not verify_password(datos.password, user["password"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta. Operación cancelada ❌")
    
    coleccion.delete_many({"usuario": datos.usuario.lower()}) 
    coleccion_usuarios.delete_one({"usuario": datos.usuario.lower()})
    
    return {"mensaje": "Cuenta y flashcards eliminadas. ¡Sayonara! 🥷"}

# ==========================================
# APLICACIÓN (FLASHCARDS)
# ==========================================
@app.post("/extraer-vocabulario")
async def extraer(input_data: TextoInput):
    texto_procesar = input_data.texto
    
    if input_data.idioma == "es":
        traductor_es_ja = GoogleTranslator(source='es', target='ja')
        texto_procesar = traductor_es_ja.translate(input_data.texto)
        
    doc = nlp(texto_procesar)
    palabras_japones = []
    
    for token in doc:
        if token.pos_ in ["NOUN", "VERB", "ADJ", "ADV", "INTJ"] and not token.is_stop:
            palabras_japones.append(token.lemma_)
            
    palabras_japones = list(set(palabras_japones))
    vocabulario_completo = []
    
    if palabras_japones:
        traductor = GoogleTranslator(source='ja', target='es')
        traducciones = traductor.translate_batch(palabras_japones)
        
        for i in range(len(palabras_japones)):
            palabra_j = palabras_japones[i]
            resultado = kks.convert(palabra_j)
            
            furigana_calculado = "".join([item['hira'] for item in resultado])

            if not re.search(r'[\u4E00-\u9FFF]', palabra_j):
                furigana_final = ""
            else:
                furigana_final = furigana_calculado

            romaji_calculado = "".join([item['hepburn'] for item in resultado])

            vocabulario_completo.append({
                "japones": palabra_j,
                "espanol": traducciones[i],
                "furigana": furigana_final,
                "romaji": romaji_calculado
            })

        categorias_asignadas = {}
        if GEMINI_API_KEY and vocabulario_completo:
            try:
                lista_palabras = [p["japones"] for p in vocabulario_completo]
                prompt_clasificacion = f"""
                Clasifica la siguiente lista de palabras japonesas en UNA de estas categorías exactas: 
                'Básico y Diario', 'Comida y Restaurantes', 'Lugares y Direcciones', 'Verbos de Acción', 'Adjetivos', u 'Otros'.
                Palabras: {lista_palabras}
                Devuelve ÚNICAMENTE un objeto JSON válido donde las claves sean las palabras japonesas y los valores sean la categoría.
                Ejemplo: {{"水": "Básico y Diario", "食べる": "Verbos de Acción"}}
                """
                respuesta_cat = cliente_ia.models.generate_content(
                    model='gemini-2.5-flash-lite',
                    contents=prompt_clasificacion
                )
                texto_cat = respuesta_cat.text.strip().replace("```json", "").replace("```", "")
                categorias_asignadas = json.loads(texto_cat)
            except Exception as e:
                print(f"⚠️ Error menor al clasificar con IA: {e}")

        for palabra in vocabulario_completo:
            categoria_asignada = categorias_asignadas.get(palabra["japones"], "Otros / Sin Clasificar")

            coleccion.update_one(
                {
                    "japones": palabra["japones"], 
                    "usuario": input_data.usuario 
                },
                {
                    "$set": {
                        "espanol": palabra["espanol"],
                        "furigana": palabra["furigana"],
                        "romaji": palabra["romaji"],
                        "categoria": categoria_asignada
                    },
                    "$setOnInsert": {
                        "nivel": 0,
                        "intervalo": 0,
                        "facilidad": 2.5,
                        "proximo_repaso": datetime.utcnow().isoformat()[:10]
                    }
                },
                upsert=True
            )

    return {
        "mensaje": "Análisis exitoso",
        "total_palabras": len(vocabulario_completo),
        "vocabulario": vocabulario_completo,
        "texto_traducido": texto_procesar if input_data.idioma == "es" else None
    }

@app.get("/historial/{usuario}")
async def obtener_historial(usuario: str):
    hoy_exacto = datetime.utcnow().isoformat()[:10]
    
    query = {
        "usuario": usuario,
        "$or": [
            {"proximo_repaso": {"$lte": hoy_exacto}},
            {"proximo_repaso": {"$exists": False}}
        ]
    }
    
    documentos = list(coleccion.find(query, {"_id": 0}).sort("nivel", 1))
    
    return {
        "mensaje": "Tarjetas para repasar hoy",
        "total": len(documentos),
        "vocabulario": documentos
    }

@app.get("/biblioteca/{usuario}")
async def obtener_biblioteca(usuario: str):
    try:
        cursor = coleccion.find({"usuario": usuario}, {"_id": 0})
        palabras_totales = list(cursor)
        
        return {
            "mensaje": "Biblioteca cargada exitosamente",
            "total": len(palabras_totales),
            "palabras": palabras_totales
        }
    except Exception as e:
        print(f"❌ Error al obtener biblioteca: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar la biblioteca completa")

@app.delete("/eliminar/{usuario}/{palabra_japones}")
async def eliminar_palabra(usuario: str, palabra_japones: str):
    resultado = coleccion.delete_one({"japones": palabra_japones, "usuario": usuario})
    if resultado.deleted_count == 1:
        return {"mensaje": f"'{palabra_japones}' eliminada"}
    return {"mensaje": "Palabra no encontrada", "status": 404}

@app.put("/actualizar-nivel/{usuario}/{palabra_japones}/{nuevo_nivel}")
async def actualizar_nivel(usuario: str, palabra_japones: str, nuevo_nivel: int):
    tarjeta = coleccion.find_one({"japones": palabra_japones, "usuario": usuario})
    if not tarjeta:
        return {"mensaje": "Palabra no encontrada", "status": 404}

    intervalo = tarjeta.get("intervalo", 0)
    facilidad = tarjeta.get("facilidad", 2.5)

    if nuevo_nivel == 0: 
        intervalo = 1 
        facilidad = max(1.3, facilidad - 0.2) 
    elif nuevo_nivel == 1: 
        intervalo = 1 if intervalo == 0 else max(1, round(intervalo * 1.2))
    elif nuevo_nivel >= 2: 
        intervalo = 3 if intervalo == 0 else max(1, round(intervalo * facilidad))
        facilidad += 0.15 

    from datetime import datetime, timedelta
    fecha_futura_str = (datetime.utcnow() + timedelta(days=intervalo)).isoformat()[:10]

    coleccion.update_one(
        {"japones": palabra_japones, "usuario": usuario},
        {"$set": {
            "nivel": nuevo_nivel,
            "intervalo": intervalo,
            "facilidad": round(facilidad, 2),
            "proximo_repaso": fecha_futura_str
        }}
    )
    
    return {"mensaje": f"Algoritmo SRS aplicado. Próximo repaso: {fecha_futura_str}"}

@app.post("/generar-ejemplo")
async def generar_ejemplo(datos: PeticionEjemplo):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="API Key de Gemini no configurada")

    try:
        prompt = f"""
        Eres un profesor experto de japonés. El estudiante está aprendiendo la palabra: '{datos.palabra_japones}'.
        Genera UNA sola oración de ejemplo natural y útil en japonés (nivel JLPT N5 o N4) que use esta palabra.
        Devuelve ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas, sin usar bloques de código Markdown ni comentarios:
        {{
            "oracion_japones": "la oración con kanji",
            "oracion_furigana": "la oración con su lectura en hiragana/katakana",
            "traduccion_espanol": "traducción al español",
            "oracion_romaji": "la lectura completa de la oración en romaji (letras occidentales)",
            "fragmentos": ["bloque1", "bloque2", "bloque3"],
            "explicacion_gramatical": "Breve explicación (máximo 2 líneas) de cómo se usa o conjuga la palabra en esta oración. Ejemplo: 'taberu' cambió a 'tabemasu' por ser la forma formal del presente."
        }}
        IMPORTANTE: En la clave 'fragmentos', divide la 'oracion_japones' en un arreglo de cadenas separadas lógicamente por palabras y partículas.
        """
        
        respuesta = cliente_ia.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt
        )
        
        texto_limpio = respuesta.text.strip().replace("```json", "").replace("```", "")
        datos_json = json.loads(texto_limpio)
        
        coleccion.update_one(
            {"japones": datos.palabra_japones, "usuario": datos.usuario},
            {"$set": {"ejemploIA": datos_json}}
        )
        
        return datos_json

    except Exception as e:
        print(f"❌ Error al generar ejemplo con IA: {e}")
        raise HTTPException(status_code=500, detail="La Inteligencia Artificial está procesando demasiadas cosas. Intenta de nuevo.")

@app.post("/generar-reto-survival-lote")
async def generar_reto_survival_lote(datos: PeticionSurvivalLote):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="API Key de Gemini no configurada")

    try:
        prompt = f"""
        Eres un examinador estricto de japonés (nivel JLPT N5/N4). 
        Genera un reto de opción múltiple para CADA UNA de las siguientes {len(datos.palabras_japones)} palabras:
        {', '.join(datos.palabras_japones)}
        
        Devuelve ÚNICAMENTE un ARREGLO JSON válido (una lista de objetos), sin usar bloques de código Markdown. 
        El arreglo debe tener exactamente {len(datos.palabras_japones)} objetos con esta estructura exacta:
        [
            {{
                "oracion_oculta_kanji": "oración en japonés con '____' en lugar de la palabra objetivo",
                "oracion_oculta_romaji": "la misma oración en romaji con '____'",
                "traduccion_espanol": "traducción de la oración completa al español",
                "correcta": {{
                    "kanji": "palabra correcta",
                    "romaji": "romaji correcto"
                }},
                "distractores": [
                    {{"kanji": "trampa 1", "romaji": "romaji 1"}},
                    {{"kanji": "trampa 2", "romaji": "romaji 2"}},
                    {{"kanji": "trampa 3", "romaji": "romaji 3"}}
                ],
                "explicacion": "Breve explicación."
            }}
        ]
        REGLA CRÍTICA: Los distractores deben tener la misma categoría y terminación gramatical que la respuesta correcta.
        """
        
        respuesta = cliente_ia.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt
        )
        
        texto_bruto = respuesta.text

        match = re.search(r'\[.*\]', texto_bruto, re.DOTALL)
        
        if match:
            texto_limpio = match.group(0)
        else:
            texto_limpio = texto_bruto.strip().replace("```json", "").replace("```", "")
            
        return json.loads(texto_limpio)

    except Exception as e:
        print(f"❌ Error en lote Python: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Falla en el servidor: {str(e)}")