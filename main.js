const DEBUG = true; //if true, activates some debugging features, also disables game over state
let mine; //Minesweeper object 
let gameDiv; //DOM element containing game
window.onload = function () {
    gameDiv = document.getElementById('game');
    counterDiv = document.getElementById('timeCnt');
    let controlBtns = document.getElementById('btnGroup').getElementsByTagName('button');
    for (let i = 0; i < controlBtns.length; i++) {
        controlBtns[i].addEventListener('click', startGame, false);
    }
    document.getElementById('faceBtnImg').addEventListener('click', resetGame, false);


    if (DEBUG) {
        let dbhbtn;
        let _createBtn = (btnId, btnName, btnHTML) => {
            let _debugButton = document.createElement('button');
            _debugButton.id = btnId;
            _debugButton.className = btnName;
            _debugButton.innerHTML = btnHTML;
            return _debugButton;
        }

        dbgbtn = _createBtn('showBoard', 'btn btn-danger', 'Show whole board');
        document.getElementById('debugBtn').appendChild(dbgbtn);
        dbgbtn.addEventListener('click', showBoard, false);

        dbgbtn = _createBtn('showMines', 'btn btn-danger', 'Show tiles with mines');
        document.getElementById('debugBtn').appendChild(dbgbtn);
        dbgbtn.addEventListener('click', showMines, false);
    }
}

/** 
 *
 *
 * @class Cell
 */
class Cell {
    constructor() {
        this.status = 'unclicked';
        this.hasBomb = false;
        this.isFlagged = false;
        this.isMarked = false;
        this.surroundingBombs = 0;
    }
}


/** 
 *
 *
 * @class Minesweeper
 */
class Minesweeper {

    /** Creates an instance of Minesweeper.
     *
     * @param {number} rows Number of rows on game board
     * @param {number} cols Number of columns on game board
     * @param {number} maxMines Number of mines
     * @param {DOM element} gameDiv DOM Object which will contain the game board
     * @memberof Minesweeper
     */
    constructor(rows, cols, maxMines, gameDiv) {
        this.rows = rows; 
        this.cols = cols;
        this.maxMines = maxMines;
        this.bombCoords = []; //position of every mine
        this.gameDiv = gameDiv;
        this.gameBoard = []; //game board array
        this.flags = 0; //number of flags
        this.isFirstClick = true; //whether first click has been made yet
        this.isOver = false; //whether the game is over or not
        this.mineCounterDiv = new Array(3); //array with DOM elements of mine countert
        this.createBoard();
    }

    /** Populates gameBoard with Cells
     * 
     * @memberof Minesweeper
     */
    createBoard() {
        for (let i = 0; i < this.rows; i++) {
            this.gameBoard[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.gameBoard[i][j] = new Cell();
            }
        }
        
        for (let i = 0;i<3;i++) {
            this.mineCounterDiv[i] = document.getElementById(`cnt${3-i}`);
        }

        this.drawBoard();
    }

    /** Appends board to game div
     * 
     * @memberof Minesweeper
     */
    drawBoard() {
        let _img;
        let _rowDiv;
        let _cells;

        //sets counter to 0
        this.updateCounter();
        document.getElementById('faceBtnImg').src = DEBUG?'img/facepirate.gif':'img/facesmile.gif';
        //creates board and appends it to game node
        for (let i = 0; i < this.rows; i++) {
            _rowDiv = document.createElement('div');
            _rowDiv.className = "row gameRow";
            for (let j = 0; j < this.cols; j++) {
                _img = document.createElement('img');
                _img.id = i + "-" + j;
                _img.src = "img/blank.gif";
                _rowDiv.appendChild(_img);
            }
            this.gameDiv.appendChild(_rowDiv);
        }
        //event handlers
        _cells = this.gameDiv.getElementsByTagName('img');
        for (let i = 0; i < _cells.length; i++)
            _cells[i].addEventListener('mousedown', chkEvnt, false);
    }

