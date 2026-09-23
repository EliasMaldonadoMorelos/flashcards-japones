import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalizadorService } from './services/analizador.service';
import confetti from 'canvas-confetti';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, BaseChartDirective],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {

  // ==========================================
  // VARIABLES GLOBALES DE LA APP
  // ==========================================
  transicionando: boolean = false;
  mensajeTransicion: string = '';
  textoEntrada: string = '';
  modoEstudio: boolean = false;
  repasoActivo: boolean = false;
  palabras: { japones: string; espanol: string; furigana?: string; romaji?: string; volteada?: boolean; 
    repasada?: boolean; nivel?: number; cargandoIA?: boolean; ejemploIA?: any; 
    inputEstudio?: string; revelada?: boolean; mostrarContexto?: boolean }[] = [];

  cargando: boolean = false;
  tarjetasDominadas: number = 0;
  bibliotecaCompleta: any[] = [];
  mostrandoBiblioteca: boolean = false;
  mostrandoGenerador: boolean = false;
  idiomaEntrada: 'ja' | 'es' = 'ja';
  rachaActual: number = 0;

  // ==========================================
  // VARIABLES JUEGO 1: TIME ATTACK
  // ==========================================
  jugandoArcade: boolean = false;
  tarjetasArcadeJa: any[] = []; 
  tarjetasArcadeEs: any[] = []; 
  seleccionArcadeJa: any = null; 
  seleccionArcadeEs: any = null; 
  paresCompletados: number = 0;
  bloqueandoTablero: boolean = false;
  juegoActivo: boolean = false;
  modoArcadeActual: string = 'menu';
  puntosArcade: number = 0;
  comboArcade: number = 0;
  tiempoArcade: number = 60;
  rondaArcade: number = 1;
  intervaloReloj: any;
  juegoTerminado: boolean = false;

  // ==========================================
  // VARIABLES JUEGO 2: CONSTRUCTOR
  // ==========================================
  modoConstructorActual: 'bloques' | 'romaji' = 'bloques';
  constructorOracionOriginal: string = '';
  constructorRomajiOriginal: string = '';
  constructorTraduccion: string = '';
  
  bloquesDisponibles: string[] = [];
  bloquesArmados: string[] = [];
  inputConstructorRomaji: string = '';
  constructorResuelto: boolean = false;
  constructorError: boolean = false;
  puntosConstructor: number = 0;
  cargandoOracionArcade: boolean = false;
  mostrandoPistaArcade: boolean = false;

  // ==========================================
  // VARIABLES JUEGO 3: SURVIVAL (EL DESAFÍO)
  // ==========================================
  rondaSurvival: number = 1; // Racha actual (Meta: 10)
  nivelSurvival: number = 1; // Nivel 1: Romaji, Nivel 2: Kanji
  retoActualSurvival: any = null;
  opcionesSurvival: any[] = [];
  cargandoRetoSurvival: boolean = false;
  estadoSurvival: 'jugando' | 'gameover' | 'victoria' = 'jugando';
  opcionAnimacionExito: any = null;
  retosNivelActual: any[] = []; // Guarda las 10 preguntas pre-generadas

  // ==========================================
  // VARIABLES PARA NOTIFICACIONES (TOASTS)
  // ==========================================
  toastMensaje: string = '';
  toastTipo: 'exito' | 'error' | 'info' = 'info';
  mostrandoModalBorrar: boolean = false;

  // ==========================================
  // VARIABLES DE AUTENTICACIÓN Y ESTADO VISUAL
  // ==========================================
  usuarioActivo: string = ''; 
  inputUsuario: string = '';  
  inputPassword: string = '';
  inputEmail: string = '';
  inputCodigo: string = '';
  mensajeError: string = '';  
  mensajeExito: string = '';
  vistaActual: 'login' | 'registro' | 'verificacion' | 'recuperacion' | 'resetear' = 'login';
  cargandoSesion: boolean = true;
  cargandoAuth: boolean = false;

  // ==========================================
  // VARIABLES DE PERFIL (DANGER ZONE)
  // ==========================================
  mostrandoPerfil: boolean = false;
  inputPassActual: string = '';
  inputPassNueva: string = '';
  inputPassConfirmar: string = '';
  inputPassEliminar: string = '';
  mensajePerfil: string = '';
  tipoMensajePerfil: 'exito' | 'error' = 'exito';

  // ==========================================
  // VARIABLES DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  inputResetUsuario: string = '';
  inputResetCodigo: string = '';
  inputResetPassword: string = '';

  // ==========================================
  // VARIABLES PARA LA BIBLIOTECA AVANZADA
  // ==========================================
  mazos: { nombre: string; icono: string; palabras: any[] }[] = [];
  mazoActivo: any = null;
  busquedaBiblioteca: string = '';
  vistaBiblioteca: 'grid' | 'lista' = 'grid';

  // ==========================================
  // CONFIGURACIÓN DE GRÁFICA (CHART.JS)
  // ==========================================
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Nuevas / Difíciles', 'Repasando (Bien)', 'Dominadas (Fácil)'],
    datasets: [
      { 
        data: [0, 0, 0], 
        backgroundColor: ['#ef4444', '#facc15', '#22c55e'], 
        borderColor: ['#1e293b'], 
        borderWidth: 2
      }
    ]
  };
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
  };

  constructor(private analizadorService: AnalizadorService) {}

  // ==========================================
  // CICLO DE VIDA (INIT)
  // ==========================================
  ngOnInit() {
    this.mostrandoBiblioteca = false;
    this.mostrandoPerfil = false;
    if (typeof window !== 'undefined' && window.localStorage) {
    const usuarioGuardado = localStorage.getItem('usuarioJapones');
    const tokenGuardado = localStorage.getItem('tokenJapones');

    if (usuarioGuardado && tokenGuardado) {
      this.usuarioActivo = usuarioGuardado;
      this.cargarHistorial(); 
      } else {
        this.cargandoSesion = false; 
      }
    } else {
      this.cargandoSesion = true;
    }
  }

  // ==========================================
  // MÓDULO: NAVEGACIÓN Y VISTAS
  // ==========================================
  ejecutarTransicion(mensaje: string, accion: () => void) {
    this.mensajeTransicion = mensaje;
    this.transicionando = true;
    setTimeout(() => {
      accion();
      this.transicionando = false;
    }, 400);
  }

  abrirGenerador() {
    this.ejecutarTransicion('Abriendo Inteligencia Artificial...', () => {
      this.salirArcade();
      this.ocultarTodosLosContextos();
      this.mostrandoGenerador = true;
      this.mostrandoBiblioteca = false;
      this.mostrandoPerfil = false;
    });
  }

  cerrarGenerador() {
    this.ejecutarTransicion('Volviendo al panel...', () => {
      this.mostrandoGenerador = false;
    });
  }

  comenzarRepasoDiarioWrapper() {
    this.ejecutarTransicion('Preparando tu sesión de estudio...', () => {
      this.comenzarRepasoDiario();
    });
  }

  iniciarArcadeWrapper() {
    this.ejecutarTransicion('Encendiendo consola...', () => {
      this.iniciarArcade();
    });
  }

  cambiarVista(vista: 'login' | 'registro' | 'verificacion' | 'recuperacion' | 'resetear') {
    this.vistaActual = vista;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  abrirPerfil() {
    this.ejecutarTransicion('Cargando ajustes de usuario...', () => {
      this.salirArcade();
      this.ocultarTodosLosContextos();
      this.mostrandoPerfil = true;
      this.mostrandoBiblioteca = false;
      this.mostrandoGenerador = false;
      this.repasoActivo = false;
      this.limpiarFormulariosPerfil(); 
    });
  }

  volverAlPanelPrincipal() {
    this.ejecutarTransicion('Volviendo al panel principal...', () => {
      this.mostrandoPerfil = false;
      this.mostrandoBiblioteca = false;
      this.mostrandoGenerador = false;
      this.repasoActivo = false;
      this.salirArcade();
      this.cargarHistorial(); 
      this.limpiarFormulariosPerfil();
    });
  }

  mostrarToast(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    // La notificación desaparece sola después de 3 segundos
    setTimeout(() => { this.toastMensaje = ''; }, 3000);
  }

  // ==========================================
  // MÓDULO: AUTENTICACIÓN (LOGIN/REGISTRO)
  // ==========================================
  iniciarSesion() {
    this.mensajeError = '';
    if (this.inputUsuario.trim() && this.inputPassword.trim()) {
      this.cargandoAuth = true;
      this.analizadorService.loginUsuario(this.inputUsuario.trim(), this.inputPassword).subscribe({
        next: (res) => {
          this.usuarioActivo = res.usuario;
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('usuarioJapones', res.usuario);
            localStorage.setItem('tokenJapones', res.access_token);
          }
          this.cargandoAuth = false;
          this.cargandoSesion = false; 
          this.cargarHistorial();
        },
        error: (err) => {
          this.cargandoAuth = false;
          if (err.status === 403 && err.error.detail && err.error.detail.includes('verificar')) {
            this.cambiarVista('verificacion');
            this.mensajeError = err.error.detail;
          } else {
            this.mensajeError = err.error?.detail || 'Error al iniciar sesión ❌';
          }
        }
      });
    }
  }

  registrarse() {
    this.mensajeError = '';
    if (this.inputUsuario.trim() && this.inputPassword.trim() && this.inputEmail.trim()) {
      this.cargandoAuth = true;
      this.analizadorService.registrarUsuario(this.inputUsuario.trim(), this.inputEmail.trim(), this.inputPassword).subscribe({
        next: (res) => {
          this.cargandoAuth = false;
          this.cambiarVista('verificacion');
          this.mensajeExito = '¡Correo enviado! Revisa tu bandeja de entrada o SPAM.';
        },
        error: (err) => { 
          this.cargandoAuth = false;
          this.mensajeError = err.error?.detail || 'Error al registrar ❌'; 
        }
      });
    } else {
      this.mensajeError = 'Llena todos los campos (Alias, Correo y Contraseña)';
    }
  }
  
  verificarCuenta() {
    this.mensajeError = '';
    this.mensajeExito = '';
    if (this.inputUsuario.trim() && this.inputCodigo.trim()) {
      this.cargandoAuth = true;
      this.analizadorService.verificarCodigo(this.inputUsuario.trim(), this.inputCodigo.trim()).subscribe({
        next: (res) => { 
          this.cargandoAuth = false;
          this.iniciarSesion(); 
        },
        error: (err) => { 
          this.cargandoAuth = false;
          this.mensajeError = err.error?.detail || 'Código incorrecto ❌'; 
        }
      });
    }
  }

  cerrarSesion() {
    this.salirArcade();
    this.ocultarTodosLosContextos();
    this.usuarioActivo = '';
    this.inputUsuario = '';
    this.inputPassword = '';
    this.palabras = [];
    this.tarjetasDominadas = 0;
    this.cambiarVista('login');
    this.mostrandoPerfil = false; 
    this.mostrandoBiblioteca = false;
    this.modoEstudio = false;

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('usuarioJapones');
      localStorage.removeItem('tokenJapones'); 
    }
  }

  // ==========================================
  // MÓDULO: RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  pedirRecuperacion() {
    this.mensajeError = '';
    this.mensajeExito = '';
    if (this.inputResetUsuario.trim()) {
      this.cargandoAuth = true;
      this.analizadorService.solicitarRecuperacion(this.inputResetUsuario.trim()).subscribe({
        next: (res) => {
          this.cargandoAuth = false;
          this.mensajeExito = 'Si el alias existe, enviamos un código a tu correo (Válido por 15 min).';
          this.cambiarVista('resetear');
        },
        error: (err) => { 
          this.cargandoAuth = false;
          this.mensajeError = 'Error al solicitar recuperación.'; 
        }
      });
    } else {
      this.mensajeError = 'Por favor ingresa tu alias.';
    }
  }

  aplicarNuevaPassword() {
    this.mensajeError = '';
    this.mensajeExito = '';
    if (this.inputResetUsuario.trim() && this.inputResetCodigo.trim() && this.inputResetPassword.trim()) {
      this.cargandoAuth = true;
      this.analizadorService.resetearPassword(this.inputResetUsuario.trim(), this.inputResetCodigo.trim(), this.inputResetPassword.trim()).subscribe({
        next: (res) => {
          this.cargandoAuth = false;
          this.mensajeExito = '¡Contraseña actualizada! Tu cuenta ha sido desbloqueada. Ya puedes iniciar sesión.';
          this.inputUsuario = this.inputResetUsuario;
          this.inputPassword = '';
          this.cambiarVista('login');
        },
        error: (err) => { 
          this.cargandoAuth = false;
          this.mensajeError = err.error?.detail || 'Error al restaurar contraseña ❌'; 
        }
      });
    } else {
      this.mensajeError = 'Llena todos los campos (Alias, Código y Nueva Contraseña)';
    }
  }

  // ==========================================
  // MÓDULO: PERFIL DEL USUARIO
  // ==========================================
  limpiarFormulariosPerfil() {
    this.inputPassActual = '';
    this.inputPassNueva = '';
    this.inputPassConfirmar = '';
    this.inputPassEliminar = '';
    this.mensajePerfil = '';
  }

  mostrarMensajePerfil(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajePerfil = mensaje;
    this.tipoMensajePerfil = tipo;
    setTimeout(() => this.mensajePerfil = '', 5000);
  }

  actualizarPassword() {
    this.mensajePerfil = '';
    if (!this.inputPassActual || !this.inputPassNueva || !this.inputPassConfirmar) {
      this.mostrarMensajePerfil('Llena todos los campos', 'error'); return;
    }
    if (this.inputPassNueva !== this.inputPassConfirmar) {
      this.mostrarMensajePerfil('Las contraseñas nuevas no coinciden', 'error'); return;
    }

    this.analizadorService.cambiarPassword(this.usuarioActivo, this.inputPassActual, this.inputPassNueva).subscribe({
      next: (res) => {
        this.mostrarMensajePerfil(res.mensaje, 'exito');
        this.inputPassActual = ''; this.inputPassNueva = ''; this.inputPassConfirmar = '';
      },
      error: (err) => { this.mostrarMensajePerfil(err.error.detail || 'Error al cambiar contraseña', 'error'); }
    });
  }

  borrarCuenta() {
    if (!this.inputPassEliminar) {
      this.mostrarMensajePerfil('Ingresa tu contraseña para confirmar', 'error'); return;
    }
    this.mostrandoModalBorrar = true;
  }

  ejecutarBorradoDefinitivo() {
    this.analizadorService.eliminarCuenta(this.usuarioActivo, this.inputPassEliminar).subscribe({
      next: (res) => {
        this.mostrandoModalBorrar = false;
        this.mostrarToast("Cuenta eliminada correctamente. ¡Hasta pronto!", "exito");
        this.mostrandoPerfil = false;
        this.cerrarSesion();
      },
      error: (err) => { 
        this.mostrandoModalBorrar = false;
        this.mostrarMensajePerfil(err.error.detail || 'Error al eliminar cuenta', 'error'); 
      }
    });
  }

  // ==========================================
  // MÓDULO: LÓGICA DE FLASHCARDS E IA
  // ==========================================
  cargarHistorial() {
    this.analizadorService.obtenerRacha(this.usuarioActivo).subscribe({
      next: (res) => this.rachaActual = res.racha
    });

    this.analizadorService.obtenerHistorial(this.usuarioActivo).subscribe({
      next: (res) => {
        this.palabras = res.vocabulario.map((p: any) => ({...p, volteada: false}));
        this.cargandoSesion = false;
      },
      error: (err) => { 
        console.error('Error al cargar historial', err); 
        this.cerrarSesion();
      }
    });

    this.analizadorService.obtenerBiblioteca(this.usuarioActivo).subscribe({
      next: (res) => {
        this.bibliotecaCompleta = res.palabras;
        this.actualizarGraficaGlobal(this.bibliotecaCompleta);
      }
    });
  }

  procesarTexto() {
    if (!this.textoEntrada.trim()) return;
    this.cargando = true;
    this.analizadorService.analizarTexto(this.textoEntrada, this.usuarioActivo, this.idiomaEntrada).subscribe({
      next: (res) => {
        this.cargarHistorial(); 
        this.cargando = false;
        this.textoEntrada = '';
        this.mostrarToast('¡Tarjetas generadas con éxito!', 'exito');
        
        this.ejecutarTransicion('Actualizando tu Misión de Hoy...', () => {
          this.mostrandoGenerador = false;
        });
      },
      error: (err) => {
        console.error('Error al conectar con la IA', err);
        this.cargando = false;
        this.mostrarToast('Hubo un error al conectar con el servidor.', 'error');
      }
    });
  }

  eliminarFlashcard(japones: string, event: Event) {
    event.stopPropagation(); 
    const palabraSegura = encodeURIComponent(japones);

    this.analizadorService.eliminarPalabra(this.usuarioActivo, palabraSegura).subscribe({
      next: () => {
        this.palabras = this.palabras.filter(p => p.japones !== japones);
        this.bibliotecaCompleta = this.bibliotecaCompleta.filter(p => p.japones !== japones);
        if (this.mazoActivo) {
          this.mazoActivo.palabras = this.mazoActivo.palabras.filter((p: any) => p.japones !== japones);
        }

        this.tarjetasDominadas = this.palabras.filter(p => p.nivel && p.nivel > 0).length;
        this.actualizarGrafica();
        this.actualizarGraficaGlobal(this.bibliotecaCompleta);
        
        this.mostrarToast(`Tarjeta eliminada correctamente.`, 'info');
      },
      error: (err) => { console.error('Error al eliminar la tarjeta', err); }
    });
  }

  pedirEjemploIA(palabra: any, event: Event) {
    event.stopPropagation(); 
    palabra.cargandoIA = true; 
    
    this.analizadorService.generarEjemplo(this.usuarioActivo, palabra.japones).subscribe({
      next: (res) => {
        palabra.ejemploIA = res; 
        palabra.cargandoIA = false; 
      },
      error: (err) => {
        console.error('Error al generar ejemplo', err);
        palabra.cargandoIA = false;
      }
    });
  }

  ocultarTodosLosContextos() {
    this.palabras.forEach(p => p.mostrarContexto = false);
  }

  // ==========================================
  // MÓDULO: INTERACCIÓN DE USUARIO (AUDIO/CLICS)
  // ==========================================
  interactuarTarjeta(palabra: any) {
    palabra.mostrarContexto = false;
    if (this.modoEstudio) {
      palabra.volteada = !palabra.volteada;
      if (palabra.volteada) { this.reproducirAudio(palabra.japones); }
    } else {
      this.reproducirAudio(palabra.japones);
    }
  }

  calificarTarjeta(palabra: any, nivel: number, event: Event) {
    event.stopPropagation(); 
    this.analizadorService.actualizarNivel(this.usuarioActivo, palabra.japones, nivel).subscribe({
      next: () => {
        palabra.repasada = true;
        palabra.nivel = nivel;

        this.analizadorService.registrarEstudio(this.usuarioActivo).subscribe({
          next: (rachaRes) => {
            if (this.rachaActual < rachaRes.racha) {
              this.mostrarToast(`¡Racha aumentada! 🔥 ${rachaRes.racha} días seguidos.`, 'exito');
            }
            this.rachaActual = rachaRes.racha;
          }
        });
        
        if (nivel === 2) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#ffffff'] });
        }

        setTimeout(() => {
          this.palabras = this.palabras.filter(p => p.japones !== palabra.japones);
          
          this.tarjetasDominadas = this.palabras.filter(p => p.nivel && p.nivel > 0).length;
          this.actualizarGrafica();
        }, 1200);

      },
      error: (err) => { console.error('Error al actualizar el nivel', err); }
    });
  }

  reproducirAudio(textoJapones: string, event?: Event) {
    if (event) {
      event.stopPropagation(); 
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const mensaje = new SpeechSynthesisUtterance(textoJapones);
      mensaje.lang = 'ja-JP';
      mensaje.rate = 0.85;

      const voces = window.speechSynthesis.getVoices();
      const vozJaponesa = voces.find(voz => voz.lang.includes('ja') || voz.lang.includes('JP'));

      if (vozJaponesa) { mensaje.voice = vozJaponesa; }
      window.speechSynthesis.speak(mensaje);
    }
  }

  normalizarTexto(texto: string): string {
    if (!texto) return "";
    
    let t = texto.toLowerCase().trim();
    t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    t = t.replace(/ou/g, "o");
    t = t.replace(/oo/g, "o");
    t = t.replace(/uu/g, "u");
    t = t.replace(/-/g, "");
    
    return t;
  }

  obtenerOracionOculta(palabra: any): string[] {
    if (!palabra.ejemploIA || !palabra.ejemploIA.fragmentos) return [];
    
    const target = palabra.japones.trim();
    const fragmentos = [...palabra.ejemploIA.fragmentos];

    let indexAQuitar = fragmentos.findIndex((f: string) => f.trim() === target);

    if (indexAQuitar === -1 && target.length > 1) {
      const raiz = target.substring(0, target.length - 1);
      indexAQuitar = fragmentos.findIndex((f: string) => f.trim().includes(raiz));
    }

    if (indexAQuitar === -1) {
      const kanjis = target.match(/[\u4e00-\u9faf]/g);
      if (kanjis && kanjis.length > 0) {
         indexAQuitar = fragmentos.findIndex((f: string) => f.trim().includes(kanjis[0]));
      }
    }

    return fragmentos.map((f: string, index: number) => 
      index === indexAQuitar ? '____' : f
    );
  }

  verificarRespuesta(palabra: any) {
    if (!palabra.inputEstudio) return; 

    const respuestaOriginal = palabra.inputEstudio.trim().toLowerCase();
    const respuestaFiltrada = this.normalizarTexto(palabra.inputEstudio);
    
    const okJapones = palabra.japones.toLowerCase();
    const okFurigana = palabra.furigana ? palabra.furigana.toLowerCase() : "";
    const okEspanol = palabra.espanol.toLowerCase();
    const okRomaji = palabra.romaji ? palabra.romaji.toLowerCase() : "";

    if (respuestaOriginal === okJapones || respuestaOriginal === okFurigana) {
      palabra.revelada = true; return;
    }
    if (respuestaFiltrada === this.normalizarTexto(okEspanol) || respuestaFiltrada === this.normalizarTexto(okRomaji)) {
      palabra.revelada = true; return;
    }

    this.mostrarToast("¡Casi! Inténtalo de nuevo.", "error");
  }

  comenzarRepasoDiario() {
    this.repasoActivo = true;
    this.modoEstudio = false;
    this.ocultarTodosLosContextos();
  }

  abandonarRepaso() {
    this.ejecutarTransicion('Guardando progreso y pausando...', () => {
      this.repasoActivo = false;
    });
  }

  soltarBloque(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
  
  // ==========================================
  // MÓDULO: BIBLIOTECA Y GRÁFICA GLOBAL
  // ==========================================
  abrirBiblioteca() {
    this.ejecutarTransicion('Abriendo tu colección...', () => {
      this.salirArcade();
      this.ocultarTodosLosContextos();
      this.mostrandoBiblioteca = true;
      this.mostrandoPerfil = false;
      this.mostrandoGenerador = false;
      this.repasoActivo = false;
      this.cargando = true; 
      
      this.mazoActivo = null;
      this.busquedaBiblioteca = '';

      this.analizadorService.obtenerBiblioteca(this.usuarioActivo).subscribe({
        next: (res) => {
          this.bibliotecaCompleta = res.palabras;
          this.actualizarGraficaGlobal(this.bibliotecaCompleta);
          this.generarMazosAutomaticos(this.bibliotecaCompleta);
          this.cargando = false;
        },
        error: (err) => {
          console.error("Error al cargar biblioteca", err);
          this.cargando = false;
        }
      });
    });
  }

  generarMazosAutomaticos(palabras: any[]) {
    const grupos: any = {};
    palabras.forEach(palabra => {
      const categoria = palabra.categoria || 'Otros / Sin Clasificar'; 
      if (!grupos[categoria]) grupos[categoria] = [];
      grupos[categoria].push(palabra);
    });

    this.mazos = Object.keys(grupos).map(nombre => ({
      nombre: nombre,
      icono: this.obtenerIconoMazo(nombre),
      palabras: grupos[nombre]
    })).sort((a, b) => b.palabras.length - a.palabras.length);
  }

  obtenerIconoMazo(nombre: string): string {
    const lower = nombre.toLowerCase();
    if (lower.includes('básico') || lower.includes('diari')) return '☀️';
    if (lower.includes('comida') || lower.includes('restaurante')) return '🍱';
    if (lower.includes('lugar') || lower.includes('direcc')) return '🗺️';
    if (lower.includes('verbo') || lower.includes('acción')) return '🏃‍♂️';
    if (lower.includes('adjetivo')) return '✨';
    if (lower.includes('kanji') || lower.includes('jlpt')) return '🎓';
    return '📁';
  }

  abrirMazo(mazo: any) {
    this.ejecutarTransicion(`Abriendo mazo: ${mazo.nombre}...`, () => {
      this.mazoActivo = mazo;
      this.busquedaBiblioteca = '';
    });
  }

  cerrarMazo() {
    this.ejecutarTransicion('Volviendo a mis mazos...', () => {
      this.mazoActivo = null;
    });
  }

  get palabrasMazoFiltradas() {
    if (!this.mazoActivo) return [];
    if (!this.busquedaBiblioteca) return this.mazoActivo.palabras;
    
    const termino = this.normalizarTexto(this.busquedaBiblioteca);
    return this.mazoActivo.palabras.filter((p: any) => 
      this.normalizarTexto(p.espanol).includes(termino) ||
      this.normalizarTexto(p.japones).includes(termino) ||
      (p.romaji && this.normalizarTexto(p.romaji).includes(termino))
    );
  }

  actualizarGraficaGlobal(todasLasPalabras: any[]) {
    const nuevas = todasLasPalabras.filter(p => !p.intervalo || p.intervalo === 0).length;
    const repasando = todasLasPalabras.filter(p => p.intervalo > 0 && p.intervalo < 21).length;
    const dominadas = todasLasPalabras.filter(p => p.intervalo >= 21).length;

    this.tarjetasDominadas = dominadas;

    this.doughnutChartData = {
      labels: ['Nuevas / Difíciles', 'Repasando (Bien)', 'Dominadas (Fácil)'],
      datasets: [{ 
        data: [nuevas, repasando, dominadas],
        backgroundColor: ['#ef4444', '#facc15', '#22c55e'],
        borderColor: ['#1e293b'],
        borderWidth: 2
      }]
    };
  }

  // ==========================================
  // UTILIDADES GLOBALES
  // ==========================================
  actualizarGrafica() {
    const nuevas = this.palabras.filter(p => p.nivel === 0 || p.nivel === undefined).length;
    const repasando = this.palabras.filter(p => p.nivel === 1).length;
    const dominadas = this.palabras.filter(p => p.nivel && p.nivel >= 2).length;

    this.doughnutChartData.datasets[0].data = [nuevas, repasando, dominadas];
    this.doughnutChartData = { ...this.doughnutChartData }; 
  }

  // ==========================================
  // JUEGO 1: TIME ATTACK
  // ========================================== 
  revolverArreglo(arreglo: any[]) {
    return arreglo.sort(() => Math.random() - 0.5);
  }

  iniciarArcade() {
    if (this.bibliotecaCompleta.length < 4) {
      this.mostrarToast('Necesitas al menos 4 tarjetas para jugar.', 'error');
      return;
    }
    this.modoEstudio = false; 
    this.modoArcadeActual = 'menu';
    this.jugandoArcade = true;
    this.mostrandoGenerador = false;
    this.ocultarTodosLosContextos();
    this.juegoActivo = false;
  }

  seleccionarMinijuego(juego: string) {
    this.modoArcadeActual = juego;
    this.juegoActivo = false;
  }

  volverAlMenuArcade() {
    this.modoArcadeActual = 'menu';
    this.juegoActivo = false;
    this.juegoTerminado = false;
    if (this.intervaloReloj) clearInterval(this.intervaloReloj);
  }

  comenzarPartida() {
    this.juegoActivo = true;
    this.juegoTerminado = false;
    this.puntosArcade = 0;
    this.comboArcade = 0;
    this.tiempoArcade = 60;
    this.rondaArcade = 1;
    
    this.cargarTableroArcade();
    this.iniciarReloj();
  }

  cargarTableroArcade() {
    this.paresCompletados = 0;
    let palabrasParaJugar = this.revolverArreglo([...this.bibliotecaCompleta]).slice(0, 6);

    this.tarjetasArcadeJa = this.revolverArreglo(
      palabrasParaJugar.map(p => ({ texto: p.japones, furigana: p.furigana, id_match: p.japones, resuelta: false }))
    );
    this.tarjetasArcadeEs = this.revolverArreglo(
      palabrasParaJugar.map(p => ({ texto: p.espanol, id_match: p.japones, resuelta: false }))
    );
  }

  iniciarReloj() {
    if (this.intervaloReloj) clearInterval(this.intervaloReloj);
    this.intervaloReloj = setInterval(() => {
      this.tiempoArcade--;
      if (this.tiempoArcade <= 0) {
        this.tiempoArcade = 0;
        this.finalizarJuego();
      }
    }, 1000);
  }

  seleccionarTarjetaArcade(tarjeta: any, idioma: 'ja' | 'es') {
    if (tarjeta.resuelta || this.bloqueandoTablero || this.juegoTerminado) return; 

    if (idioma === 'ja') {
      if (this.seleccionArcadeJa === tarjeta) { this.seleccionArcadeJa = null; return; }
      this.seleccionArcadeJa = tarjeta;
    } else {
      if (this.seleccionArcadeEs === tarjeta) { this.seleccionArcadeEs = null; return; }
      this.seleccionArcadeEs = tarjeta;
    }

    if (this.seleccionArcadeJa && this.seleccionArcadeEs) {
      this.bloqueandoTablero = true; 

      if (this.seleccionArcadeJa.id_match === this.seleccionArcadeEs.id_match) {
        this.comboArcade++;
        const puntosGanados = 100 * this.comboArcade;
        this.puntosArcade += puntosGanados;

        setTimeout(() => {
          this.seleccionArcadeJa.resuelta = true; 
          this.seleccionArcadeEs.resuelta = true;
          this.seleccionArcadeJa = null;
          this.seleccionArcadeEs = null;
          this.paresCompletados++;
          this.bloqueandoTablero = false; 

          if (this.paresCompletados === this.tarjetasArcadeJa.length) {
            this.bloqueandoTablero = true;
            this.tiempoArcade += 10;
            this.rondaArcade++;
            this.mostrarToast(`¡Ronda ${this.rondaArcade}! +10 Segundos ⏱️`, 'info');
            
            setTimeout(() => {
              this.cargarTableroArcade();
              this.bloqueandoTablero = false;
            }, 800);
          }
        }, 400); 

      } else {
        this.comboArcade = 0;
        this.puntosArcade = Math.max(0, this.puntosArcade - 50);
        
        this.seleccionArcadeJa.error = true;
        this.seleccionArcadeEs.error = true;

        setTimeout(() => {
          this.seleccionArcadeJa.error = false;
          this.seleccionArcadeEs.error = false;
          this.seleccionArcadeJa = null;
          this.seleccionArcadeEs = null;
          this.bloqueandoTablero = false; 
        }, 800); 
      }
    }
  }

  // ==========================================
  // JUEGO 2: CONSTRUCTOR
  // ========================================== 
  iniciarConstructor() {
    this.mostrandoPistaArcade = false;
    this.juegoActivo = true;
    this.puntosConstructor = 0; 
    this.cargarSiguienteOracion();
  }

  cargarSiguienteOracion() {
    this.constructorResuelto = false;
    this.constructorError = false;
    this.bloquesArmados = [];
    this.inputConstructorRomaji = '';

    const tarjetaAzar = this.bibliotecaCompleta[Math.floor(Math.random() * this.bibliotecaCompleta.length)];

    if (tarjetaAzar.ejemploIA && tarjetaAzar.ejemploIA.fragmentos && tarjetaAzar.ejemploIA.fragmentos.length > 0) {
      this.prepararTableroConstructor(tarjetaAzar.ejemploIA);
    } else {
      this.cargandoOracionArcade = true;
      
      fetch('https://api-japones.onrender.com/generar-ejemplo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palabra_japones: tarjetaAzar.japones, usuario: this.usuarioActivo })
      })
      .then(res => res.json())
      .then(datosIA => {
        tarjetaAzar.ejemploIA = datosIA;
        this.cargandoOracionArcade = false;
        this.prepararTableroConstructor(datosIA);
      })
      .catch(err => {
        console.error(err);
        this.cargandoOracionArcade = false;
        this.mostrarToast('Error de conexión con IA. Buscando otra palabra...', 'error');
        this.cargarSiguienteOracion();
      });
    }
  }

  prepararTableroConstructor(ejemplo: any) {
    this.constructorOracionOriginal = ejemplo.fragmentos.join('').replace(/\s+/g, '');
    this.constructorRomajiOriginal = ejemplo.oracion_romaji || ''; 
    this.constructorTraduccion = ejemplo.traduccion_espanol;
    this.bloquesDisponibles = this.revolverArreglo([...ejemplo.fragmentos]);
  }

  seleccionarBloque(bloque: string) {
    const idx = this.bloquesDisponibles.indexOf(bloque);
    if (idx > -1) {
      this.bloquesDisponibles.splice(idx, 1);
      this.bloquesArmados.push(bloque);
    }
  }

  quitarBloque(bloque: string) {
    const idx = this.bloquesArmados.indexOf(bloque);
    if (idx > -1) {
      this.bloquesArmados.splice(idx, 1);
      this.bloquesDisponibles.push(bloque);
    }
  }

  comprobarConstructor() {
    let esCorrecto = false;

    if (this.modoConstructorActual === 'bloques') {
      const oracionArmada = this.bloquesArmados.join('').replace(/\s+/g, '');
      esCorrecto = oracionArmada === this.constructorOracionOriginal;
    } else {
      let romajiLimpio = this.inputConstructorRomaji.toLowerCase().replace(/[\s.,?!]/g, '').trim();
      let romajiOriginalLimpio = this.constructorRomajiOriginal.toLowerCase().replace(/[\s.,?!]/g, '').trim();

      romajiLimpio = romajiLimpio.replace(/wo/g, 'o');
      romajiOriginalLimpio = romajiOriginalLimpio.replace(/wo/g, 'o');
      
      romajiLimpio = romajiLimpio.replace(/nn/g, 'n');
      romajiOriginalLimpio = romajiOriginalLimpio.replace(/nn/g, 'n');

      esCorrecto = romajiLimpio === romajiOriginalLimpio;
    }

    if (esCorrecto) {
      this.constructorResuelto = true;
      this.puntosConstructor += 100;
      this.mostrarToast('¡Oración Perfecta! +100pts 🎉', 'exito');
    } else {
      this.constructorError = true;
      this.puntosConstructor = Math.max(0, this.puntosConstructor - 20);
      
      this.mostrarToast('¡Ups! El orden no es correcto. -20pts ❌', 'error');
      
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      setTimeout(() => this.constructorError = false, 800); 
    }
  }

  saltarOracion() {
    this.mostrarToast('Oración saltada. ¡No te preocupes!', 'info');
    this.ejecutarTransicion('Buscando otro reto...', () => {
      this.cargarSiguienteOracion();
    });
  }

  // ==========================================
  // JUEGO 3: SURVIVAL (MOTOR OPTIMIZADO POR LOTES)
  // ========================================== 
  iniciarSurvival() {
    this.modoArcadeActual = 'survival';
    this.nivelSurvival = 1; 
    this.prepararNivelCompleto();
  }

  reiniciarSurvival() {
    this.estadoSurvival = 'jugando';
    this.prepararNivelCompleto();
  }

  prepararNivelCompleto() {
    this.rondaSurvival = 1;
    this.cargandoRetoSurvival = true;
    this.retosNivelActual = [];

    const lotePalabras: string[] = [];
    for (let i = 0; i < 10; i++) {
      const tarjetaAzar = this.bibliotecaCompleta[Math.floor(Math.random() * this.bibliotecaCompleta.length)];
      lotePalabras.push(tarjetaAzar.japones);
    }

    this.analizadorService.generarRetosSurvivalLote(this.usuarioActivo, lotePalabras).subscribe({
      next: (res: any[]) => {
        this.retosNivelActual = res;
        this.cargandoRetoSurvival = false;
        this.mostrarSiguientePreguntaLocal();
      },
      error: (err) => {
        console.error("Error al generar nivel completo:", err);
        this.mostrarToast('El examinador tuvo un error. Reintentando...', 'error');
        this.modoArcadeActual = 'menu';
        this.cargandoRetoSurvival = false;
      }
    });
  }

  mostrarSiguientePreguntaLocal() {
    const indice = this.rondaSurvival - 1;
    this.retoActualSurvival = this.retosNivelActual[indice];
    
    this.opcionesSurvival = this.revolverArreglo([
      this.retoActualSurvival.correcta, 
      ...this.retoActualSurvival.distractores
    ]);
  }

  seleccionarOpcionSurvival(opcionSeleccionada: any) {
    if (this.estadoSurvival !== 'jugando' || this.opcionAnimacionExito) return;

    const esCorrecta = opcionSeleccionada.kanji === this.retoActualSurvival.correcta.kanji;

    if (esCorrecta) {
      this.opcionAnimacionExito = opcionSeleccionada;
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(50);

      setTimeout(() => {
        this.opcionAnimacionExito = null;

        if (this.rondaSurvival === 10) {
          this.mostrarToast(`¡Nivel ${this.nivelSurvival} superado! 🔥`, 'exito');
          this.nivelSurvival++;
          this.prepararNivelCompleto(); 
        } else {
          this.rondaSurvival++;
          this.mostrarSiguientePreguntaLocal();
        }
      }, 1000);

    } else {
      this.estadoSurvival = 'gameover';
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  finalizarJuego() {
    this.juegoTerminado = true;
    clearInterval(this.intervaloReloj);
  }

  salirArcade() {
    this.jugandoArcade = false;
    this.seleccionArcadeJa = null;
    this.seleccionArcadeEs = null;
    this.juegoActivo = false;
    clearInterval(this.intervaloReloj);
  }

}