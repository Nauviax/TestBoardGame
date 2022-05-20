import { Client } from 'boardgame.io/client';
import { TestGame } from './Game';

var InitialMapGenerated = false;

// To launch this app, type 'npm start' into a console
class TestGameClient {
	constructor(rootElement) {
		this.client = Client({ game: TestGame });
		this.client.start();
		this.rootElement = rootElement;
		this.client.subscribe(state => this.update(state));
		this.attachListeners();
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
		this.rootElement.innerHTML = `<table>${rows.join('')}</table><p class="winner"></p>`;
	}

	attachListeners() {
		// This event handler will read the cell id from a cell’s `data-id` attribute and make the `clickCell` move.
		const handleCellClick = event => {
			const id = parseInt(event.target.dataset.id);
			this.client.moves.clickCell(id);
		};
		// Attach the event listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');
		cells.forEach(cell => {
			cell.onclick = handleCellClick;
		});
	}

	update(state) {
		if (!InitialMapGenerated) { // Create cells on the screen on first update
			this.createBoard(state);
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
				cell.textContent = cellValue; // Update cell text

				if (cellValue == "O" || cellValue == "I") { // If cell is an empty tile, actually draw a blank char
					cell.textContent = ""; // This is temporary !!!
				}

				let containsPlayer = false; // True if cell contains a player (Used to draw valid move markers) (This is temporary, feel free to change this)
				for (let ii = 0; ii < state.G.playerLocations.length; ii++) { // Check if this cell contains a player. Append the player num if so
					if (cellCoords[0] == state.G.playerLocations[ii][0] && cellCoords[1] == state.G.playerLocations[ii][1]) {
						cell.textContent += ii; // Player ID/char is just it's num/index
						containsPlayer = true;
					}
				}
				if (state.G.playerLocations[state.ctx.currentPlayer][2]) { // If player is in a room
					return; // End early (Don't draw valid move markers if player is in room)
				}
				if (state.G._safeTiles.includes(cellValue)) { // If the tile is a safe tile, check if move indicators should be drawn ("." for now)
					const deltaX = Math.abs(cellCoords[0] - state.G.playerLocations[state.ctx.currentPlayer][0]); // Getting abs distance from current player to this tile
					const deltaY = Math.abs(cellCoords[1] - state.G.playerLocations[state.ctx.currentPlayer][1]);

					if (!containsPlayer && deltaX + deltaY != 0 && deltaX + deltaY <= state.G.diceRoll[0]) { // If within correct distance, draw a move indicator
						cell.textContent += "V";
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

const appElement = document.getElementById('app');
const app = new TestGameClient(appElement);