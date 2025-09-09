// Contains all top-level code for now
// We may want to move some of the logic to a separate file later on

import { Camera, addCameraListeners, mergeLeft } from "./camera.mjs";
import { Equirectangular, SphereMercator } from "./cartography.mjs";
import { addSearchbarListeners, addRouteSearch } from "./searchbar.mjs";
import { setupAutofill } from "./autofill.mjs";
import { roomData, buildingCoords } from "./features.mjs";
//space added 
const ctx = $("#canvas")[0].getContext("2d");
const camera = new Camera(ctx);

addCameraListeners(camera);
addSearchbarListeners(camera);

const mercator = new SphereMercator({
	b: {x: 2281, y: 1648, latitude: 37.3583333333, longitude: -120.441666667},
	c: {x: 4708, y: 1648, latitude: 37.3583333333, longitude: -120.408333333}
});
window.mercator = mercator;

const roomTextStyle = {
	fillStyle: "white",
	strokeStyle: "black",
	lineWidth: 4,
	font: "24px Arial",
	textAlign: "center"
};
const bigTextStyle = {
	fillStyle: "white",
	strokeStyle: "black",
	lineWidth: 8,
	font: "50px Arial",
	textAlign: "center"
};

let currentRoute = null; 

//This keeps the width consistent while zooming
function px(n){
	return n / (camera.affine?.scaleFactor || 1);
}

function drawRoutePath(path){
	if (!path || path.length < 2){
		return; 
	}

	//This ensures we have coordinates for all nodes on the path
	for (const node of path){
		if(!nodeCoords[node]){
			return; 
		}
	}

	ctx.save();
  	ctx.setLineDash([]);
  	ctx.globalAlpha = 1;

  	ctx.lineWidth = Math.max(3, px(8));
  	ctx.strokeStyle = "#28a745";
  	ctx.lineJoin = "round";
  	ctx.lineCap = "round";

	ctx.beginPath(); 
	const p0 = nodeCoords[path[0]];
	ctx.moveTo(p0.x, p0.y);
	for ( let i = 1; i < path.length; i++){
		const p = nodeCoords[path[i]];
		ctx.lineTo(p.x, p.y);
	}
	ctx.stroke(); 

	const rMid = Math.max(3, px(6));
  	ctx.fillStyle = "#28a745";
  	ctx.strokeStyle = "#ffffff";
  	ctx.lineWidth = Math.max(1, px(2));

  	for (let i = 1; i < path.length - 1; i++) {
    	const p = nodeCoords[path[i]];
    	ctx.beginPath();
    	ctx.arc(p.x, p.y, rMid, 0, Math.PI * 2);
    	ctx.fill();
    	ctx.stroke();
  	}

	//Start/end markers
	const rEnd = Math.max(6, px(10));
	ctx.fillStyle = "#ffffff";
	ctx.strokeStyle = "#28a745";
	ctx.lineWidth = Math.max(2, px(2));

	const endpoints = [path[0], path[path.length - 1]];
	for ( const node of endpoints){
		const p = nodeCoords[node];
		ctx.beginPath();
		ctx.arc(p.x, p.y, rEnd, 0, Math.PI * 2);
		ctx.fill(); 
		ctx.stroke();
	}

	ctx.restore();
}

function draw() {
	ctx.resetTransform();
	ctx.fillStyle = "white";
	// Multiply size by 2 as quick hack to prevent hall of mirrors effect
	ctx.fillRect(0, 0, 2 * document.body.offsetWidth, 2 * document.body.offsetHeight);
	camera.refreshTransform();
	// TODO Move the logic for this call to camera for abstraction
	ctx.drawImage($("#background-map")[0], 0, 0);
	
	drawRoutePath(currentRoute);


	// Feel free to experiment by adding some canvas draw calls here
	// Here, I use the mercator object to convert my latitude and longitude
	// into a format that ctx can understand
	let [x1, y1] = mercator.f(37.358, -120.44);
	let [x2, y2] = mercator.f(37.357, -120.45);
	if (camera.affine.scaleFactor > 2.4) {
		mergeLeft(ctx, roomTextStyle);
		for (const building in roomData) {
			let floor = roomData[building]["floor" + camera.floor] ?? roomData[building][roomData[building].main];
			floor.forEach(([x, y, s]) => camera.writeText(s, x, y));
		}
	} else {
		mergeLeft(ctx, bigTextStyle);
		if (camera.affine.scaleFactor < 0.95) {
			ctx.font = "24px Arial";
		}
		for (const building in buildingCoords) {
			camera.writeText(building, ...buildingCoords[building]);
		}
	}
}

