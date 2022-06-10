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
				resolve(returnValue)
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
		this.rootElement.innerHTML +=`<p class="winner"></p>`;
		
		//create and draw checkboxs for rooms
		for (let ii = 0; ii < state.G._roomList.length; ii++) {//for each room in the room in game
			const room = state.G._roomList[ii]; // Get the room
			this.rootElement.innerHTML += `<p> ${ii}</p>`
			//player locations for loop
			for (let i = 0; i < state.G.playerLocations.length; i++){ //for each player on the board 
				this.rootElement.innerHTML += `<input type="checkbox" id=${i}></input>` //Draw a checkbox for each room in game
			}
			//this.rootElement.innerHTML += `<p>Room: ${ii}</p>`; //Write the ID for each room next to the checkbox 
			//<br> to add a new line 
		}
		
	 }
	attachListeners() {
		console.log("Attaching listeners");
		// Attach the evenit listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');

		// This event handler will read the cell id from a cell’s `data-id` attribute and make the `clickCell` move.
		const handleCellClick = event => {
			const id = parseInt(event.target.dataset.id, 10);
			console.log("Cell id: " + id);
			this.client.moves.clickCell(id);
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

		if (!InitialMapGenerated) { // Create cells on the screen on first update
			this.createBoard(state);
			this.attachListeners();
			InitialMapGenerated = true;
			this.createCheckBox();
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

class App {
	constructor(rootElement) {
		this.client = SplashScreen(rootElement).then((credentials) => {
			// resolve in SplashScreen returns a list containing the playerId and matchId
			const playerID = credentials[0];
			const matchID = credentials[1];
			return new TestGameClient(rootElement, { playerID }, {matchID});
	  });
	}
}

console.log("Creating App");
const appElement = document.getElementById('app');
new App(appElement);


