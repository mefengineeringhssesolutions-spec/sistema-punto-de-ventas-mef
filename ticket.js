// ==========================================
// TICKET.JS - CEREBRO DE IMPRESIÓN (VERSIÓN COMPUTADORA / NAVEGADOR)
// ==========================================

// Formateador de moneda oficial para Perú (S/ 0.00)
const formatoSolesTicket = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

async function imprimirTicketGlobal(ventaObj) {
    if(!ventaObj) return alert("Error al encontrar los datos de la venta para imprimir.");

    // 1. OBTENER DATOS DE LA EMPRESA (Desde LocalStorage cargado por el servidor)
    // Ya no usamos Firebase, dependemos de lo que 'Configuracion.html' guardó al inicio.
    let configGuardada = {};
    try {
        configGuardada = JSON.parse(localStorage.getItem('isa_config')) || {};
    } catch (error) {
        console.error("Error obteniendo configuración local:", error);
        configGuardada = {};
    }
    
    // Datos corporativos por defecto MME en caso no cargue la configuración
    const DATOS_EMPRESA = {
        nombre: configGuardada.empresa || "MME ENGINEERING & SOLUCIONES",
        ruc: configGuardada.ruc || "10733720323",
        direccion: configGuardada.direccion || "Cajamarca",
        celular: configGuardada.telefono || "978536345",
        mensajeFinal: configGuardada.mensajeFinal || "¡Gracias por su preferencia!"
    };

    const igvPorcentaje = configGuardada.igv !== undefined ? configGuardada.igv : 18;

    // 2. MAQUEO DE DATOS DE LA VENTA (CAMBIO DE CAMELCASE A SNAKE_CASE)
    // El servidor Node.js envía datos como 'id_vendedor', ya no 'idVendedor'.
    const nomVendedor = ventaObj.nombre_vendedor ? ventaObj.nombre_vendedor.split(' ')[0] : (ventaObj.id_vendedor || "Caja");
    const boletaSegura = String(ventaObj.boleta || '0').padStart(6, '0');
    const clienteSeguro = ventaObj.nombre_cliente || "Cliente General";
    const dniSeguro = ventaObj.dni_cliente || "S/D";
    
    // Manejo inteligente de fecha (formato ISO a Local)
    let fechaSegura = ventaObj.fecha_registro || ventaObj.fecha || "--/--/----";
    if(fechaSegura.includes('T') || fechaSegura.includes('-')) {
        const fObj = new Date(fechaSegura);
        if (!isNaN(fObj)) {
            fechaSegura = fObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    // 3. CONSTRUIR LA TABLA DE PRODUCTOS HTML
    let productosHTML = "";
    // El servidor debe enviar 'productos' como array, sino usamos el objeto base como fallback
    let productosArray = ventaObj.productos && ventaObj.productos.length > 0 ? ventaObj.productos : [ventaObj];
    
    productosArray.forEach(p => {
        // Mapeo de nombres de columnas de PostgreSQL (venta_detalles)
        let nombre = p.nombre_producto || p.nombre || 'Producto';
        let cant = p.cantidad || 1;
        let precioUn = p.precio_unitario || p.precio || 0;
        let subTot = p.subtotal || 0;

        productosHTML += `
            <tr><td colspan="4" class="left" style="padding-bottom:2px; font-size:11px; word-break: break-word;">${nombre}</td></tr>
            <tr>
                <td></td>
                <td class="center">${cant.toFixed(2)}</td>
                <td class="right">${formatoSolesTicket.format(precioUn)}</td>
                <td class="right">${formatoSolesTicket.format(subTot)}</td>
            </tr>
        `;
    });

    // 4. LÓGICA DE FILAS DE IMPUESTOS Y DESCUENTO (Ingeniería Inversa)
    // Mapeo de nombres de columna de PostgreSQL (ventas)
    let descuentoFilaHTML = "";
    if (ventaObj.descuento && parseFloat(ventaObj.descuento) > 0) {
        descuentoFilaHTML = `<tr><td class="right">DESCUENTO:</td><td class="right" style="color:#d82c0d;">- ${formatoSolesTicket.format(ventaObj.descuento)}</td></tr>`;
    }

    let igvFilaHTML = "";
    if (ventaObj.igv && parseFloat(ventaObj.igv) > 0) {
        igvFilaHTML = `<tr><td class="right">IGV (${igvPorcentaje}%):</td><td class="right">${formatoSolesTicket.format(ventaObj.igv)}</td></tr>`;
    }

    let bolsaFilaHTML = "";
    if (ventaObj.bolsa && parseFloat(ventaObj.bolsa) > 0) {
        bolsaFilaHTML = `<tr><td class="right">IBCPER (Bolsa):</td><td class="right">${formatoSolesTicket.format(ventaObj.bolsa)}</td></tr>`;
    }

    // 5. DISEÑO DEL TICKET WEB (Formato 58mm Térmico)
    const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap');
                @page { margin: 0; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px; color: #000; margin: 0; padding: 5px 10px 20px 10px;
                    width: 58mm; max-width: 58mm; overflow: hidden;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .bold { font-weight: bold; }
                .mb-1 { margin-bottom: 5px; }
                .mb-2 { margin-bottom: 10px; }
                .line { border-top: 1px dashed #000; margin: 6px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
                td, th { vertical-align: top; padding: 2px 0; }
                .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 40px; text-align: center; margin: 5px 0; line-height: 1; }
                .flex-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; gap: 4px;}
                .anulado-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 40px; color: rgba(216, 44, 13, 0.2); font-weight: bold; text-transform: uppercase; z-index: -1; white-space: nowrap;}
            </style>
        </head>
        <body>
            
            ${ventaObj.anulado ? '<div class="anulado-watermark">ANULADO</div>' : ''}

            <div class="center bold mb-1" style="font-size: 13px; word-break: break-word;">${DATOS_EMPRESA.nombre}</div>
            <div class="center mb-1">RUC: ${DATOS_EMPRESA.ruc}</div>
            <div class="center mb-1" style="font-size: 11px; word-break: break-word;">Dirección: ${DATOS_EMPRESA.direccion}</div>
            <div class="center mb-2">Celular : ${DATOS_EMPRESA.celular}</div>
            
            ${ventaObj.anulado ? '<div class="center bold mb-2" style="font-size:16px; color:#d82c0d;">*** VENTA ANULADA ***</div>' : ''}

            <div class="flex-row">
                <div style="word-break: break-all;">BOLETA: BOL-${boletaSegura}</div>
                <div style="text-align: right;">Pago: ${ventaObj.tipo_pago || 'Efectivo'}</div>
            </div>
            <div class="flex-row">
                <div>Fecha: ${fechaSegura}</div>
                <div style="text-align: right; word-break: break-all;">Cajero: ${nomVendedor}</div>
            </div>
            <div class="left mb-1" style="font-size: 11px;">DNI/RUC: ${dniSeguro}</div>
            <div class="left mb-1" style="font-size: 11px; word-break: break-word;">Cliente: ${clienteSeguro}</div>
            
            <div class="barcode">*${boletaSegura}*</div>
            
            <div class="line"></div>
            <table>
                <thead>
                    <tr>
                        <th class="left" style="width:45%;">Producto</th>
                        <th class="center" style="width:15%;">Cant.</th>
                        <th class="right" style="width:20%;">P.Uni.</th>
                        <th class="right" style="width:20%;">Total</th>
                    </tr>
                    <tr><td colspan="4"><div class="line" style="margin-top:2px;"></div></td></tr>
                </thead>
                <tbody>
                    ${productosHTML}
                </tbody>
            </table>
            <div class="line"></div>
            
            <table style="width:100%; margin-top:5px; font-size: 11px;">
                <tr><td class="right" style="width:65%;">Subtotal (Base):</td><td class="right">${formatoSolesTicket.format(ventaObj.subtotal || 0)}</td></tr>
                ${descuentoFilaHTML}
                ${igvFilaHTML}
                ${bolsaFilaHTML}
                <tr><td colspan="2"><div class="line"></div></td></tr>
                <tr><td class="right bold" style="font-size:14px;">TOTAL:</td><td class="right bold" style="font-size:14px;">${formatoSolesTicket.format(ventaObj.total || 0)}</td></tr>
                <tr><td colspan="2"><div class="line"></div></td></tr>
                <tr><td class="right">Recibido:</td><td class="right">${formatoSolesTicket.format(ventaObj.recibido || 0)}</td></tr>
                <tr><td class="right">Cambio:</td><td class="right">${formatoSolesTicket.format(ventaObj.cambio || 0)}</td></tr>
            </table>
            
            <div class="center bold" style="margin-top:20px; font-size: 12px; word-break: break-word;">${DATOS_EMPRESA.mensajeFinal}</div>
            <div class="center" style="font-size:9px; margin-top:8px; color: #555;">MME ENGINEERING & SOLUCIONES</div>
            <br><br><br>
        </body>
        </html>
    `;

    // 6. EJECUCIÓN DE IMPRESIÓN MODERNA (iFrame Invisible)
    // Esto evita que la página actual se recargue o cambie de pestaña.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Escribimos el HTML corregido dentro del iframe
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(ticketHTML);
    iframe.contentWindow.document.close();

    // Esperamos 600ms para asegurar que carguen los estilos y la fuente del código de barras
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Limpieza: quitamos el iframe después de un minuto
        setTimeout(() => {
            if(document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 60000); 
    }, 600);
}
