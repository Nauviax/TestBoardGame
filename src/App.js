import { Client } from 'boardgame.io/client';
import { TestGame } from './Game';
import { SocketIO } from 'boardgame.io/multiplayer';

var InitialMapGenerated = false;

function SplashScreen(rootElement) {
	console.log("Displaying splash screen");
	return new Promise((resolve) => {
		const createButton = (playerID) => {
			const button = document.createElement('button');
			button.textContent = 'Player ' + playerID;
			button.onclick = () => resolve(playerID);
			rootElement.append(button);
		};
		rootElement.innerHTML = ` <p>Play as</p>`;
		const playerIDs = ['0', '1'];
		playerIDs.forEach(createButton);
	});
}

// To launch this app, type 'npm start' into a console
class TestGameClient {
	constructor(rootElement, { playerID } = {}) {
		this.client = Client({
			game: TestGame,
			multiplayer: SocketIO({ server: 'localhost:8080' }),
			playerID,
		});
		this.connected = false;
		this.client.start();
		this.rootElement = rootElement;
		this.client.subscribe(state => this.update(state));
		// this.attachListeners();
	}

	onConnecting() {
		this.connected = false;
		this.showConnecting();
	}

	onConnected() {
		this.connected = true;
	}

	showConnecting() {
		this.rootElement.innerHTML = '<p>connecting…</p>';
	}

	createBoard(state) {
		// Create a nxn board of cells
		const rows = [];
		const mapSize = state.G._mapSize * 3; // Each tile is 3x3
		for (let i = 0; i < mapSize; i++) {
			const cells = [];
			for (let j = 0; j < mapSize; j++) {
				const id = mapSize * i + j;
				cells.push(`<td class="cell" data-id="${id}"></td>`);
			}
			rows.push(`<tr>${cells.join('')}</tr>`);
		}

		// Add the HTML to our app <div>.
		//this.rootElement.innerHTML = `<table>${rows.join('')}</table><p class="winner"></p>`;
		this.rootElement.innerHTML = `<h2>Player ${this.client.playerID}</h2><table>${rows.join('')}</table><p class="winner"></p>`;
	}

	attachListeners() {
		// This event handler will read the cell id from a cell’s `data-id` attribute and make the `clickCell` move.
		const handleCellClick = event => {
			let id = parseInt(event.target.dataset.id);
			if (Number.isInteger(id)) {
				console.log("Clicked cell " + id);
				this.client.moves.clickCell(id);
			}
			else {
				id = parseInt(event.target.parentElement.dataset.id);
				console.log("Clicked picture cell " + id);
				this.client.moves.clickCell(id);
			}
		};
		// Attach the event listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');
		cells.forEach(cell => {
			cell.onclick = handleCellClick;
		});
	}

	update(state) {
		if (state === null) {
			this.onConnecting();
			return;
		} else if (!this.connected) {
			this.onConnected();
		}

		if (!InitialMapGenerated) { // Create cells on the screen on first update
			this.createBoard(state);
			this.attachListeners();
			InitialMapGenerated = true;
		}

		if (state.G._mapGenerated) { // Handle cell updates only if a map is generated
			// Get board size
			const mapSize = state.G._mapSize * 3; // Each tile is 3x3
			// Get all the board cells.
			const cells = this.rootElement.querySelectorAll('.cell');
			// Update cells to display the values in game state.
			cells.forEach(cell => {
				const cellID = parseInt(cell.dataset.id);
				const cellCoords = [cellID % mapSize, Math.floor(cellID / mapSize)];
				const cellValue = state.G.cells[cellCoords[0]][cellCoords[1]]; // 2D array yay

				// Draw rooms
				if (cellValue == "O") { // If cell is an empty tile, actually draw a blank char
					cell.textContent = "";
				} else {
					cell.innerHTML = `<img src='https://nrmaultsaid.jalbum.net/images/slides/${cellValue}.png' style='width: 50px; height: 50px; object-fit; fill;'/>`;
				}

				// Draw players
				let containsPlayer = false; // True if cell contains a player (Used to draw valid move markers) (This is temporary, feel free to change this)
				for (let ii = 0; ii < state.G.playerLocations.length; ii++) { // Check if this cell contains a player. Append the player num if so
					if (cellCoords[0] == state.G.playerLocations[ii][0] && cellCoords[1] == state.G.playerLocations[ii][1]) {
						cell.textContent += ii; // Player ID/char is just it's num/index
						containsPlayer = true;
						if (ii == 0) { // First two players are red and blue, and get images
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/blueplayer.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
						if (ii == 1) {
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/redplayer.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
					}
				}

				// Draw valid moves
				if (state.G.playerLocations[state.ctx.currentPlayer][2]) { // If player is in a room
					return; // End early (Don't draw valid move markers if player is in room)
				}
				if (state.G._safeTiles.includes(cellValue)) { // If the tile is a safe tile, check if move indicators should be drawn ("." for now)
					const deltaX = Math.abs(cellCoords[0] - state.G.playerLocations[state.ctx.currentPlayer][0]); // Getting abs distance from current player to this tile
					const deltaY = Math.abs(cellCoords[1] - state.G.playerLocations[state.ctx.currentPlayer][1]);

					if (!containsPlayer && deltaX + deltaY != 0 && deltaX + deltaY <= state.G.diceRoll[0]) { // If within correct distance, draw a move indicator
						if (cellValue == "DN") { // If cell is an empty tile, actually draw a blank char
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/DNV.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
						else if (cellValue == "DS") { // If cell is an empty tile, actually draw a blank char
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/DSV.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
						else if (cellValue == "DE") { // If cell is an empty tile, actually draw a blank char
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/DEV.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
						else if (cellValue == "DW") { // If cell is an empty tile, actually draw a blank char
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/DWV.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
						else {
							cell.innerHTML = "<img src='https://nrmaultsaid.jalbum.net/images/slides/OV.png' style='width: 50px; height: 50px; object-fit; fill;'/>";
						}
					}
				}
			}
			);
		}

		// Get the gameover message element.
		const messageEl = this.rootElement.querySelector('.winner');
		// Update the element to show a winner if any.
		if (state.ctx.gameover) {
			messageEl.textContent = 'Winner: ' + state.ctx.gameover.winner;
		} else {
			messageEl.textContent = '';
		}
	}
}

class App {
	constructor(rootElement) {
		this.client = SplashScreen(rootElement).then((playerID) => {
			return new TestGameClient(rootElement, { playerID });
		});
	}
}

console.log("Creating App");
const appElement = document.getElementById('app');
new App(appElement);