    /** Updates the image of the specified cell.
     *
     * @param {number} x x coordinate of the cell to be modified
     * @param {number} y y coordinate of the cell to be modified
     * @param {string} action Describes the image
     * @memberof Minesweeper
     */
    drawCell(x, y, action) {
        let _draw = (x, y, img) => {
            document.getElementById(`${x}-${y}`).src = img;
        }


        switch (action) {
            case 'mine':
                _draw(x, y, 'img/bombdeath.gif');
                break;
            case 'blank':
                _draw(x, y, `img/open${this.gameBoard[x][y].surroundingBombs}.gif`);
                break;
            case 'flag':
                _draw(x, y, 'img/bombflagged.gif');
                break;
            case 'unflag':
                _draw(x, y, 'img/bombquestion.gif');
                break;
            case 'debugMine':
                _draw(x, y, 'img/debugBlank.gif');
                break;
            case 'debugFlag':
                _draw(x, y, 'img/debugFlag.gif');
            break;
            case 'unclick':
                _draw(x, y, 'img/blank.gif');
                break;
            default: break;
        }
    }

    /** Updates the mine counter.
     *
     *
     * @memberof Minesweeper
     */
    updateCounter() {
        let _remainingMines = this.maxMines - this.flags;
        let _numberStr;

        _numberStr = _remainingMines.toString().padStart(3, "0");
        console.log(_numberStr);

        for (let i = 0;i<3;i++) {
            this.mineCounterDiv[i].src = `img/time${_numberStr.charAt(i)}.gif`;
        }
    }
    
    /** Generates mines and populates board with them, doesn't generate any mine on or around clickX, clickY coordinates
     * 
     * @param {number} clickX index of the row which has been clicked by the user
     * @param {number} clickY index of the column which has been clicked by the user
     * @memberof Minesweeper
     */
    genMines(clickX, clickY) {
        let _x;
        let _y;
        let _hasMine;

        //checks if mine is surrounded by the clicked tile so no mines generate on a 9x9 grid around it
        let _isOk = (n1, m1, n2, m2) => {
            // let _nOk = !_.inRange(n1 - n2, -1, 1);
            // let _mOk = !_.inRange(m1 - m2, -1, 1);
            let _nOk = n1 - n2 > 1 || n1 - n2 < -1;
            let _mOk = m1 - m2 > 1 || m1 - m2 < -1;
            return _mOk || _nOk;
        };

        while (this.bombCoords.length < this.maxMines) {
            _x = parseInt((Math.random()) * this.rows);
            _y = parseInt((Math.random()) * this.cols);

            //checks if cell in _x_y coords already has a bomb
            _hasMine = false;
            if (_isOk(clickX, clickY, _x, _y)) {
                for (let i = 0; i < this.bombCoords.length && !_hasMine; i++) {
                    if (_x == this.bombCoords[i][0] && _y == this.bombCoords[i][1]) {
                        _hasMine = true;
                    }
                }

                if (!_hasMine || this.bombCoords.length === 0) {
                    this.bombCoords.push([_x, _y]);
                }
            }
        }
        //adds mines to field
        for (let i = 0; i < this.bombCoords.length; i++) {
            _x = this.bombCoords[i][0];
            _y = this.bombCoords[i][1];
            //for debug purposes
            this.gameBoard[_x][_y].hasBomb = true;
        }

        for (let i = 0; i < this.bombCoords.length; i++) {
            this.calculateSurroundingMines(this.bombCoords[i][0], this.bombCoords[i][1]);
        }
    }

    /** Adds one to every tile's surroundingBombs parameter around the specified
     *  mine
     * 
     * @param {number} x x coordinate of the mine
     * @param {number} y y coordinate of the mine
     * @memberof Minesweeper
     */
    calculateSurroundingMines(x, y) {
        let _xi, _yj;
        for (let i = -1; i < 2; i++) {
            _xi = parseInt(x) + i;
            for (let j = -1; j < 2; j++) {
                _yj = parseInt(y) + j;
                if (_xi >= 0 && _xi < this.rows && _yj >= 0 && _yj < this.cols) {
                    this.gameBoard[_xi][_yj].surroundingBombs++;
                }
            }
        }
    }

