import { Client } from 'boardgame.io/client';
import { KiwiKluedo } from './Game';
import { SocketIO } from 'boardgame.io/multiplayer';
import { LobbyClient } from 'boardgame.io/client';

var InitialMapGenerated = false;

//For use IF we want to use the lobby to manage matches
async function lobbyStart() {
	const lobbyClient = new LobbyClient({ server: 'http://localhost:8088' });
	const { matchID } = await lobbyClient.createMatch('KiwiKluedo', {
		numPlayers: 2
	});
	console.log("Generated MatchID");
	console.log(matchID);
	return matchID;
}

// function for the start page of the game, passing in the page element 
function SplashScreen(rootElement) {
	console.log("Displaying splash screen");

	// promise - returns something later, resolve - activates the return
	return new Promise((resolve) => {

		// method to create buttons for each player, and sets click event to return playerId and matchId
		const createButton = (playerID) => {
			const button = document.createElement('button');
			button.id = "PlayerButton" + playerID;
			button.textContent = 'Player ' + playerID;
			button.onclick = () => {
				const matchID = document.getElementById('MatchID').value;
				const returnValue = [playerID, matchID];
				resolve(returnValue);
			};
			rootElement.append(button);
		};

		rootElement.innerHTML = '<h1 id="title">Kiwi Kluedo</h1>';
		rootElement.innerHTML += '<p>Create or enter match id: <p>';
		const textbox = document.createElement('input');
		textbox.type = "text";
		textbox.title = "MatchID";
		textbox.name = "MatchID";
		textbox.id = "MatchID";
		//rootElement.innerHTML += '<div id="lobby">';
		rootElement.append(textbox);
		rootElement.innerHTML += ` <p>Play as:</p>`;
		const playerIDs = ['0', '1'];
		playerIDs.forEach(createButton);
		//rootElement.innerHTML += '</div>';


		document.getElementById("title").style.fontFamily = "Arial";
		document.getElementById("title").style.fontSize = "50px";
		document.getElementById("title").style.color = "seagreen";

		document.getElementById("PlayerButton0").style.padding = "16px 32px";
		document.getElementById("PlayerButton0").style.margin = "5px";
		document.getElementById("PlayerButton0").style.backgroundColor = "seagreen";
		document.getElementById("PlayerButton0").style.color = "#EFE8D8";
		document.getElementById("PlayerButton0").style.cursor = "pointer";
		document.getElementById("PlayerButton0").style.border = "none";
		document.getElementById("PlayerButton0").style.fontSize = "16px"

		document.getElementById("PlayerButton1").style.padding = "16px 32px";
		document.getElementById("PlayerButton1").style.margin = "5px";
		document.getElementById("PlayerButton1").style.backgroundColor = "seagreen";
		document.getElementById("PlayerButton1").style.color = "#EFE8D8";
		document.getElementById("PlayerButton1").style.cursor = "pointer";
		document.getElementById("PlayerButton1").style.border = "none";
		document.getElementById("PlayerButton1").style.fontSize = "16px"

		document.body.style.backgroundColor = "#EFE8D8";

	});
}

// To launch this app, type 'npm start' into a console
// And to run the server type 'npm run serve' in a second console
class TestGameClient {
	// constructor requires the page (rootElement), playerId, and matchId
	constructor(rootElement, { playerID } = {}, { matchID } = {}) {
		this.client = Client({
			game: KiwiKluedo,
			multiplayer: SocketIO({ server: 'localhost:8080' }),
			matchID: matchID,
			playerID,
		});
		this.connected = false;
		this.client.start();
		this.rootElement = rootElement;
		this.client.subscribe(state => this.update(state));
	}

	onConnecting() {
		this.connected = false;
		this.showConnecting();
		console.log("onConnecting matchID");
		console.log(this.client.matchID);
	}

	onConnected() {
		this.connected = true;
	}

	showConnecting() {
		this.rootElement.innerHTML = '<p>connecting…</p>';
	}

	createBoard(state) {
		console.log("Creating board");
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
		// this.rootElement.innerHTML = `<table>${rows.join('')}</table><p class="winner"></p>`;
		this.rootElement.innerHTML = `<h2>Player ${this.client.playerID}</h2>`;
		this.rootElement.innerHTML += `<p>MatchID: ${this.client.matchID}</p>`;
		this.rootElement.innerHTML += `<table>${rows.join('')}</table>`;
		this.rootElement.innerHTML += `<p class="minimap"></p>`;
		this.rootElement.innerHTML += `<p class="winner"></p>`;
	}

