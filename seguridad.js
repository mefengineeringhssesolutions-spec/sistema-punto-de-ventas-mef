// ============================================================================
// SEGURIDAD.JS - GUARDIÁN SILENCIOSO DEL SISTEMA MME
// ============================================================================

(function() {
    // 1. Evitar que el guardián actúe si por accidente se lee en el Login
    const urlActual = window.location.pathname.toLowerCase();
    if (urlActual.includes('login.html') || urlActual.endsWith('/')) {
        return; 
    }

    // ==========================================
    // FUNCIÓN DE EXPULSIÓN CON MODAL ELEGANTE
    // ==========================================
    function expulsarConModal(mensaje) {
        function inyectar() {
            // Borramos visualmente el contenido de la página para proteger los datos
            document.body.innerHTML = '';
            document.body.style.backgroundColor = '#f4f6f8';

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(30,41,59,0.85); display:flex; justify-content:center; align-items:center; z-index:9999; padding:20px; opacity:0; transition:opacity 0.2s;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background:#fff; width:100%; max-width:350px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.2); text-align:center; transform:scale(0.95); transition:transform 0.2s; overflow:hidden; font-family: sans-serif;';

            modal.innerHTML = `
                <div style="padding: 24px 20px 10px; color: #b98900;">
                    <span class="material-icons-outlined" style="font-size: 48px; margin-bottom: 8px;">gpp_bad</span>
                    <h3 style="font-size: 18px; margin: 0; color: #202223;">Sesión Expirada</h3>
                </div>
                <div style="padding: 0 20px 24px; color: #6d7175; font-size: 14px; line-height: 1.5;">
                    ${mensaje}
                </div>
                <div style="padding: 16px 20px; background: #f8fafc; border-top: 1px solid #c9cccf;">
                    <button id="btn-entendido-expirado" style="width: 100%; background: #1e293b; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s;">
                        Volver a Ingresar
                    </button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Animación de entrada suave
            setTimeout(() => { 
                overlay.style.opacity = '1'; 
                modal.style.transform = 'scale(1)'; 
            }, 10);

            // Redirección al login al confirmar
            document.getElementById('btn-entendido-expirado').onclick = () => {
                window.location.replace('login.html');
            };
        }

        // Si el body ya cargó lo inyectamos, si no, esperamos a que cargue
        if (document.body) {
            inyectar();
        } else {
            document.addEventListener('DOMContentLoaded', inyectar);
        }
    }

    // 2. Verificar que exista una sesión activa en la memoria
    const sesion = localStorage.getItem('isa_sesion');
    if (!sesion) {
        window.location.replace('login.html');
        return;
    }

    // ==========================================
    // 3. CONTROL DE TIEMPO Y AUTO-CIERRE
    // ==========================================
    const TIEMPO_MAXIMO = 5 * 60 * 1000; // 5 minutos de tolerancia
    const ultimaActividad = localStorage.getItem('isa_ultima_actividad');

    // Si hay un registro de actividad previa, comprobamos si ya pasó el tiempo límite
    if (ultimaActividad) {
        const tiempoPasado = Date.now() - parseInt(ultimaActividad);
        
        // Si pasaron más de 5 minutos (ya sea por inactividad o porque cerraste el navegador)
        if (tiempoPasado > TIEMPO_MAXIMO) {
            localStorage.removeItem('isa_sesion');
            localStorage.removeItem('isa_ultima_actividad');
            expulsarConModal("Por motivos de seguridad, tu tiempo de conexión ha terminado. Por favor, inicia sesión nuevamente.");
            return;
        }
    }

    // Si pasó la prueba de tiempo, actualizamos la marca del reloj de inmediato
    localStorage.setItem('isa_ultima_actividad', Date.now().toString());

    // Función para resetear el reloj cada vez que el usuario se mueva
    let timerInactividad;
    function registrarActividad() {
        localStorage.setItem('isa_ultima_actividad', Date.now().toString());
        clearTimeout(timerInactividad);
        
        // Temporizador en vivo: te bota si dejas la computadora abierta
        timerInactividad = setTimeout(() => {
            localStorage.removeItem('isa_sesion');
            localStorage.removeItem('isa_ultima_actividad');
            expulsarConModal("Tu sesión ha sido cerrada automáticamente tras 5 minutos de inactividad para proteger los datos.");
        }, TIEMPO_MAXIMO);
    }

    // Escuchamos cualquier movimiento del mouse o teclado para saber que sigues ahí
    window.addEventListener('load', registrarActividad);
    document.addEventListener('mousemove', registrarActividad);
    document.addEventListener('keypress', registrarActividad);
    document.addEventListener('scroll', registrarActividad);
    document.addEventListener('click', registrarActividad);
    document.addEventListener('touchstart', registrarActividad); // Soporte extra para móviles

    // ==========================================
    // 4. BLOQUEO DE CURIOSOS (ANTI-HACKERS BÁSICOS)
    // ==========================================
    
    // Bloquea el Click Derecho
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault(); 
    });

    // Bloquea las herramientas de desarrollador (F12, Ctrl+Shift+I, etc.)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
           (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) || 
           (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
            e.preventDefault();
        }
    });

})();