function resize() {
	ctx.canvas.width = window.innerWidth;
	ctx.canvas.height = window.innerHeight;
}

$(window).on("resize", function (e) {
	resize();
	draw();
});

resize();
draw();
setupAutofill();

// Debugging help
window.draw = draw;
window.camera = camera;
window.compass = compass;

window.logClicks = true;

$(window).on("click", function (event) {
	if (logClicks) {
		let [x, y] = [event.offsetX, event.offsetY];
		let [worldX, worldY] = camera.screenToWorld(x, y);
		let [lat, lon] = mercator.r(worldX, worldY);
		console.log("lat, lon:", lat, lon, "worldX, worldY:", worldX, worldY, "screenX, screenY:", x, y);
	}
});

//Graph of the nodes
const graph = {
	"admin": {"t1": 90, "pav": 220},
	"t1": {"admin": 90, "t2": 150},
	"t2": {"t1": 150, "t3": 220},
	"t3": {"t2": 220, "t6": 60, "pav": 175},
	"t4": {"t6": 180, "cob2": 90, "cob1": 100},
	"cob1": {"t4": 100, "se1": 90},
	"cob2": {"t4": 90},
	"pav": {"admin": 220, "t3": 175, "acs": 60},
	"acs": {"pav": 60, "sre": 70, "t6": 175},
	"t6": {"t3": 60, "acs": 175, "t4": 180},
	"sre": {"bsp": 40, "t7": 150},
	"bsp": {"sre": 40},
	"t7": {"sre": 150, "se1": 120, "se2": 45},
	"se1": {"t7": 120, "cob1": 90, "se2": 65},
	"se2": {"t7": 45, "se1": 65},
	};

const nodeCoords = {
	admin: { x: 1503, y: 2193 },
	cob2: { x: 685, y: 1894 },
	cob1: { x: 703, y: 1738 },
	acs: { x: 1229, y: 1864 },
	bsp: { x: 1124, y: 1775 },
	se1: { x: 798, y: 1633 },
	se2: { x: 875, y: 1558 },
	pav: { x: 1272, y: 1937 },
	sre: { x: 1060, y: 1821},
	t1: { x: 1562, y: 2370 },
	t2: { x: 1314, y: 2368 },
	t3: { x: 1081, y: 2121 },
	t4: { x: 804, y: 1816 },
	t5: { x: 1280, y: 1940 },
	t6: { x: 1023, y: 2054 },
	t7: { x: 940, y: 1638 },

}

//Dijkstra's algorithm
function dijkstra(graph, start, end){
	let pq = [[0, start, []]];
	let visited = new Set(); 

	while (pq.length > 0){
		pq.sort((a, b) => a[0] - b[0]);
		let [dist, current, path] = pq.shift();
		if (visited.has(current)) continue; 
		visited.add(current);
		path = [...path, current];

		if (current === end) return {distance: dist, path};

		for (let neighbor in graph[current]) {
			if (!visited.has(neighbor)){
				pq.push([dist + graph[current][neighbor], neighbor, path]);
			}
		}
	}
	return {distance: "N/A", path: [] };
}

function findRoute(start, end){

	const alias = {
		"Administration Building": "admin",
    	"Classroom Office Building 1": "cob1",
    	"Classroom Office Building 2": "cob2",
    	"Arts and Computational Sciences Building": "acs",
    	"Biomedical Sciences and Physics Building": "bsp",
		"Pavillion": "pav",
		"Sustainability Research & Engineering Building": "sre",
	};

	const s = alias[start] || start; 
	const e = alias[end] || end; 

	const result = dijkstra(graph, s, e);
	currentRoute = result.path && result.path.length ? result.path : null;

	document.getElementById("output").innerText = 
	    result.path.length
			? `Shortest path: ${result.path.join(" -> ")} (Distance: ${result.distance})`
			: `No route found from "${start}" to "${end}".`;

	draw(); 

}

window.findRoute = findRoute; 