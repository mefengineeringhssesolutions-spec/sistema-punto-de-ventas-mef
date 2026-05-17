// ==========================================
// TICKET.JS - CEREBRO DE IMPRESIÓN (VERSIÓN COMPUTADORA / NAVEGADOR)
// ==========================================

// Formateador de moneda oficial para Perú
const formatoSolesTicket = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

async function imprimirTicketGlobal(ventaObj) {
    if(!ventaObj) return alert("Error al encontrar los datos de la venta para imprimir.");

    // 1. OBTENER DATOS DE LA EMPRESA (Memoria o Firebase)
    let configGuardada = {};
    try {
        if (typeof db !== 'undefined') {
            const docSnap = await db.collection('sistema').doc('configuracion').get();
            if (docSnap.exists) {
                configGuardada = docSnap.data();
                localStorage.setItem('isa_config', JSON.stringify(configGuardada)); 
            }
        } else {
            configGuardada = JSON.parse(localStorage.getItem('isa_config')) || {};
        }
    } catch (error) {
        console.error("Error obteniendo configuración:", error);
        configGuardada = JSON.parse(localStorage.getItem('isa_config')) || {};
    }
    
    // Configuración corporativa MME
    const DATOS_EMPRESA = {
        nombre: configGuardada.empresa || "MME ENGINEERING & SOLUCIONES",
        ruc: configGuardada.ruc || "10733720323",
        direccion: configGuardada.direccion || "Cajamarca",
        celular: configGuardada.telefono || "978536345",
        mensajeFinal: "¡Gracias por su preferencia!"
    };

    const igvPorcentaje = configGuardada.igv !== undefined ? configGuardada.igv : 18;

    const nomVendedor = ventaObj.nombreVendedor ? ventaObj.nombreVendedor.split(' ')[0] : (ventaObj.idVendedor || "Caja");
    const boletaSegura = String(ventaObj.boleta || '0').padStart(6, '0');
    const clienteSeguro = ventaObj.nombreCliente || "Cliente General";
    const dniSeguro = ventaObj.dniCliente || "S/D";
    
    let fechaSegura = ventaObj.fecha || "--/--/----";
    if(fechaSegura.includes('T')) {
        const fObj = new Date(fechaSegura);
        fechaSegura = fObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // 2. CONSTRUIR LA TABLA DE PRODUCTOS HTML
    let productosHTML = "";
    let productosArray = ventaObj.productos && ventaObj.productos.length > 0 ? ventaObj.productos : [ventaObj];
    
    productosArray.forEach(p => {
        let nombre = p.nombre || p.nombreProd || 'Producto';
        productosHTML += `
            <tr><td colspan="4" class="left" style="padding-bottom:2px; font-size:11px;">${nombre}</td></tr>
            <tr>
                <td></td>
                <td class="center">${p.cantidad || 1}</td>
                <td class="right">${formatoSolesTicket.format(p.precio || p.precioUn || 0)}</td>
                <td class="right">${formatoSolesTicket.format(p.subtotal || p.total || 0)}</td>
            </tr>
        `;
    });

    // 3. LÓGICA DE FILAS (Descuento e Impuestos)
    let descuentoFilaHTML = "";
    if (ventaObj.desc && parseFloat(ventaObj.desc) > 0) {
        descuentoFilaHTML = `<tr><td class="right">DESCUENTO:</td><td class="right" style="color:#d82c0d;">- ${formatoSolesTicket.format(ventaObj.desc)}</td></tr>`;
    }

    let igvFilaHTML = "";
    if (ventaObj.igv && parseFloat(ventaObj.igv) > 0) {
        igvFilaHTML = `<tr><td class="right">IGV (${igvPorcentaje}%):</td><td class="right">${formatoSolesTicket.format(ventaObj.igv)}</td></tr>`;
    }

    let bolsaFilaHTML = "";
    if (ventaObj.bolsa && parseFloat(ventaObj.bolsa) > 0) {
        bolsaFilaHTML = `<tr><td class="right">IBCPER (Bolsa):</td><td class="right">${formatoSolesTicket.format(ventaObj.bolsa)}</td></tr>`;
    }

    // 4. DISEÑO DEL TICKET WEB
    const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap');
                @page { margin: 0; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px; color: #000; margin: 0; padding: 5px 10px;
                    width: 58mm; max-width: 58mm;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .bold { font-weight: bold; }
                .mb-1 { margin-bottom: 5px; }
                .mb-2 { margin-bottom: 10px; }
                .line { border-top: 1px dashed #000; margin: 6px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                td, th { vertical-align: top; padding: 2px 0; }
                .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 40px; text-align: center; margin: 5px 0; line-height: 1; }
                .flex-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;}
            </style>
        </head>
        <body>
            <div class="center bold mb-1" style="font-size: 13px;">${DATOS_EMPRESA.nombre}</div>
            <div class="center mb-1">RUC: ${DATOS_EMPRESA.ruc}</div>
            <div class="center mb-1" style="font-size: 11px;">Dirección: ${DATOS_EMPRESA.direccion}</div>
            <div class="center mb-2">Celular : ${DATOS_EMPRESA.celular}</div>
            
            ${ventaObj.anulado ? '<div class="center bold mb-2" style="font-size:16px;">*** VENTA ANULADA ***</div>' : ''}

            <div class="flex-row">
                <div>BOLETA: BOL-${boletaSegura}</div>
                <div>Pago: ${ventaObj.tipoPago || 'Efectivo'}</div>
            </div>
            <div class="flex-row">
                <div>Fecha: ${fechaSegura}</div>
                <div>Cajero: ${nomVendedor}</div>
            </div>
            <div class="left mb-1" style="font-size: 11px;">DNI/RUC: ${dniSeguro}</div>
            <div class="left mb-1" style="font-size: 11px;">Cliente: ${clienteSeguro}</div>
            
            <div class="barcode">*${boletaSegura}*</div>
            
            <div class="line"></div>
            <table>
                <tr>
                    <th class="left" style="width:40%;">Producto</th>
                    <th class="center" style="width:15%;">Cant.</th>
                    <th class="right" style="width:20%;">P.Uni.</th>
                    <th class="right" style="width:25%;">Total</th>
                </tr>
                <tr><td colspan="4"><div class="line" style="margin-top:2px;"></div></td></tr>
                ${productosHTML}
            </table>
            <div class="line"></div>
            
            <table style="width:100%; margin-top:5px; font-size: 11px;">
                <tr><td class="right" style="width:60%;">Subtotal:</td><td class="right">${formatoSolesTicket.format(ventaObj.subtotal || 0)}</td></tr>
                ${descuentoFilaHTML}
                ${igvFilaHTML}
                ${bolsaFilaHTML}
                <tr><td colspan="2"><div class="line"></div></td></tr>
                <tr><td class="right bold" style="font-size:14px;">TOTAL:</td><td class="right bold" style="font-size:14px;">${formatoSolesTicket.format(ventaObj.total || 0)}</td></tr>
                <tr><td colspan="2"><div class="line"></div></td></tr>
                <tr><td class="right">Recibido:</td><td class="right">${formatoSolesTicket.format(ventaObj.recibido || 0)}</td></tr>
                <tr><td class="right">Cambio:</td><td class="right">${formatoSolesTicket.format(ventaObj.cambio || 0)}</td></tr>
            </table>
            
            <div class="center bold" style="margin-top:15px;">${DATOS_EMPRESA.mensajeFinal}</div>
            <div class="center" style="font-size:9px; margin-top:5px;">M.E.F. ENGINEERING & HSSE SOLUTIONS</div>
            <br><br><br>
        </body>
        </html>
    `;

    // 5. APERTURA Y EJECUCIÓN DE IMPRESIÓN (MODO PC)
    // Creamos un iframe invisible para no cambiar de pestaña
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Escribimos el HTML dentro del iframe
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(ticketHTML);
    iframe.contentWindow.document.close();

    // Esperamos 500ms para que la fuente de código de barras cargue y disparamos la impresión
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // El iframe se puede quedar ahí oculto, pero por limpieza lo quitamos tras un tiempo prudente
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 60000); 
    }, 500);
}
