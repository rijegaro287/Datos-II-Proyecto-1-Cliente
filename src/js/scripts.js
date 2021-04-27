const math = require('mathjs');

class tipoDeDato {
    constructor(valor, nombre) {
        this.valor = valor;
        this.nombre = nombre;
        this.direccionDeMemoria = null;
        this.conteoDeReferencias = 0;
    }
}

class int extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 4;
        this.tipoDeDato = 'int';
    }
}

class long extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 8;
        this.tipoDeDato = 'long';
    }
}

class char extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 1;
        this.tipoDeDato = 'char';
    }
}

class float extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 4;
        this.tipoDeDato = 'float';
    }
}

class double extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 8;
        this.tipoDeDato = 'double';
    }
}

class reference {
    constructor(tipoDeReferencia, nombre, valor) {
        this.tipoDeDato = 'referencia';
        this.tipoDeReferencia = tipoDeReferencia;
        this.valor = valor;
        this.direccionDeMemoria = null;
        this.espacioEnMemoria = 4;
        this.nombre = nombre;
        this.conteoDeReferencias = 0;
    }
}

class struct {
    constructor(nombre, valor) {
        this.nombre = nombre;
        this.valor = valor;
        this.direccionDeMemoria = null;
    }
    getAddr() {
        return this.direccionDeMemoria;
    }
}

const runButton = document.querySelector('#run-btn');
const runningButtons = document.querySelector('#running-btns');
const stopButton = document.querySelector('#stop-btn');
const nextButton = document.querySelector('#next-btn');
const editorTextArea = document.querySelector('#editor-text-area');
let ramLiveViewLista = document.querySelector('#ram-live-view--lista');
const pestanaStdOut = document.querySelector('#std-out--opcion');
const pestanaLog = document.querySelector('#log--opcion');
const mensajesStdOut = document.querySelector('#std-out--mensajes');
const mensajesLog = document.querySelector('#log--mensajes');

const headersPOST = {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
        'Content-Type': 'application/json'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: '{}',
    timeout: 5000
}

let valoresReservados = ['int', 'long', 'char', 'float', 'double', 'struct'];
let posicionEnTexto = 0;
let creando = 'variables';
let nombreStruct = '';
let variablesEnStruct = [];
let recorridoLineaALinea = [];
let iteracionRecorridoLineaALinea = 0;

const serverURL = 'http://localhost:9090';

post = async(ruta = '', mensajeJSON = {}) => {
    imprimirLog(`Enviando POST: ${JSON.stringify(mensajeJSON)} a la dirección: ${serverURL}/${ruta}`);
    try {
        if (isString(mensajeJSON)) {
            headersPOST.body = mensajeJSON;
        } else {
            headersPOST.body = JSON.stringify(mensajeJSON);
        }
        const controlador = new AbortController();
        const timeout = setTimeout(() => controlador.abort(), headersPOST.timeout);
        const respuesta = await fetch(`${serverURL}/${ruta}`, {...headersPOST, signal: controlador.signal });
        clearTimeout(timeout);
        headersPOST.body = '{}'
        return respuesta;
    } catch (error) {
        throw "Tiempo de espera superado. No hubo respuesta del servidor.";
    }
}

//Funciones de la interfaz
verificarConexion = async() => {
    const solicitudDeInicio = {
        descripcion: 'Conectando...'
    };

    await post('conexionInicial', solicitudDeInicio)
        .then(response => response.text())
        .then(body =>
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`));
}

detenerEjecucion = async() => {
    const solicitudDeFinalizacion = {
        descripcion: 'Finalizando ejecución...'
    };
    await post('finalizarEjecucion', solicitudDeFinalizacion)
        .then(response => response.text())
        .then(body =>
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`));

    runningButtons.style.display = 'none';
    runButton.style.display = 'block';
    posicionEnTexto = 0;
    nextButtonClicked = false;
    nombreStruct = '';
    variablesEnStruct = [];
    recorridoLineaALinea = [];
    iteracionRecorridoLineaALinea = 0;
}