    /** Recursive function which shows all blank cells around a specified blank cell, then all blank cells around each of them,
     * as long as they have no mines in its surroundings
     *
     *
     * @param {number} x x coordinate of current blank cell
     * @param {number} y y coordinate of current blank cell
     * @memberof Minesweeper
     */
    revealBlanks(x, y) {
        let _xi, _yj;
        //checks surrounding cells and reveals them
        for (let i = -1; i < 2; i++) {
            _xi = parseInt(x) + i;
            for (let j = -1; j < 2; j++) {
                _yj = parseInt(y) + j;
                if (_xi >= 0 && _xi < this.rows && _yj >= 0 && _yj < this.cols && this.gameBoard[_xi][_yj].status == 'unclicked') {
                    this.drawCell(_xi, _yj, 'blank');
                    this.gameBoard[_xi][_yj].status = 'clicked';
                    if (this.gameBoard[_xi][_yj].surroundingBombs === 0) {
                        this.revealBlanks(_xi, _yj);
                    }

                }
            }
        }
    }

    /** Checks user input
     *
     *
     * @param {number} x x coordinate of the cell which the user has clicked
     * @param {number} y y coordinate of the cell which the user has clicked
     * @param {number} click numerical value representing which mouse button the user has pressed
     * @memberof Minesweeper
     */
    checkCell(x, y, click) {
        let _currentCell = this.gameBoard[x][y];

        if (!this.isOver && _currentCell.status === 'unclicked') { //checks if button has already been clicked
            if(DEBUG) console.log(x + '-' + y);

            switch (click) {
                case 1: //leftclick
                    this.leftClick(x, y, _currentCell);
                    break;
                case 3: //rightclick
                    //only flags cells if it's game has already started
                    this.rightClick(x, y, _currentCell);
                    break;
            }
            if (this.flags == this.maxMines && this.isGameClear()) {
                this.gameOver(1);
            }
        }
        this.updateCounter();
        
    }

    /** Gets called if user inputs a left click.
     *
     *
     * @param {number} x x coordinate of the cell which the user has clicked
     * @param {number} y y coordinate of the cell which the user has clicked
     * @param {Cell} cell Cell object representing the clicked cell
     * @param {boolean} comesFromDebugOpt Whether it's been called from a debug function or not
     * @memberof Minesweeper
     */
    leftClick(x, y, cell, comesFromDebugOpt = false) {
        //generates mines if it's the first click of the game
        if (this.isFirstClick) {
            this.isFirstClick = false;
            this.genMines(x, y);
        }
        //checks if cell has bomb
        if (cell.hasBomb) { //has bomb
            this.drawCell(x, y, 'mine');
            if (!comesFromDebugOpt) {
                this.gameOver(0);
            }
        } else { //is blank
            this.drawCell(x, y, 'blank');
            if (cell.surroundingBombs === 0) {
                this.revealBlanks(x, y);
            }
        }
        if (cell.isFlagged) {
            cell.isFlagged = false;
            this.flags--;
        }
        cell.status = 'clicked';
    }

    /** Gets called if user inputs a right click.
     *
     *
     * @param {number} x x coordinate of the cell which the user has clicked
     * @param {number} y y coordinate of the cell which the user has clicked
     * @param {Cell} cell Cell object representing the clicked cell
     * @memberof Minesweeper
     */
    rightClick(x, y, cell) {
        if (!this.isFirstClick) {
            if (cell.isFlagged) {
                cell.isFlagged = false;
                cell.isMarked = true;
                this.flags--;
                this.drawCell(x, y, 'unflag');

            } else {
                if (cell.isMarked) {
                    cell.isMarked = false;
                    this.drawCell(x, y, 'unclick');
                } else {
                    cell.isFlagged = true;
                    this.flags++;
                    this.drawCell(x, y, 'flag');
                }
            } 
        }
    }

    /** Finishes the game.
     *
     *
     * @param {number} code Code representing the way the game has finished.
     * @memberof Minesweeper
     */
    gameOver(code) {
        switch (code) {
            case 0:
                for(let i = 0;i< this.rows;i++) {
                    for(let j = 0;j<this.cols;j++) {
                        if (this.gameBoard[i][j].hasBomb) {
                            this.drawCell(i, j, 'mine');
                        }
                    }
                }

                this.isOver = true;
                document.getElementById('faceBtnImg').src = 'img/facedead.gif';
                
                setTimeout(() => { alert("Has perdido!"); }, 200);

                break;
            case 1:
                if (!DEBUG) {
                    this.isOver = true;
                }
                document.getElementById('faceBtnImg').src = 'img/facewin.gif';

                setTimeout(() => { alert("Has ganado!"); }, 200);
                break;
            default: break;
        }
    }

