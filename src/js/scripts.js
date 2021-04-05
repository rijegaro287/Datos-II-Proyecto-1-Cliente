const math = require('mathjs');

const runButton = document.querySelector('#run-btn');
const editorTextArea = document.querySelector('#editor-text-area');

class tipoDeDato {
    constructor(valor, nombre) {
        this.valor = valor;
        this.name = nombre;
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
    }
}

class long extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 8;
    }
}

class char extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 1;
    }
}

class float extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 4;
    }
}

class double extends tipoDeDato {
    constructor(valor, nombre) {
        super(valor, nombre);
        this.espacioEnMemoria = 8;
    }
}

class reference {
    constructor(tipoDeDato, direccionDeMemoria, nombre) {
        this.tipoDeDato = tipoDeDato;
        this.direccionDeMemoria = direccionDeMemoria;
        this.name = nombre;
    }

    getValue() {
        return
    }
}

class struct {
    constructor(variables) {
        this.variables = variables;
        this.direccionDeMemoria = null;
    }
    getAddr() {
        return this.direccionDeMemoria;
    }
}

let valoresReservados = ['int', 'long', 'char', 'float', 'double', 'struct'];

runButton.addEventListener('click', e => {
    e.preventDefault();
    procesarTexto(editorTextArea.value, 0);
});

procesarTexto = (texto, posicionInicial) => {
    if (posicionInicial === texto.length) {
        return;
    }

    let palabra = ''
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        const caracter = texto[i];

        if (caracter === '{' && informacion[0] === 'struct') {
            try {
                informacion.push(palabra);
                return crearStruct(informacion, texto, i + 1);
            } catch (error) {
                throw error;
            }
        } else if (caracter === ';') {
            informacion.push(palabra);
            try {
                crearVariable(informacion);
            } catch (error) {
                throw error;
            }
            return procesarTexto(texto, i + 1);
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
    throw 'Error: falta ";"';
}

crearVariable = (informacion) => {
    informacion = removerTodasLasOcurrencias(informacion, '');

    const tipoDeVariable = informacion[0];
    const nombreDeVariable = informacion[1];
    let valorDeVariable = informacion[3];

    if (informacion[2] !== '=') {
        throw 'Variable mal declarada';
    }
    if (valoresReservados.includes(nombreDeVariable)) {
        throw 'Error: nombre de la variable no puede ser un valor reservado';
    }
    if (tipoDeVariable.split('<').includes('reference')) {
        return crearReferencia(tipoDeVariable, nombreDeVariable, valorDeVariable);
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
        throw 'Variable mal declarada';
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
            throw 'Tipo de dato inválido';
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

crearReferencia = (tipoDeVariable, nombreDeVariable, valorDeVariable) => {
    let tipoDeDato = tipoDeVariable.split('reference');
    removerTodasLasOcurrencias(tipoDeDato, '');
    tipoDeDato = tipoDeDato[0];

    if (tipoDeDato === undefined || tipoDeDato[0] !== '<' || tipoDeDato[tipoDeDato.length - 1] !== '>') {
        throw 'Error: El tipo de dato de una referencia debe ir en entre flechas';
    } else {
        tipoDeDato = tipoDeDato.slice(1, tipoDeDato.length - 1);
    }

    const variable = new reference(tipoDeDato, valorDeVariable, nombreDeVariable);
    console.log(variable);
    return variable;
}

crearStruct = (informacion, texto, posicionInicial) => {
    informacion = removerTodasLasOcurrencias(informacion, '');
    const nombreDeVariable = informacion[1];
    if (valoresReservados.includes(nombreDeVariable)) {
        throw 'Error: nombre de la variable no puede ser un valor reservado';
    }
    let variables = procesarStruct(texto, posicionInicial, []);
    return new struct(variables);
}

procesarStruct = (texto, posicionInicial, variables) => {
    let palabra = ''
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        const caracter = texto[i];

        if (caracter === '}') {
            return variables;
        } else if (caracter === ';') {
            informacion.push(palabra);
            try {
                variables.push(crearVariable(informacion));
            } catch (error) {
                throw error;
            }
            return procesarStruct(texto, i + 1, variables);
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
    throw 'Error: falta "}"';
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