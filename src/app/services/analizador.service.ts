import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalizadorService {
  // Apuntamos al servidor en Render
   private baseUrl = 'https://api-japones.onrender.com'; 

  // Pruebas locales
  //private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  private getHeaders(): { headers: HttpHeaders } {
    let token = '';
    if (typeof window !== 'undefined' && window.localStorage) {
      token = localStorage.getItem('tokenJapones') || '';
    }
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // --- RUTAS DE AUTENTICACIÓN ---
  registrarUsuario(usuario: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/registro`, { usuario, email, password });
  }

  verificarCodigo(usuario: string, codigo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verificar-codigo`, { usuario, codigo });
  }

  loginUsuario(usuario: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, { usuario, password });
  }

  obtenerRacha(usuario: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/racha/${usuario}`, this.getHeaders());
  }

  registrarEstudio(usuario: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/registrar-estudio/${usuario}`, {}, this.getHeaders());
  }

  // --- RUTAS PROTEGIDAS ---
  analizarTexto(texto: string, usuario: string, idioma: string = 'ja'): Observable<any> {
    const payload = { 
      texto: texto, 
      usuario: usuario,
      idioma: idioma
    };
    return this.http.post(`${this.baseUrl}/extraer-vocabulario`, payload, this.getHeaders());
  }

  obtenerHistorial(usuario: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/historial/${usuario}`, this.getHeaders());
  }

  obtenerBiblioteca(usuario: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/biblioteca/${usuario}`, this.getHeaders());
  }

  eliminarPalabra(usuario: string, japones: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/eliminar/${usuario}/${japones}`, this.getHeaders());
  }

  actualizarNivel(usuario: string, japones: string, nivel: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/actualizar-nivel/${usuario}/${japones}/${nivel}`, {}, this.getHeaders());
  }

  generarEjemplo(usuario: string, palabra_japones: string) {
    return this.http.post<any>(`${this.baseUrl}/generar-ejemplo`, { 
      usuario: usuario,
      palabra_japones: palabra_japones 
    }, this.getHeaders());
  }

  generarRetosSurvivalLote(usuario: string, palabras_japones: string[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/generar-reto-survival-lote`, { 
      usuario: usuario, 
      palabras_japones: palabras_japones 
    });
  }

  // --- RUTAS DE PERFIL ---
  cambiarPassword(usuario: string, password_actual: string, password_nueva: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/cambiar-password`, { usuario, password_actual, password_nueva }, this.getHeaders());
  }

  eliminarCuenta(usuario: string, password_actual: string): Observable<any> {
    const options = {
      headers: this.getHeaders().headers,
      body: { usuario: usuario, password: password_actual }
    };
    return this.http.delete(`${this.baseUrl}/eliminar-cuenta`, options);
  }

  // --- RUTAS DE RECUPERACIÓN DE CONTRASEÑA ---
  solicitarRecuperacion(usuario: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/solicitar-recuperacion`, { usuario });
  }

  resetearPassword(usuario: string, codigo: string, nueva_password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/resetear-password`, { usuario, codigo, nueva_password });
  }

}