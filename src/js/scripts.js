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


let valoresReservados = ['int', 'long', 'char', 'float', 'double', 'struct'];
let posicionEnTexto = 0;
let nextButtonClicked = false;
let creando = 'variables';
let nombreStruct = '';
let variablesEnStruct = [];

const serverURL = 'http://localhost:8888';

runButton.addEventListener('click', e => {
    e.preventDefault();
    limpiarVentana();
    try {
        runButton.style.display = 'none';
        runningButtons.style.display = 'flex';
        const variable = procesarTexto(editorTextArea.value, posicionEnTexto);

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
                    variable = procesarTexto(editorTextArea.value, posicionEnTexto + 1);
                    break;
                case 'struct':
                    variable = procesarStruct(nombreStruct, editorTextArea.value, posicionEnTexto + 1);
                    break;
            }
            if (variable !== undefined) {
                console.log(variable);
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

procesarTexto = (texto, posicionInicial) => {
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

        if (caracter === '{' && informacion[0] === 'struct') {
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
    const ultimaPalabra = informacion[informacion.length - 1];

    if (informacion[0].slice(0, 6) + ultimaPalabra[ultimaPalabra.length - 1] === 'print()') {
        informacionString = arrayToString(informacion);
        return imprimirStdOut(informacionString.slice(7, informacionString.length - 1));
    }

    informacion = removerTodasLasOcurrencias(informacion, '');
    const tipoDeVariable = informacion[0];
    const nombreDeVariable = informacion[1];
    const valorDeVariable = informacion[3];

    if (tipoDeVariable.split('<').includes('reference')) {
        return crearReferencia(tipoDeVariable, nombreDeVariable, valorDeVariable);
    }
    if (informacion[2] !== '=') {
        throw 'Error: Variable mal declarada';
    }
    if (valoresReservados.includes(nombreDeVariable)) {
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

    valorDeVariable = [...valorDeVariable];
    removerTodasLasOcurrencias(valorDeVariable, ' ');
    if (valorDeVariable[0] !== '"' || valorDeVariable[valorDeVariable.length - 1] !== '"') {
        throw 'Error: los char deben ir entre comillas';
    } else if (valorDeVariable.length !== 3) {
        throw 'Error: los char solo pueden tener un caracter';
    }
    variable = new char(valorDeVariable[1], nombreDeVariable);
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
        console.log(caracter);
        posicionEnTexto = i;

        if (caracter === '}') {
            creando = 'variables';
            return new struct(nombre, variablesEnStruct);
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
    if (error) {
        etiqueta.style.color = 'red';
    } else {
        etiqueta.style.color = 'yellow';
    }
    let textoEtiqueta = document.createTextNode(texto);
    etiqueta.appendChild(textoEtiqueta);
    mensajesLog.appendChild(etiqueta);
    mensajesLog.scrollTop = mensajesLog.scrollHeight;
}

imprimirStdOut = texto => {
    if (texto[0] !== "'" || texto[texto.length - 1] !== "'") {
        throw "Error: el texto a imprimir debe ir entre comillas";
    }
    let etiqueta = document.createElement('p');
    etiqueta.style.color = 'white';
    let textoEtiqueta = document.createTextNode(texto.slice(1, texto.length - 1));
    etiqueta.appendChild(textoEtiqueta);
    mensajesStdOut.appendChild(etiqueta);
    mensajesStdOut.scrollTop = mensajesStdOut.scrollHeight;
}

arrayToString = array => {
    let string = ``;
    array.forEach(palabra => {
        string += ` ${palabra}`;
    });
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
    let ramLiveViewPRefsTexto = document.createTextNode('--------');
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
            const respuesta = await fetch(`${serverURL}/crearVariable`, {
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
                    data.direccionDeMemoria = JSON.parse(body).direccion;
                    actualizarRamLiveView(data);
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
            const respuesta = await fetch(`${serverURL}/createStruct`, {
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
                    data.direccionDeMemoria = JSON.parse(body).direccion;
                    actualizarRamLiveView(data);
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
        imprimirLog(`Enviando POST: ${JSON.stringify(data)} a la dirección: ${`${serverURL}/crearVariable`}`);
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