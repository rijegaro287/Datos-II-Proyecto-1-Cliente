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

runButton.addEventListener('click', e => {
    e.preventDefault();
    console.log(procesarTexto(editorTextArea.value, 0));
});

procesarTexto = (texto, posicionInicial) => {
    let palabra = ''
    let informacion = [];
    let operadorIgualEncontrado = false;

    for (let i = posicionInicial; i < texto.length; i++) {
        const caracter = texto[i];

        if (caracter === ';') {
            informacion.push(palabra);
            return crearVariable(informacion);
        } else if (caracter === '=') {
            informacion.push('=');
            operadorIgualEncontrado = true;
        } else if (caracter === ' ' && !operadorIgualEncontrado) {
            informacion.push(palabra);
            palabra = '';
        } else {
            palabra += caracter;
        }
    }

    console.log('Error: falta ";"');
}

crearVariable = informacion => {
    informacion = removerTodasLasOcurrencias(informacion, '');

    console.log(informacion);

    let variable = null;
    const tipoDeVariable = informacion[0];
    const nombreDeVariable = informacion[1];
    let valorDeVariable = null;

    if (informacion[2] !== '=') {
        return 'Variable mal declarada';
    } else {
        try {
            valorDeVariable = math.evaluate(informacion[3]);
        } catch (error) {
            return ('Variable mal declarada');
        }
    }

    switch (tipoDeVariable) {
        case 'int':
            variable = new int(math.round(valorDeVariable), nombreDeVariable);
            break;
        case 'long':
            variable = new long(math.round(valorDeVariable), nombreDeVariable);
            break;
        case 'char':
            variable = new char(valorDeVariable, nombreDeVariable);
            break;
        case 'float':
            variable = new float(valorDeVariable, nombreDeVariable);
            break;
        case 'double':
            variable = new double(valorDeVariable, nombreDeVariable);
            break;
        default:
            console.log('tipo de dato inválido');
            break;
    }

    return variable;
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