imprimirLog = async(texto, error = false) => {
    let etiqueta = document.createElement('p');
    let textoEtiqueta = document.createTextNode(texto);
    etiqueta.appendChild(textoEtiqueta);
    mensajesLog.appendChild(etiqueta);
    mensajesLog.scrollTop = mensajesLog.scrollHeight;
    if (error) {
        etiqueta.style.color = 'red';
        mensajesStdOut.style.display = 'none'
        mensajesLog.style.display = 'block';
        pestanaLog.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        pestanaStdOut.style.backgroundColor = 'inherit';
        await detenerEjecucion();
    } else {
        etiqueta.style.color = 'yellow';
    }
}

imprimirStdOut = async(texto) => {
    let variable;
    if (texto.includes('.getAddr()')) {
        variable = await solicitarDireccionDeMemoria(texto.split('.')[0]);
    } else if (texto.includes('.getValue()')) {
        variable = await solicitarValorApuntado(texto.split('.')[0]);
    } else if (texto[0] === '"' && texto[texto.length - 1] === '"') {
        variable = texto.slice(1, texto.length - 1);
    } else if ([...texto].includes('+')) {
        variable = await realizarOperación(texto.split('+'), '+');
    } else if ([...texto].includes('-')) {
        variable = await realizarOperación(texto.split('-'), '-');
    } else if ([...texto].includes('*')) {
        variable = await realizarOperación(texto.split('*'), '*');
    } else if ([...texto].includes('/')) {
        variable = await realizarOperación(texto.split('/'), '/');
    } else {
        variable = {
            nombre: texto
        }
        await post('devolverVariable', variable)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                variable = JSON.parse(body).valor;
            });
    }
    recorridoLineaALinea.push(`print:${variable}`)
}

limpiarVentana = () => {
    mensajesLog.innerHTML = '';
    mensajesStdOut.innerHTML = '';
    let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
    for (let i = 0; i < elementosRamLiveView.length; i++) {
        ramLiveViewLista.removeChild(elementosRamLiveView[i]);
    }
}

//Funciones de los botones
runButton.addEventListener('click', async e => {
    e.preventDefault();
    limpiarVentana();
    try {
        runButton.style.display = 'none';
        runningButtons.style.display = 'flex';
        await verificarConexion();
        await procesadoInicial();
        ramLiveViewLista.innerHTML = '';
    } catch (error) {
        return imprimirLog(error, true);
    }
});

stopButton.addEventListener('click', async(e) => {
    e.preventDefault();
    try {
        await detenerEjecucion();
    } catch (error) {
        return imprimirLog(error, true);
    }
});

nextButton.addEventListener('click', async e => {
    e.preventDefault();
    if (iteracionRecorridoLineaALinea === recorridoLineaALinea.length) {
        await detenerEjecucion();
        return;
    }
    const elementosIteracionActual = recorridoLineaALinea[iteracionRecorridoLineaALinea];
    if (isString(elementosIteracionActual)) {
        const variable = elementosIteracionActual.split(':')[1];
        let etiqueta = document.createElement('p');
        etiqueta.style.color = 'white';
        let textoEtiqueta = document.createTextNode(variable);
        etiqueta.appendChild(textoEtiqueta);
        mensajesStdOut.appendChild(etiqueta);
        mensajesStdOut.scrollTop = mensajesStdOut.scrollHeight;
    } else {
        ramLiveViewLista.innerHTML = '';
        for (let i = 0; i < elementosIteracionActual.length; i++) {
            const elemento = elementosIteracionActual[i];
            ramLiveViewLista.appendChild(elemento);
        }
    }
    iteracionRecorridoLineaALinea++;
});

pestanaLog.addEventListener('click', e => {
    e.preventDefault();
    mensajesStdOut.style.display = 'none'
    mensajesLog.style.display = 'block';
    pestanaLog.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    pestanaStdOut.style.backgroundColor = 'inherit';
});

pestanaStdOut.addEventListener('click', e => {
    e.preventDefault();
    mensajesLog.style.display = 'none'
    mensajesStdOut.style.display = 'block';
    pestanaStdOut.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    pestanaLog.style.backgroundColor = 'inherit';
});