	attachListeners() {
		console.log("Attaching listeners");
		// Attach the evenit listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');

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

		if (!state.G._mapValuesSet) { // DO NOT DELETE THIS IF STATEMENT! update() MUST return early if map values have not been set.

			// THIS IS ONLY TEMPORARY! Please implement some way to set values, like small/med/large map/game modes. (Boardsize, RoomNum, ItemNum, CharNum)
			// Note that this move can be made ANYWHERE, not just in update(). It is here for now so it is automatically played.

			this.client.moves.GenerateMapWithValues(6, 6, 6, 6);

			// More testing values
			// this.client.moves.GenerateMapWithValues(4, 4, 4, 4);
			// this.client.moves.GenerateMapWithValues(8, 8, 8, 8);
			// this.client.moves.GenerateMapWithValues(10, 10, 10, 10);

			return; // Do nothing
		}

		if (!InitialMapGenerated) { // Create cells on the screen on first update
			this.createBoard(state);
			this.attachListeners();
			InitialMapGenerated = true;
			return;
		}
		if (state.G._mapGenerated) { // Handle cell updates only if a map is generated
			// Get board size
			const mapSize = state.G._mapSize * 3; // Each tile is 3x3
			//Number of colours for players
			const numberOfColours = 6;
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
						let playerValue = ii % numberOfColours;
						cell.innerHTML = `<img src='https://nrmaultsaid.jalbum.net/Players4KiwiKluedo/slides/player${playerValue}.png' style='width: 50px; height: 50px; object-fit; fill;'/>`;
					}
				}
				// New code for displaying players in rooms. Will only show one player per room, and prioritises players whos turn is closest.
				let previousPlayer = (state.ctx.numPlayers + state.ctx.currentPlayer - 1) % state.ctx.numPlayers;
				for (let ii = 0; ii < state.ctx.numPlayers; ii++) { // For each player, (Going backwards, ending at current player)
					if (state.G.playerLocations[previousPlayer][2]) { // If player is in room
						let playerTile = state.G._roomList[state.G.playerLocations[previousPlayer][3]][4]; // Get this rooms player tile
						if (playerTile[0] == cellCoords[0] && playerTile[1] == cellCoords[1]) { // If this cell is the player tile
							cell.textContent += ii; // Player ID/char is just it's num/index
							containsPlayer = true;
							let playerValue = previousPlayer % numberOfColours;
							cell.innerHTML = `<img src='https://nrmaultsaid.jalbum.net/Players4KiwiKluedo/slides/player${playerValue}.png' style='width: 50px; height: 50px; object-fit; fill;'/>`;
							// This should really be a similar png, but dark background
						}
					}
					previousPlayer = (state.ctx.numPlayers + previousPlayer - 1) % state.ctx.numPlayers; // Repeat for previous player, ending at current player
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

			// Display minimap
			this.rootElement.querySelector('.minimap').innerHTML = '<tt>' + state.G._roomMap + '</tt><br>';
			for (let ii = 0; ii < state.G._roomList.length; ii++) { // For each room,
				const room = state.G._roomList[ii]; // Get the room
				this.rootElement.querySelector('.minimap').innerHTML += 'Room ID ' + room[0] + ': '; // Display the room ID
				this.rootElement.querySelector('.minimap').innerHTML += state.G._cardsInPlay[1][room[0]] + ' contains '; // Display the number of cards in play
				let playersInRoom = 0; // Count the number of players in the room
				for (let jj = 0; jj < state.G.playerLocations.length; jj++) { // For each player,
					if (state.G.playerLocations[jj][2] == false) { // If the player is not in the room,
						continue; // Skip to the next player
					}
					if (state.G.playerLocations[jj][3] == room[0]) { // If the player is in this room,
						playersInRoom++; // Increment the player count
						this.rootElement.querySelector('.minimap').innerHTML += 'Player ' + jj + ', '; // Display the player num
					}
				}
				if (playersInRoom == 0) { // If there are no players in the room,
					this.rootElement.querySelector('.minimap').innerHTML += 'no players'; // Display "no players"
				}
				this.rootElement.querySelector('.minimap').innerHTML += '<br>';
			}

			// Get the gameover message element. (I THINK THIS IS BROKEN NOW. Untested however)
			const messageEl = this.rootElement.querySelector('.winner');
			// Update the element to show a winner if any.
			if (state.ctx.gameover) {
				messageEl.textContent = 'Winner: ' + state.ctx.gameover.winner;
			} else {
				messageEl.textContent = '';
			}
		}
	}

}

class App {
	constructor(rootElement) {
		this.client = SplashScreen(rootElement).then((credentials) => {
			// resolve in SplashScreen returns a list containing the playerId and matchId
			const playerID = credentials[0];
			const matchID = credentials[1];
			return new TestGameClient(rootElement, { playerID }, { matchID });
		});
	}
}

console.log("Creating App");
const appElement = document.getElementById('app');
new App(appElement);