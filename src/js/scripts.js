const math = require('mathjs');

class tipoDeDato {
    constructor(valor, nombre) {
        this.valor = valor;
        this.nombre = nombre;
        this.direccionDeMemoria = null;
    }

    getAddr() {
        return this.direccionDeMemoria;
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
    }

    getValue() {
        return
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
const ramLiveViewLista = document.querySelector('#ram-live-view--lista');
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
    body: '{}'
}

let valoresReservados = ['int', 'long', 'char', 'float', 'double', 'struct'];
let posicionEnTexto = 0;
let nextButtonClicked = false;
let creando = 'variables';
let nombreStruct = '';
let variablesEnStruct = [];

const serverURL = 'http://localhost:9090';

runButton.addEventListener('click', async e => {
    e.preventDefault();
    limpiarVentana();
    try {
        runButton.style.display = 'none';
        runningButtons.style.display = 'flex';
        const variable = await procesarTexto(editorTextArea.value, posicionEnTexto);

        postCrearVariable(variable);
    } catch (error) {
        imprimirLog(error, true);
    }
});

stopButton.addEventListener('click', e => {
    e.preventDefault();
    detenerEjecucion();
});

nextButton.addEventListener('click', async e => {
    e.preventDefault();
    try {
        if (!nextButtonClicked) {
            nextButtonClicked = true;
            let variable;
            switch (creando) {
                case 'variables':
                    variable = await procesarTexto(editorTextArea.value, posicionEnTexto + 1);
                    break;
                case 'struct':
                    variable = procesarStruct(nombreStruct, editorTextArea.value, posicionEnTexto + 1);
                    break;
            }
            if (variable !== undefined) {
                postCrearVariable(variable);
            }
            nextButtonClicked = false;
        }
    } catch (error) {
        imprimirLog(error, true);
    }
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

detenerEjecucion = () => {
    postFinalizarEjecucion();
    runningButtons.style.display = 'none';
    runButton.style.display = 'block';
    posicionEnTexto = 0;
    nextButtonClicked = false;
    nombreStruct = '';
    variablesEnStruct = [];
}

procesarTexto = async(texto, posicionInicial) => {
    creando = 'variables';
    if (posicionInicial === texto.length) {
        detenerEjecucion();
        return;
    }

    let palabra = ''
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        posicionEnTexto = i;
        const caracter = texto[i];

        if (caracter === '{' && informacion.length === 0) {
            try {
                await postActualizarScopes('{')
                    .then(response => response.text())
                    .then(body => {
                        imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                        headersPOST.body = '{}';
                    });
            } catch (error) {
                detenerEjecucion();
                throw error;
            }
        } else if (caracter === '}' && informacion.length === 0) {
            try {
                await postActualizarScopes('}')
                    .then(response => response.text())
                    .then(body => {
                        imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                        headersPOST.body = '{}';
                        eliminarScopeRamView(JSON.parse(body).nombreDeVariableEliminada);
                    });
            } catch (error) {
                detenerEjecucion();
                throw error;
            }
        } else if (caracter === '{' && informacion[0] === 'struct') {
            try {
                informacion.push(palabra);
                return crearStruct(informacion, texto, i + 1);
            } catch (error) {
                detenerEjecucion();
                throw error;
            }
        } else if (caracter === ';') {
            informacion.push(palabra);
            try {
                return crearVariable(informacion);
            } catch (error) {
                detenerEjecucion();
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
    detenerEjecucion();
    throw ('Error: falta ";"');
}

crearVariable = (informacion) => {
    console.log(informacion);
    const ultimaPalabra = informacion[informacion.length - 1];

    if (informacion[0].slice(0, 6) + ultimaPalabra[ultimaPalabra.length - 1] === 'print()') {
        informacionString = arrayToString(informacion);
        return imprimirStdOut(informacionString.slice(7, informacionString.length - 1));
    }

    informacion = removerTodasLasOcurrencias(informacion, '');

    for (let i = 0; i < informacion.length; i++) {
        let elemento = [...informacion[i]];
        informacion[i] = arrayToString(removerTodasLasOcurrencias(elemento, ' '), false);
    }

    if (informacion[1] === '=' && informacion.length === 3) {
        return reasignarVariable(informacion)
    }

    const tipoDeVariable = informacion[0];
    const nombreDeVariable = informacion[1];
    let valorDeVariable = informacion[3];

    if (informacion.length === 2) {
        valorDeVariable = 0;
    } else if (tipoDeVariable.split('<').includes('reference')) {
        return crearReferencia(tipoDeVariable, nombreDeVariable, valorDeVariable);
    } else if (informacion[2] !== '=') {
        throw 'Error: Variable mal declarada';
    } else if (valoresReservados.includes(nombreDeVariable)) {
        throw 'Error: nombre de la variable no puede ser un valor reservado';
    }

    switch (tipoDeVariable) {
        case 'char':
            return crearChar(nombreDeVariable, valorDeVariable);
        default:
            return crearNumero(tipoDeVariable, nombreDeVariable, valorDeVariable);

    }
}

crearNumero = (tipoDeVariable, nombreDeVariable, valorDeVariable) => {
    let variable = null;

    try {
        valorDeVariable = math.evaluate(valorDeVariable);
    } catch (error) {
        throw 'Error: Variable mal declarada';
    }

    switch (tipoDeVariable) {
        case 'int':
            variable = new int(math.round(valorDeVariable), nombreDeVariable);
            break;
        case 'long':
            variable = new long(math.round(valorDeVariable), nombreDeVariable);
            break;
        case 'float':
            variable = new float(valorDeVariable, nombreDeVariable);
            break;
        case 'double':
            variable = new double(valorDeVariable, nombreDeVariable);
            break;
        default:
            throw 'Error: Tipo de dato inválido';
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

crearReferencia = (tipoDeVariable, nombreDeVariable, valorDeVariable = null) => {
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

crearStruct = (informacion, texto, posicionInicial) => {
    creando = 'struct';
    informacion = removerTodasLasOcurrencias(informacion, '');
    nombreStruct = informacion[1];
    if (valoresReservados.includes(nombreStruct)) {
        throw 'Error: nombre de la variable no puede ser un valor reservado';
    }
    return procesarStruct(nombreStruct, texto, posicionInicial);
}

procesarStruct = (nombre, texto, posicionInicial) => {
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
            return nuevoStruct;
        } else if (caracter === ';') {
            informacion.push(palabra);
            try {
                variablesEnStruct.push(crearVariable(informacion));
                console.log(variablesEnStruct);
                return;
            } catch (error) {
                detenerEjecucion();
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

    detenerEjecucion();
    throw ('Error: falta "}"');
}

reasignarVariable = async(informacion) => {
    let cambioEnServer = {
        nombre: informacion[0],
        valor: null
    }
    try {
        let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');

        let variableACambiar = {
            nombre: informacion[0]
        }

        await postSolicitarVariable(variableACambiar)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variableACambiar = JSON.parse(body);
            });

        if (validarTipoDeDato(variableACambiar.tipoDeDato, informacion[2])) {
            elementosRamLiveView.forEach(elemento => {
                if (elemento.children[2].innerHTML === informacion[0]) {
                    elemento.children[1].innerHTML = informacion[2].replace(/['"]+/g, '');
                    cambioEnServer.valor = informacion[2];
                    postActualizarValorVariable(cambioEnServer)
                        .then(response => response.text())
                        .then(body => {
                            imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                            headersPOST.body = '{}';
                        });;
                }
            })
        } else {
            let nuevoValor = {
                nombre: informacion[2]
            }

            await postSolicitarVariable(nuevoValor)
                .then(response => response.text())
                .then(body => {
                    imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                    headersPOST.body = '{}';
                    nuevoValor = JSON.parse(body);
                });

            elementosRamLiveView.forEach(elemento => {
                if (elemento.children[2].innerHTML === informacion[0]) {
                    if (variableACambiar.tipoDeDato === nuevoValor.tipoDeDato) {
                        elemento.children[1].innerHTML = nuevoValor.valor;
                        cambioEnServer.valor = nuevoValor.valor;
                        postActualizarValorVariable(cambioEnServer)
                            .then(response => response.text())
                            .then(body => {
                                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                                headersPOST.body = '{}';
                            });;;
                    } else {
                        throw 'Error: Los tipos de dato no coinciden';
                    }
                }
            })
        }
    } catch (error) {
        imprimirLog(error, true);
    }
}

validarTipoDeDato = (tipoDeDato, dato) => {
    try {
        if (tipoDeDato === "char" && isNaN(dato) && dato[0] === '"' && dato[dato.length - 1] === '"') {
            return true;
        } else if (dato % 1 == 0 && (tipoDeDato === "int" || tipoDeDato === "long")) {
            return true;
        } else if (!isNaN(dato) && (tipoDeDato === "double" || tipoDeDato === "float")) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        throw error
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

imprimirLog = (texto, error = false) => {
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
        detenerEjecucion();
    } else {
        etiqueta.style.color = 'yellow';
    }
}

imprimirStdOut = async(texto) => {
    let variable;
    if (texto[0] === "'" || texto[texto.length - 1] === "'") {
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
        await postSolicitarVariable(variable)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variable = JSON.parse(body).valor;
                console.log(variable);
            });
    }
    let etiqueta = document.createElement('p');
    etiqueta.style.color = 'white';
    let textoEtiqueta = document.createTextNode(variable);
    etiqueta.appendChild(textoEtiqueta);
    mensajesStdOut.appendChild(etiqueta);
    mensajesStdOut.scrollTop = mensajesStdOut.scrollHeight;
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
    let ramLiveViewPRefsTexto = document.createTextNode(variable.conteoDeReferencias);
    ramLiveViewPRefs.appendChild(ramLiveViewPRefsTexto);

    ramLiveViewElemento.appendChild(ramLiveViewPDireccion);
    ramLiveViewElemento.appendChild(ramLiveViewPValor);
    ramLiveViewElemento.appendChild(ramLiveViewPNombre);
    ramLiveViewElemento.appendChild(ramLiveViewPRefs);

    ramLiveViewLista.appendChild(ramLiveViewElemento);
    ramLiveViewLista.scrollTop = ramLiveViewLista.scrollHeight;

}

limpiarVentana = () => {
    mensajesLog.innerHTML = '';
    mensajesStdOut.innerHTML = '';
    let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
    for (let i = 0; i < elementosRamLiveView.length; i++) {
        ramLiveViewLista.removeChild(elementosRamLiveView[i]);
    }
}

const postCrearVariable = async(data = {}) => {
        if (data.hasOwnProperty('variables')) {
            return postCrearStruct(data);
        }
        if (JSON.stringify(data) !== '{}') {
            imprimirLog(`Enviando POST: ${JSON.stringify(data)} a la dirección: ${`${serverURL}/crearVariable`}`);
        try {
            headersPOST.body = JSON.stringify(data);
            const respuesta = await fetch(`${serverURL}/crearVariable`, headersPOST)
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

const postFinalizarEjecucion = async() => {
        const data = {
            codigo: 57438,
            descripcion: 'Ejecucion finalizada'
        };
        imprimirLog(`Enviando POST: ${JSON.stringify(data)} a la dirección: ${`${serverURL}/finalizarEjecucion`}`);
    try {
        const respuesta = await fetch(`${serverURL}/finalizarEjecucion`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify(data)
            })
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
            });
    } catch (error) {
        throw error;
    }
}

const postSolicitarVariable = async (variable) => {
    try {
        imprimirLog(`Enviando POST: ${JSON.stringify(variable)} a la dirección: ${`${serverURL}/devolverVariable`}`);
        headersPOST.body = JSON.stringify(variable);
        const respuesta = await fetch(`${serverURL}/devolverVariable`, headersPOST);
        return respuesta;
    } catch (error) {
        throw error;
    }
}

const postActualizarScopes = async (accion) => {
    try {
        imprimirLog(`Enviando POST: ${accion} a la dirección: ${`${serverURL}/actualizarScopes`}`);
        headersPOST.body = accion;
        const respuesta = await fetch(`${serverURL}/actualizarScopes`, headersPOST);
        return respuesta;
    } catch (error) {
        throw error;
    }
}

const postActualizarValorVariable = async (nombreVariableJSON) => {
    if (isNaN(nombreVariableJSON.valor)) {
        nombreVariableJSON.valor = nombreVariableJSON.valor.replace(/['"]+/g, '');
    }else{
        nombreVariableJSON.valor = Number(nombreVariableJSON.valor);
    }
    try {
        imprimirLog(`Enviando POST: ${JSON.stringify(nombreVariableJSON)} a la dirección: ${`${serverURL}/actualizarValorVariable`}`);
        headersPOST.body = JSON.stringify(nombreVariableJSON)
        const respuesta = await fetch(`${serverURL}/actualizarValorVariable`, headersPOST);
        return respuesta;
    } catch (error) {
        throw error;
    }
}

eliminarScopeRamView = (variablesEliminadas) => {
    let elementosRamLiveView = document.querySelectorAll('#ram-live-view--lista .ram-live-view--elemento');
    variablesEliminadas.forEach(variable =>{ 
        elementosRamLiveView.forEach(elemento => {
            if (elemento.children[2].innerHTML === variable) {
                ramLiveViewLista.removeChild(elemento);
            }
        });
    });
}

const realizarOperación = async(texto, operador) => {
    if (texto.length !== 2) {
        throw "Error: las operaciones deben tener dos variables";
    }
    let variable1 = arrayToString(removerTodasLasOcurrencias([...texto[0]], ' '), false);
    let variable2 = arrayToString(removerTodasLasOcurrencias([...texto[1]], ' '), false);

    if (isNaN(variable1) && isNaN(variable2)) {
        const solicitudVariable1 = {
            nombre: variable1
        }
        const solicitudVariable2 = {
            nombre: variable2
        }
        await postSolicitarVariable(solicitudVariable1)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variable1 = JSON.parse(body).valor;
            });

        await postSolicitarVariable(solicitudVariable2)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variable2 = JSON.parse(body).valor;
            });
    }else if (isNaN(variable1) && !isNaN(variable2)) {
        const solicitudVariable1 = {
            nombre: variable1
        }
        await postSolicitarVariable(solicitudVariable1)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variable1 = JSON.parse(body).valor;
            });
    }else if (!isNaN(variable1) && isNaN(variable2)) {
        const solicitudVariable2 = {
            nombre: variable2
        }
        await postSolicitarVariable(solicitudVariable2)
            .then(response => response.text())
            .then(body => {
                imprimirLog(`POST enviado. \n Respuesta recibida: ${body}`);
                headersPOST.body = '{}';
                variable2 = JSON.parse(body).valor;
            });
    }else{
        throw "Error: Las operaciones deben realizarse con números"
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