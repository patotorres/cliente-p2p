'use strict';

var io = require('socket.io-client');
var fs = require('fs');
var md5File = require('md5-file')

class ClientCatalog {

    constructor(onConnect, onErrorConnection, onGetFileList, onGetPeerList) {
        this._ip = null;
        this._port = null;
        this._socket = null;
        this._current_file_list = [];
        this._current_file_selected = null;

        this._onConnectEvent = onConnect;
        this._onErrorConnectionEvent = onErrorConnection;
        this._onGetFileListEvent = onGetFileList;
        this._onGetPeerListEvent = onGetPeerList;
    }


    /* :::::::::::::::::::::::::::::::
       :::::::  MÉTODOS PÚBLICOS :::::
       :::::::::::::::::::::::::::::::  */

    /* Establece la IP y Puerto de la conexión */
    setIPPort(ip, port) {
        this._ip = ip;
        this._port = port;
    }

    /* Conecta con el servidor de Catálogo */
    connect() {
        this._socket = io.connect('http://' + this._ip + ':' + this._port + '/par', {
            'reconnect': false
        });
        this._connection();
    }

    /* Solicita listado de archivos por nombre */
    getFilesList(name) {
        this._socket.emit('buscarArchivo', name);
    }

    /* Devuelve la lista de archivos actual */
    getCurrentFileList() {
        return this._current_file_list;
    }

    /* Devuelve el último archivo selecionado para descargar */
    getCurrentFileSelected() {
        return this._current_file_selected;
    }

    /* Solicita el listado de pares mediante el ID del archivo */
    getPeersList(id_file) {

        this._current_file_selected = this._current_file_list.filter(
            function(data) {
                return data.id == id_file
            })[0];

        this._socket.emit('getParesArchivo', id_file);
    }

    /* Notifica la existencia del nuevo archivo al Catalogo */
    sendNewFile(file) {
        if (file.charAt(0) != ".") {
            md5File('./downloads/' + file, (err, hash) => {
                if (err) throw err

                this._socket.emit('nuevoArchivo', {
                    hash: hash,
                    nombre: file,
                    size: this._getFilesize('./downloads/' + file)
                });
            })
        }
    }


    /* :::::::::::::::::::::::::::::::
       :::::::  MÉTODOS PRIVADOS :::::
       :::::::::::::::::::::::::::::::  */

    _sendAllFilesNames() {
        fs.readdir('./downloads/', function(err, files) {
            $.each(files, function(i, file) {
                console.log(file);
                this.sendNewFile(file);
            }.bind(this));
        }.bind(this));
    }

    /* Envía un mensaje de bienvenida */
    _sendHello() {
        this._socket.emit('parConectado');
    }

    /* Maneja el flujo de la conexión */
    _connection() {

        // Detecta la conexión
        this._socket.on('connect', function() {
            this._onConnectEvent();
            this._sendHello();
            this._sendAllFilesNames();
        }.bind(this));

        // Detecta la desconexión
        this._socket.on('disconnect', function() {
            this._onErrorConnectionEvent();
        }.bind(this));

        // Paquetes
        this._socket.on("archivoEncontrado", function(info) {
            this._current_file_list = info;
            this._onGetFileListEvent(this._current_file_list);
        }.bind(this));

        this._socket.on("listadoPares", function(info) {
            this._onGetPeerListEvent(info);
        }.bind(this));
    }

    /* Obtiene el tamaño de un archivo en bytes */
    _getFilesize(filename) {
        var stats = fs.statSync(filename)
        var fileSizeInBytes = stats["size"]
        return fileSizeInBytes
    }
}

module.exports = ClientCatalog;