    /** Checks whether the user has cleared the game or not, that is, every bomb tile has
     * been flagged, and every blank tile has been clicked.
     *
     * @returns {boolean} If game is clear.
     * @memberof Minesweeper
     */
    isGameClear() {
        let _gameClear = true;
        for (let i = 0;i<this.rows && _gameClear;i++) {
            for (let j = 0;j<this.cols && _gameClear;j++) {
                if (this.gameBoard[i][j].hasBomb) {
                    if (!this.gameBoard[i][j].isFlagged) {
                        _gameClear = false;
                    }
                } else {
                    if (this.gameBoard[i][j].status == 'unclicked') {
                        _gameClear = false;
                    }
                }
            }
        }
        console.log(_gameClear?'gameClear':'gameNotClear');

        return _gameClear;
    }

    /** Colors tiles which contain mines for debug purposes
     *
     *
     * @memberof Minesweeper
     */
    showMinesDebug() {
        let _cell;
        if (!this.isOver) {
            for (let i = 0; i < this.bombCoords.length; i++) {
                _cell = this.gameBoard[this.bombCoords[i][0]][this.bombCoords[i][1]];
                if (_cell.status === 'unclicked') {
                    if (!_cell.isFlagged) {
                        this.drawCell(this.bombCoords[i][0], this.bombCoords[i][1], 'debugMine');
                    } else {
                        this.drawCell(this.bombCoords[i][0], this.bombCoords[i][1], 'debugFlag');
                    }
                }
            }
        }
    }

    /** Reveal the whole board.
     * 
     * 
     * @memberof Minesweeper
     */
    showBoardDebug() {
        for (let i = 0; i < this.rows; i++)
            for (let j = 0; j < this.cols; j++)
                this.leftClick(i, j, this.gameBoard[i][j], true);
    }
}

//methods
startGame = (e) => {
    refreshDOMContainer();
    switch (e.target.id) {
        case 'principiante':
            mine = new Minesweeper(8, 8, 10, gameDiv);
            break;
        case 'intermedio':
            mine = new Minesweeper(16, 16, 40, gameDiv);
            break;
        case 'experto':
            mine = new Minesweeper(16, 31, 99, gameDiv);
            break;
        case 'custom':
            let _x, _y, _m;
            _x = prompt("Enter rows: ");
            _y = prompt("Enter columns: ");
            _m = prompt("Enter mines: ");
            if ((_x*_y)/3 >= _m && _m <= 999) {
                mine = new Minesweeper(_x, _y, _m, gameDiv);
            } else {
                alert ('El número máximo de minas es (nº col * nº filas) / 3, con un máximo de 999')
            }
            break;
        default: break;
    }
}

/** Deletes then appends an element for the game to be drawn into.
 *
 *
 */
refreshDOMContainer = () => {
    let _ui = document.getElementById('minesweeper');

    _ui.removeChild(gameDiv);

    gameDiv = document.createElement('div');
    gameDiv.id = 'game';
    gameDiv.className = 'container';

    _ui.appendChild(gameDiv);

    _ui.style.display = 'inline-block';
    gameDiv.addEventListener("contextmenu", function (evt) {
        evt.preventDefault(); return false;
    });
}

/** Acts as an anchor to bind events to the Minesweeper object.
 * 
 *
 * @param {Event} e
 */
chkEvnt = (e) => {
    let _targetNode = e.target;
    let _xy = _targetNode.id.split('-');
    let _x = _xy[0];
    let _y = _xy[1];
    let _click = e.which;

    mine.checkCell(_x, _y, _click);
}


showBoard = () => {
    if (mine != null)
        mine.showBoardDebug();
}

showMines = () => {
    if (mine != null)
        mine.showMinesDebug();
}

resetGame = () => {
    let _cols, _rows, _mines;
    _cols = mine.cols;
    _rows = mine.rows;
    _mines = mine.maxMines;
    
    refreshDOMContainer();
    mine = new Minesweeper(_rows, _cols, _mines, gameDiv);
}