//Funciones de procesado de texto
procesadoInicial = async() => {
    while (posicionEnTexto !== editorTextArea.value.length) {
        let variable;
        switch (creando) {
            case 'variables':
                variable = await procesarTexto(editorTextArea.value, posicionEnTexto);
                break;
            case 'struct':
                variable = await procesarStruct(nombreStruct, editorTextArea.value, posicionEnTexto);
                break;
        }
        if (variable !== undefined) {
            await post('crearVariable', variable)
                .then(response => response.text())
                .then(body => {
                    imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                    variable.direccionDeMemoria = JSON.parse(body).direccion;
                    if (JSON.parse(body).hasOwnProperty('direccionDeVariable')) {
                        variable.valor = JSON.parse(body).direccionDeVariable;
                        variable.nombreDeVariable = JSON.parse(body).nombreDeVariable
                    } else if (JSON.parse(body).hasOwnProperty('direccionDeDatoApuntado')) {
                        variable.valor = JSON.parse(body).direccionDeDatoApuntado;
                    } else {
                        variable.valor = JSON.parse(body).valor;
                    }
                    if (JSON.parse(body).hasOwnProperty('conteoDeReferenciasDePuntero')) {
                        let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
                        variable.conteoDeReferencias = JSON.parse(body).conteoDeReferenciasDePuntero;
                        variable.conteoDeReferenciasDeVariable = JSON.parse(body).conteoDeReferenciasDeVariable;
                        for (let i = 0; i < elementosRamLiveView.length; i++) {
                            const elemento = elementosRamLiveView[i];
                            if (elemento.children[2].innerHTML === variable.nombreDePuntero) {

                            } else if (elemento.children[2].innerHTML === variable.nombreDeVariable) {
                                elemento.children[3].innerHTML = variable.conteoDeReferenciasDeVariable;
                            }
                        }
                    } else {
                        variable.conteoDeReferencias = JSON.parse(body).conteoDeReferencias;
                    }
                    actualizarRamLiveView(variable);
                });
        }
    }
}

