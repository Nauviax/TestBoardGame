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
				const cellValue = state.G.cells[cellID % mapSize][Math.floor(cellID / mapSize)]; // 2D array yay
				if (cellValue === null) {
					// OLD PLAYER MOVE INDICATOR CODE (Salvage for pathfinding maybe?)
					// const deltaX = cellId % mapSize - playerLocation % mapSize;
					// const deltaY = Math.floor(cellId / mapSize) - Math.floor(playerLocation / mapSize);
					// if (!state.ctx.gameover && ((deltaX == 0) != (deltaY == 0))) { // Implements xor
					// 	cell.textContent = "•";
					// }
					// else {
					// 	cell.textContent = "";
					// }
					cell.textContent = "error";
				}
				else {
					cell.textContent = cellValue;
				}
			});
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