procesarTexto = async(texto, posicionInicial) => {
    creando = 'variables';
    let scopeCerrado = false;

    if (posicionInicial === texto.length) {
        await detenerEjecucion();
        return;
    }

    let palabra = '';
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        posicionEnTexto = i;
        const caracter = texto[i];

        if (caracter === '{' && informacion.length === 0) {
            await post('actualizarScopes', '{')
                .then(response => response.text())
                .then(body => imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`));
        } else if (caracter === '}' && informacion.length === 0) {
            await post('actualizarScopes', '}')
                .then(response => response.text())
                .then(body => {
                    imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                    eliminarScopeRamView(JSON.parse(body).nombreDeVariableEliminada);
                });
            scopeCerrado = true;
        } else if (caracter === '{' && informacion[0] === 'struct') {
            try {
                informacion.push(palabra);
                posicionEnTexto += 1;
                return crearStruct(informacion, texto, i + 1);
            } catch (error) {
                await detenerEjecucion();
                throw error;
            }
        } else if (caracter === ';') {
            posicionEnTexto += 1;
            informacion.push(palabra);
            return await procesarLinea(informacion);
        } else if (caracter === '=') {
            informacion.push('=');
            operadorIgualEncontrado = true;
        } else if (caracter === ' ' && !operadorIgualEncontrado) {
            informacion.push(palabra);
            palabra = '';
        } else if (caracter !== '\n') {
            palabra += caracter;
        }
    }
    if (!scopeCerrado) {
        throw ('Error: falta ";" al final de una línea');
    }

}

procesarLinea = async(informacion) => {
    for (let i = 0; i < informacion.length; i++) {
        let elemento = [...informacion[i]];
        informacion[i] = arrayToString(removerTodasLasOcurrencias(elemento, ' '), false);
    }
    const ultimaPalabra = informacion[informacion.length - 1];

    if (informacion.length > 4 || (informacion[0].includes('print(') && ultimaPalabra[ultimaPalabra.length - 1] !== ')')) {
        throw ('Error: falta ";" al final de una línea');
    } else if (informacion[0].slice(0, 6) + ultimaPalabra[ultimaPalabra.length - 1] === 'print()') {
        informacionString = arrayToString(informacion);
        return imprimirStdOut(informacionString.slice(7, informacionString.length - 1));
    } else if (informacion[1] === '=' && informacion.length === 3) {
        await reasignarVariable(informacion);
        return;
    } else {
        informacion = removerTodasLasOcurrencias(informacion, '');

        console.log(informacion);


        const tipoDeVariable = informacion[0];
        const nombreDeVariable = informacion[1];
        let valorDeVariable;

        if (informacion.length === 2) {
            valorDeVariable = 0;
        } else {
            valorDeVariable = informacion[3];
        }
        if (valorDeVariable !== 0 && valorDeVariable.includes('.getValue()')) {
            try {
                await solicitarValorApuntado(valorDeVariable.split('.')[0]);
            } catch (error) { throw error }
            const solicitudDesreferenciarPuntero = {
                nombre: valorDeVariable.split('.')[0]
            }
            await post('desreferenciarPuntero', solicitudDesreferenciarPuntero)
                .then(response => response.text())
                .then(body => {
                    valorDeVariable = JSON.parse(body).valor
                });
            if (isNaN(valorDeVariable) && valorDeVariable.length === 1) {
                valorDeVariable = `"${valorDeVariable}"`;
            }

        } else if (tipoDeVariable.split('<').includes('reference')) {
            return crearReferencia(tipoDeVariable, nombreDeVariable, valorDeVariable);
        } else if (informacion[2] !== '=' && valorDeVariable !== 0) {
            throw `Error: Variable "${nombreDeVariable}" mal declarada.`;
        } else if (valoresReservados.includes(nombreDeVariable)) {
            throw `Error: nombre de la variable "${nombreDeVariable}" no puede ser un valor reservado`;
        }

        switch (tipoDeVariable) {
            case 'char':
                return crearChar(nombreDeVariable, valorDeVariable);
            default:
                return crearNumero(tipoDeVariable, nombreDeVariable, valorDeVariable);
        }
    }
}

crearNumero = (tipoDeVariable, nombreDeVariable, valorDeVariable) => {
    let variable = null;

    try {
        valorDeVariable = math.evaluate(valorDeVariable);
    } catch (error) {
        throw `Error: Variable mal declarada. Los ${tipoDeVariable} deben ser números`;
    }

    switch (tipoDeVariable) {
        case 'int':
            if (Number.isInteger(valorDeVariable)) {
                variable = new int(valorDeVariable, nombreDeVariable);
                break;
            } else { throw `Error: Tipo de dato inválido en la declaración de ${nombreDeVariable}`; }
        case 'long':
            if (Number.isInteger(valorDeVariable)) {
                variable = new long(valorDeVariable, nombreDeVariable);
                break;
            } else { throw `Error: Tipo de dato inválido en la declaración de ${nombreDeVariable}`; }
        case 'float':
            variable = new float(valorDeVariable, nombreDeVariable);
            break;
        case 'double':
            variable = new double(valorDeVariable, nombreDeVariable);
            break;
        default:
            throw `Error: Tipo de dato inválido en la declaración de ${nombreDeVariable}`;
    }
    return variable;
}

crearChar = (nombreDeVariable, valorDeVariable) => {
    let variable = null;

    if (valorDeVariable !== 0) {
        valorDeVariable = [...valorDeVariable];
        removerTodasLasOcurrencias(valorDeVariable, ' ');
        if (valorDeVariable[0] !== '"' || valorDeVariable[valorDeVariable.length - 1] !== '"') {
            throw 'Error: los char deben ir entre comillas';
        } else if (valorDeVariable.length !== 3) {
            throw 'Error: los char solo pueden tener un caracter';
        }
        variable = new char(valorDeVariable[1], nombreDeVariable);
    } else {
        variable = new char(0, nombreDeVariable);
    }
    return variable;
}

crearReferencia = (tipoDeVariable, nombreDeVariable, valorDeVariable = 0) => {
    if (valorDeVariable !== 0 && valorDeVariable.includes('.getAddr()')) {
        valorDeVariable = valorDeVariable.split('.')[0];
    }
    let tipoDeReferencia = tipoDeVariable.split('reference');
    removerTodasLasOcurrencias(tipoDeReferencia, '');
    tipoDeReferencia = tipoDeReferencia[0];

    if (tipoDeReferencia === undefined || tipoDeReferencia[0] !== '<' || tipoDeReferencia[tipoDeReferencia.length - 1] !== '>') {
        throw 'Error: El tipo de dato de una referencia debe ir en entre flechas';
    } else {
        tipoDeReferencia = tipoDeReferencia.slice(1, tipoDeReferencia.length - 1);
    }

    const variable = new reference(tipoDeReferencia, nombreDeVariable, valorDeVariable);
    return variable;
}

procesarStruct = async(nombre, texto, posicionInicial) => {
    let palabra = ''
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        const caracter = texto[i];
        posicionEnTexto = i;

        if (caracter === '}') {
            creando = 'variables';
            let nuevoStruct = new struct(nombre, variablesEnStruct);
            variablesEnStruct = [];
            posicionEnTexto += 1;
            return nuevoStruct;
        } else if (caracter === ';') {
            informacion.push(palabra);
            try {
                variablesEnStruct.push(procesarLinea(informacion));
                console.log(variablesEnStruct);
                return;
            } catch (error) {
                await detenerEjecucion();
                throw error;
            }
        } else if (caracter === '=') {
            informacion.push('=');
            operadorIgualEncontrado = true;
        } else if (caracter === ' ' && !operadorIgualEncontrado) {
            informacion.push(palabra);
            palabra = '';
        } else if (caracter !== '\n') {
            palabra += caracter;
        }
    }

    await detenerEjecucion();
    throw ('Error: falta "}"');
}

crearStruct = (informacion, texto, posicionInicial) => {
    creando = 'struct';
    informacion = removerTodasLasOcurrencias(informacion, '');
    nombreStruct = informacion[1];
    if (valoresReservados.includes(nombreStruct)) {
        throw 'Error: nombre de la variable no puede ser un valor reservado';
    }
    return procesarStruct(nombreStruct, texto, posicionInicial);
}

const postCrearStruct = async(data = {}) => {
        if (JSON.stringify(data) !== '{}') {
            imprimirLog(`Enviando POST: ${JSON.stringify(data)} a la dirección: ${`${serverURL}/createStruct`}`);
        try {
            headersPOST.body = JSON.stringify(data);
            const respuesta = await fetch(`${serverURL}/createStruct`, headersPOST)
                .then(response => response.text())
                .then(body => {
                    imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                    data.direccionDeMemoria = JSON.parse(body).direccion;
                    data.conteoDeReferencias = JSON.parse(body).conteoDeReferencias;
                    actualizarRamLiveView(data);
                    headersPOST.body = '{}';
                });
        } catch (error) {
            throw error;
        }
    }
}

solicitarDireccionDeMemoria = async(nombreDeVariable) => { // -> Falta que solamente los tipos primitivos puedan usarla
    solicitudDireccionDeMemoria = {
        nombre: nombreDeVariable
    }
    return await post('devolverDireccion', solicitudDireccionDeMemoria)
    .then(response => response.text())
    .then(body => {
        imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
        if(JSON.parse(body).tipoDeDato === 'referencia'){
            throw 'Error: la operación getAddr() sólo es soportada por tipos de dato primitivos'
        }else{
            return JSON.parse(body).direccion;
        }
    });

}

solicitarValorApuntado = async(nombreDePuntero) => {
    solicitudDesreferenciarPuntero = {
        nombre: nombreDePuntero
    }
    return await post('desreferenciarPuntero', solicitudDesreferenciarPuntero)
    .then(response => response.text())
    .then(body => {
        imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
        try {            
            if(JSON.parse(body).tipoDeDato === ''){
                throw 'Error: La operación getValue sólo es soportada por referencias';
            }else{
                return JSON.parse(body).valor;
            }
        } catch (error) {
            throw 'Error: La operación getValue sólo es soportada por referencias';
        }
    });

}

reasignarVariable = async(informacion) => {
    if(informacion[2].includes('.getAddr()')){
        try {
            await solicitarDireccionDeMemoria(informacion[2].split('.')[0]);
        } catch (error) { throw error }
    }else if(informacion[2].includes('.getValue()')){
        informacion[2] = await solicitarValorApuntado(informacion[2].split('.')[0]);
        if(isNaN(informacion[2])){
            informacion[2] = `"${informacion[2]}"`
        }
    }

    let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
    let cambioEnServer = {
        nombre: informacion[0],
        valor: null
    }
    let variableACambiar = {
        nombre: informacion[0]
    }
    await post('devolverVariable', variableACambiar)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            variableACambiar = JSON.parse(body);
        });

    if (variableACambiar.tipoDeDato === 'referencia') {
        cambioEnServer = {
            nombreDePuntero: informacion[0],
            nombreDeVariable: null
        }
        if (informacion[2].includes('.getAddr()')) {
            cambioEnServer.nombreDeVariable = informacion[2].split('.')[0];
        }else{
            cambioEnServer.nombreDeVariable = informacion[2];
        }
        let variable = {};
        await post('asignarDireccion', cambioEnServer)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            if (JSON.parse(body).hasOwnProperty('direccionDeVariable')) {
                variable.valor = JSON.parse(body).direccionDeVariable;
            } else if (JSON.parse(body).hasOwnProperty('direccionDeDatoApuntado')) {
                variable.valor = JSON.parse(body).direccionDeDatoApuntado;
            } else {
                variable.valor = JSON.parse(body).valor;
            }
            variable.conteoDeReferenciasDeVariable = JSON.parse(body).conteoDeReferenciasDeVariable;
            variable.conteoDeReferenciasDePuntero = JSON.parse(body).conteoDeReferenciasDePuntero;
        });
        for (let i = 0; i < elementosRamLiveView.length; i++) {
            const elemento = elementosRamLiveView[i];
            if (elemento.children[2].innerHTML === informacion[0]) {
                elemento.children[1].innerHTML = variable.valor;
                elemento.children[3].innerHTML = variable.conteoDeReferenciasDePuntero;
            }
            else if (elemento.children[0].innerHTML === variable.valor) {
                elemento.children[3].innerHTML = variable.conteoDeReferenciasDeVariable;
            }
        }
    }
    else if (validarTipoDeDato(variableACambiar.tipoDeDato, informacion[2])) {
        try {
            informacion[2] = informacion[2].replace(/['"]+/g, '');
        } catch (error) {}
        if (!isNaN(informacion[2])) {
            informacion[2] = Number(informacion[2]);
        }
        for (let i = 0; i < elementosRamLiveView.length; i++) {
            const elemento = elementosRamLiveView[i];
            if (elemento.children[2].innerHTML === informacion[0]) {
                cambioEnServer.valor = informacion[2];
                await post('actualizarValorVariable', cambioEnServer)
                    .then(response => response.text())
                    .then(body => imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`));
                elemento.children[1].innerHTML = informacion[2];
            }
        }
    } else {
        let nuevoValor = {
            nombre: informacion[2]
        }
        await post('devolverVariable', nuevoValor)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                nuevoValor = JSON.parse(body);
            });
        for (let i = 0; i < elementosRamLiveView.length; i++) {
            const elemento = elementosRamLiveView[i];
            if (elemento.children[2].innerHTML === informacion[0]) {
                if (variableACambiar.tipoDeDato === nuevoValor.tipoDeDato) {
                    cambioEnServer.valor = nuevoValor.valor;
                    await post('actualizarValorVariable', cambioEnServer)
                        .then(response => response.text())
                        .then(body => imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`));
                    elemento.children[1].innerHTML = nuevoValor.valor;
                } else {
                    throw 'Error: Los tipos de dato no coinciden';
                }
            }
        }
    }
    clonarEstadoRamLiveView();
}

realizarOperación = async(texto, operador) => {
    if (texto.length !== 2) {
        throw "Error: las operaciones deben tener dos variables";
    }
    let variable1 = arrayToString(removerTodasLasOcurrencias([...texto[0]], ' '), false);
    let variable2 = arrayToString(removerTodasLasOcurrencias([...texto[1]], ' '), false);

    const solicitudVariable1 = {
        nombre: variable1
    }
    const solicitudVariable2 = {
        nombre: variable2
    }

    if (isNaN(variable1) && isNaN(variable2)) {
        await post('devolverVariable', solicitudVariable1)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            variable1 = JSON.parse(body).valor;
        });
        await post('devolverVariable', solicitudVariable2)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            variable2 = JSON.parse(body).valor;
        });
    }else if (isNaN(variable1) && !isNaN(variable2)) {
        await post('devolverVariable', solicitudVariable1)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            variable1 = JSON.parse(body).valor;
        });
    }else if (!isNaN(variable1) && isNaN(variable2)) {
        await post('devolverVariable', solicitudVariable2)
        .then(response => response.text())
        .then(body => {
            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            variable2 = JSON.parse(body).valor;
        });
    }


    if (isNaN(variable1) || isNaN(variable2)) {
        throw 'Error: las operaciones deben realizarse con números';
    }

    switch(operador){
        case '+':
            return Number(variable1) + Number(variable2);
        case '-':
            return Number(variable1) - Number(variable2);
        case '*':
            return Number(variable1) * Number(variable2);
        case '/':
            return Number(variable1) / Number(variable2);
        default:
            throw 'Error: operador no soportado';
    }
}

//Funciones RAM View 
eliminarScopeRamView = (variablesEliminadas) => {
    let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
    variablesEliminadas.forEach(variable =>{ 
        elementosRamLiveView.forEach(elemento => {
            if (elemento.children[2].innerHTML === variable) {
                ramLiveViewLista.removeChild(elemento);
            }
        });
    });
    clonarEstadoRamLiveView();
}

actualizarRamLiveView = variable => {
    let ramLiveViewElemento = document.createElement('li');
    ramLiveViewElemento.classList.add("ram-live-view--elemento");

    let ramLiveViewPValor = document.createElement('p');
    let ramLiveViewPValorTexto = document.createTextNode(variable.valor);
    ramLiveViewPValor.appendChild(ramLiveViewPValorTexto);

    let ramLiveViewPNombre = document.createElement('p');
    let ramLiveViewPNombreTexto = document.createTextNode(variable.nombre);
    ramLiveViewPNombre.appendChild(ramLiveViewPNombreTexto);

    let ramLiveViewPDireccion = document.createElement('p');
    let ramLiveViewPDireccionTexto = document.createTextNode(variable.direccionDeMemoria);
    ramLiveViewPDireccion.appendChild(ramLiveViewPDireccionTexto);

    let ramLiveViewPRefs = document.createElement('p');
    let ramLiveViewPRefsTexto = document.createTextNode(0);
    ramLiveViewPRefs.appendChild(ramLiveViewPRefsTexto);

    ramLiveViewElemento.appendChild(ramLiveViewPDireccion);
    ramLiveViewElemento.appendChild(ramLiveViewPValor);
    ramLiveViewElemento.appendChild(ramLiveViewPNombre);
    ramLiveViewElemento.appendChild(ramLiveViewPRefs);

    ramLiveViewLista.appendChild(ramLiveViewElemento);
    ramLiveViewLista.scrollTop = ramLiveViewLista.scrollHeight;
    
    clonarEstadoRamLiveView();
}

clonarEstadoRamLiveView = () => {
    let copiaRamView = [];
    for (let i = 0; i < ramLiveViewLista.children.length; i++) {
        const elemento = ramLiveViewLista.children[i];
        copiaRamView.push(elemento.cloneNode(true));
    }
    recorridoLineaALinea.push(copiaRamView);
}

//Funciones de utilidad
validarTipoDeDato = (tipoDeDato, dato) => {
    if (tipoDeDato === "char" && isNaN(dato) && dato[0] === '"' && dato[dato.length - 1] === '"') {
        return true;
    } else if (dato % 1 == 0 && (tipoDeDato === "int" || tipoDeDato === "long")) {
        return true;
    } else if (!isNaN(dato) && (tipoDeDato === "double" || tipoDeDato === "float")) {
        return true;
    } else {
        return false;
    }
}

removerTodasLasOcurrencias = (array, valor) => {
    let i = 0;
    while (i < array.length) {
        if (array[i] === valor) {
            array.splice(i, 1);
        } else {
            ++i;
        }
    }
    return array;
}

arrayToString = (array, espacios = true) => {
    let string = ``;
    if (espacios) {
        array.forEach(palabra => {
            string += ` ${palabra}`;
        });
    } else {
        array.forEach(palabra => {
            string += `${palabra}`;
        });
    }
    return string;
}

isString = string => {
    if (typeof string === 'string' || string instanceof String) {
        return true;
    }else{
        return false
    }
}