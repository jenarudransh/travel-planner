class PriorityQueue {
    constructor() { this.values = []; }
    enqueue(val, priority) { this.values.push({val, priority}); this.sort(); }
    dequeue() { return this.values.shift(); }
    sort() { this.values.sort((a, b) => a.priority - b.priority); }
    isEmpty() { return this.values.length === 0; }
}

// --- DYNAMIC WEATHER SYSTEM ---
class WeatherSystem {
    constructor(canvasWidth, canvasHeight) {
        this.storms = [
            { x: 200, y: 300, radius: 80, vx: 0.5, vy: 0.2, type: 'storm' },
            { x: 600, y: 400, radius: 100, vx: -0.3, vy: -0.4, type: 'rain' }
        ];
        this.width = canvasWidth;
        this.height = canvasHeight;
    }

    update() {
        this.storms.forEach(storm => {
            storm.x += storm.vx; storm.y += storm.vy;
            if(storm.x < -100 || storm.x > this.width + 100) storm.vx *= -1;
            if(storm.y < -100 || storm.y > this.height + 100) storm.vy *= -1;
        });
    }

    draw(ctx) {
        this.storms.forEach(storm => {
            let gradient = ctx.createRadialGradient(storm.x, storm.y, 0, storm.x, storm.y, storm.radius);
            gradient.addColorStop(0, storm.type === 'storm' ? 'rgba(52, 73, 94, 0.6)' : 'rgba(41, 128, 185, 0.4)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(storm.x, storm.y, storm.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient; ctx.fill();
        });
    }

    // Mathematical penalty if a road passes through a storm
    getPenaltyMultiplier(x1, y1, x2, y2) {
        let midX = (x1 + x2) / 2; let midY = (y1 + y2) / 2;
        for (let storm of this.storms) {
            let dist = Math.sqrt((midX - storm.x)**2 + (midY - storm.y)**2);
            if (dist < storm.radius) return 1.8; // 80% time penalty for weather
        }
        return 1.0;
    }
}

class Graph {
    constructor() {
        this.adjacencyList = {}; this.cityData = {}; this.blockedEdges = new Set();
    }
    
    addCity(name, x, y) {
        if (!this.adjacencyList[name]) {
            this.adjacencyList[name] = []; this.cityData[name] = {x, y};
        }
    }
    
    // Added 'terrain' multiplier (1 = flat, 1.3 = hilly, 1.8 = mountain)
    addEdge(c1, c2, dist, time, food, pumps, terrain = 1) {
        this.adjacencyList[c1].push({node: c2, dist, time, food, pumps, terrain});
        this.adjacencyList[c2].push({node: c1, dist, time, food, pumps, terrain});
    }

    toggleEdgeBlock(c1, c2) {
        let edgeId = [c1, c2].sort().join("-");
        if (this.blockedEdges.has(edgeId)) this.blockedEdges.delete(edgeId);
        else this.blockedEdges.add(edgeId);
    }

    heuristic(city1, city2) {
        let p1 = this.cityData[city1]; let p2 = this.cityData[city2];
        return Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2) * 1.5; 
    }

    findPath(start, finish, algo = "astar", weatherSys) {
        const nodes = new PriorityQueue();
        const distances = {}; const previous = {};
        let path = []; let visitedOrder = []; 

        for (let city in this.adjacencyList) {
            distances[city] = city === start ? 0 : Infinity;
            nodes.enqueue(city, distances[city]);
            previous[city] = null;
        }

        while (!nodes.isEmpty()) {
            let smallest = nodes.dequeue().val;
            if (smallest !== start && smallest !== finish && !visitedOrder.includes(smallest)) visitedOrder.push(smallest);
            
            if (smallest === finish) {
                while (previous[smallest]) { path.push(smallest); smallest = previous[smallest]; }
                path.push(start);
                return { path: path.reverse(), cost: distances[finish], visited: visitedOrder };
            }

            if (smallest || distances[smallest] !== Infinity) {
                for (let neighbor of this.adjacencyList[smallest]) {
                    let edgeId = [smallest, neighbor.node].sort().join("-");
                    if (this.blockedEdges.has(edgeId)) continue; 

                    // --- ADVANCED MATH: Base Time * Terrain * Weather ---
                    let p1 = this.cityData[smallest]; let p2 = this.cityData[neighbor.node];
                    let weatherPenalty = weatherSys.getPenaltyMultiplier(p1.x, p1.y, p2.x, p2.y);
                    let actualTimeCost = neighbor.time * neighbor.terrain * weatherPenalty;
                    
                    let candidate = distances[smallest] + actualTimeCost;

                    if (candidate < distances[neighbor.node]) {
                        distances[neighbor.node] = candidate;
                        previous[neighbor.node] = smallest;
                        let priority = candidate + (algo === "astar" ? this.heuristic(neighbor.node, finish) : 0);
                        nodes.enqueue(neighbor.node, priority);
                    }
                }
            }
        }
        return null;
    }
}

// --- INIT DATA & ENGINE ---
const graph = new Graph();
const weatherSystem = new WeatherSystem(900, 700);
let canvas, ctx, isAnimating = false;
let highlightPathGlobal = [], exploringNodesGlobal = [];
let vehicle = { active: false, progress: 0, pathSegments: [], totalDist: 0 };

// MASSIVE GRAPH EXPANSION
const cities = [
    ["Srinagar",300,50], ["Shimla",350,100], ["Chandigarh",330,140], ["Delhi",330,200],
    ["Jaipur",250,250], ["Agra",380,240], ["Lucknow",480,250], ["Varanasi",550,290],
    ["Ahmedabad",150,350], ["Mumbai",150,480], ["Pune",200,510], ["Goa",200,590],
    ["Bhopal",360,350], ["Indore",300,350], ["Nagpur",420,420], ["Raipur",500,420],
    ["Patna",580,260], ["Kolkata",700,390], ["Bhubaneswar",620,470], ["Ranchi",580,340],
    ["Guwahati",820,270], ["Hyderabad",420,500], ["Visakhapatnam",530,500], ["Bangalore",350,580],
    ["Chennai",480,580], ["Kochi",320,650], ["Trivandrum",350,670],
    // New Cities
    ["Jodhpur", 180, 240], ["Udaipur", 200, 290], ["Surat", 140, 410], 
    ["Mangalore", 240, 620], ["Madurai", 420, 660], ["Coimbatore", 370, 620],
    ["Mysore", 320, 600], ["Vijayawada", 500, 520], ["Kanpur", 440, 250],
    ["Siliguri", 710, 260], ["Shillong", 830, 290]
];
cities.forEach(c => graph.addCity(c[0], c[1], c[2]));

// Format: [City1, City2, Dist, Time, Food, Pumps, Terrain(1=Flat, 1.5=Hilly, 2=Mountain)]
const routes = [
    ["Srinagar", "Shimla", 400, 12, 8, 4, 2.0], ["Shimla", "Chandigarh", 110, 4, 3, 2, 1.8], 
    ["Chandigarh", "Delhi", 245, 4.5, 12, 8, 1.0], ["Delhi", "Jaipur", 280, 5, 15, 10, 1.0], 
    ["Delhi", "Agra", 233, 3.5, 10, 6, 1.0], ["Delhi", "Kanpur", 500, 8, 15, 12, 1.0],
    ["Kanpur", "Lucknow", 90, 2, 5, 4, 1.0], ["Agra", "Kanpur", 280, 5, 10, 7, 1.0],
    ["Jaipur", "Jodhpur", 330, 6, 8, 5, 1.2], ["Jodhpur", "Udaipur", 250, 5, 6, 4, 1.5],
    ["Udaipur", "Ahmedabad", 260, 5, 10, 7, 1.2], ["Jaipur", "Ahmedabad", 675, 11, 22, 14, 1.0], 
    ["Ahmedabad", "Surat", 260, 4.5, 12, 8, 1.0], ["Surat", "Mumbai", 280, 5, 15, 10, 1.0],
    ["Mumbai", "Pune", 150, 3, 8, 5, 1.5], ["Pune", "Goa", 450, 9, 15, 10, 1.6], 
    ["Goa", "Mangalore", 360, 7, 10, 6, 1.2], ["Mangalore", "Kochi", 420, 8, 12, 8, 1.0],
    ["Kochi", "Trivandrum", 200, 5, 7, 4, 1.0], ["Kochi", "Coimbatore", 190, 4, 8, 5, 1.5],
    ["Coimbatore", "Madurai", 210, 4.5, 9, 6, 1.0], ["Madurai", "Trivandrum", 300, 6, 10, 7, 1.0],
    ["Madurai", "Chennai", 460, 8, 18, 12, 1.0], ["Bangalore", "Mysore", 150, 3, 10, 6, 1.0],
    ["Mysore", "Coimbatore", 200, 4.5, 8, 5, 1.5], ["Bangalore", "Chennai", 350, 6, 12, 8, 1.0], 
    ["Pune", "Hyderabad", 560, 10, 18, 11, 1.0], ["Hyderabad", "Vijayawada", 270, 5, 10, 6, 1.0],
    ["Vijayawada", "Visakhapatnam", 350, 7, 12, 8, 1.0], ["Visakhapatnam", "Bhubaneswar", 440, 8, 14, 9, 1.0],
    ["Bhubaneswar", "Kolkata", 440, 8.5, 16, 10, 1.0], ["Kolkata", "Siliguri", 580, 12, 18, 12, 1.0],
    ["Siliguri", "Guwahati", 430, 9, 12, 8, 1.2], ["Guwahati", "Shillong", 100, 3, 5, 3, 2.0],
    ["Lucknow", "Varanasi", 320, 6, 11, 6, 1.0], ["Varanasi", "Patna", 250, 5, 8, 5, 1.0],
    ["Patna", "Ranchi", 330, 7, 10, 7, 1.2], ["Ranchi", "Kolkata", 400, 8, 14, 9, 1.0],
    ["Bhopal", "Indore", 190, 3.5, 6, 4, 1.0], ["Bhopal", "Nagpur", 350, 6, 12, 7, 1.0], 
    ["Nagpur", "Raipur", 280, 5.5, 9, 6, 1.0], ["Raipur", "Bhubaneswar", 530, 11, 15, 10, 1.2],
    ["Nagpur", "Hyderabad", 500, 9, 16, 10, 1.0], ["Indore", "Ahmedabad", 390, 7.5, 13, 8, 1.0]
];
routes.forEach(r => graph.addEdge(r[0], r[1], r[2], r[3], r[4], r[5], r[6]));

// --- RENDER ENGINE ---
function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    weatherSystem.update();
    
    let drawnEdges = new Set();
    
    // Draw Roads
    for (let city in graph.adjacencyList) {
        let {x: x1, y: y1} = graph.cityData[city];
        graph.adjacencyList[city].forEach(neighbor => {
            let {x: x2, y: y2} = graph.cityData[neighbor.node];
            let edgeId = [city, neighbor.node].sort().join("-");
            if (drawnEdges.has(edgeId)) return;
            drawnEdges.add(edgeId);

            let isBlocked = graph.blockedEdges.has(edgeId);
            let isPath = false;
            for(let i=0; i<highlightPathGlobal.length-1; i++) {
                if((highlightPathGlobal[i]===city && highlightPathGlobal[i+1]===neighbor.node) || 
                   (highlightPathGlobal[i]===neighbor.node && highlightPathGlobal[i+1]===city)) isPath = true;
            }

            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            
            if (isBlocked) {
                ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); 
            } else if(isPath) {
                ctx.strokeStyle = '#FF9933'; ctx.lineWidth = 4; ctx.shadowBlur = 10; ctx.shadowColor = '#FF9933'; ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.2; ctx.setLineDash([]);
            }
            ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
        });
    }

    weatherSystem.draw(ctx); // Draw Weather over roads, under nodes

    // Draw Nodes
    for (let city in graph.cityData) {
        let {x, y} = graph.cityData[city];
        let isStart = city === document.getElementById('startCity').value;
        let isDest = city === document.getElementById('destCity').value;
        let isWaypoint = city === document.getElementById('waypointCity').value && document.getElementById('waypointContainer').style.display !== 'none';
        let inPath = highlightPathGlobal.includes(city);
        let isExploring = exploringNodesGlobal.includes(city);
        
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI);
        
        if (isStart) { ctx.fillStyle = '#2ecc71'; ctx.shadowBlur = 15; ctx.shadowColor = '#2ecc71'; }
        else if (isDest) { ctx.fillStyle = '#e74c3c'; ctx.shadowBlur = 15; ctx.shadowColor = '#e74c3c'; }
        else if (isWaypoint) { ctx.fillStyle = '#f39c12'; ctx.shadowBlur = 15; ctx.shadowColor = '#f39c12'; }
        else if (inPath) { ctx.fillStyle = '#FF9933'; }
        else if (isExploring) { ctx.fillStyle = '#9b59b6'; ctx.shadowBlur = 10; ctx.shadowColor = '#9b59b6';}
        else { ctx.fillStyle = '#7f8c8d'; }

        ctx.fill(); ctx.shadowBlur = 0; 
        ctx.fillStyle = inPath || isStart || isDest || isWaypoint ? '#fff' : '#95a5a6';
        ctx.font = '10px Poppins';
        ctx.fillText(city, x + 10, y + 4);
    }

    // Car Animation
    if (vehicle.active) {
        let targetDist = vehicle.progress * vehicle.totalDist;
        let currentDist = 0; let carX = 0, carY = 0;
        for (let seg of vehicle.pathSegments) {
            if (currentDist + seg.dist >= targetDist) {
                let segProgress = (targetDist - currentDist) / seg.dist;
                carX = seg.x1 + (seg.x2 - seg.x1) * segProgress;
                carY = seg.y1 + (seg.y2 - seg.y1) * segProgress; break;
            }
            currentDist += seg.dist;
        }
        if (carX && carY) {
            ctx.shadowBlur = 15; ctx.shadowColor = '#fff'; ctx.font = '16px Arial';
            ctx.fillText('🚗', carX - 8, carY + 4); ctx.shadowBlur = 0;
            if (vehicle.progress < 1) vehicle.progress += 0.012; 
        }
    }
    requestAnimationFrame(renderFrame);
}

// --- UTILS & EXECUTION ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

function toggleWaypoint() {
    let wp = document.getElementById('waypointContainer');
    let btn = document.getElementById('addWaypointBtn');
    if (wp.style.display === 'none') {
        wp.style.display = 'block'; btn.innerText = '- Remove Stop';
    } else {
        wp.style.display = 'none'; btn.innerText = '+ Add Mandatory Stop';
        document.getElementById('waypointCity').value = '';
    }
}

function animateValue(id, end, suffix="") {
    let obj = document.getElementById(id); let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / 1000, 1);
        obj.innerHTML = Math.floor(progress * end) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

async function startVisualization() {
    if (isAnimating) return;
    const start = document.getElementById('startCity').value;
    const dest = document.getElementById('destCity').value;
    const wp = document.getElementById('waypointCity').value;
    const algo = document.getElementById('algoSelect').value;
    const useWP = document.getElementById('waypointContainer').style.display !== 'none' && wp !== '';

    if (!start || !dest || start === dest) { alert("Invalid Start/Dest cities."); return; }
    if (useWP && (wp === start || wp === dest)) { alert("Waypoint must be different from Start/Dest."); return; }

    isAnimating = true; document.getElementById('resultBox').style.display = 'none';
    highlightPathGlobal = []; exploringNodesGlobal = []; vehicle.active = false;

    // Run TSP Chaining if Waypoint exists
    let segments = [];
    if (useWP) {
        let res1 = graph.findPath(start, wp, algo, weatherSystem);
        let res2 = graph.findPath(wp, dest, algo, weatherSystem);
        if(!res1 || !res2) { alert("Path blocked!"); isAnimating=false; return; }
        // Merge paths (remove duplicate waypoint node at join)
        res2.path.shift();
        segments = [{path: res1.path, visited: res1.visited}, {path: res2.path, visited: res2.visited}];
    } else {
        let res = graph.findPath(start, dest, algo, weatherSystem);
        if(!res) { alert("Path blocked!"); isAnimating=false; return; }
        segments = [res];
    }

    // Animate Exploration
    let finalPath = []; let totalExplored = 0;
    for (let seg of segments) {
        for (let i = 0; i < seg.visited.length; i++) {
            exploringNodesGlobal.push(seg.visited[i]);
            await sleep(algo === 'astar' ? 40 : 15); 
        }
        finalPath = finalPath.concat(seg.path);
        totalExplored += seg.visited.length;
    }

    // Calculate Economics based on Terrain
    let totDist = 0, totTime = 0, totFood = 0, totPumps = 0, fuelCost = 0;
    vehicle.pathSegments = []; vehicle.totalDist = 0;

    for (let i = 0; i < finalPath.length - 1; i++) {
        let edge = graph.adjacencyList[finalPath[i]].find(n => n.node === finalPath[i+1]);
        totDist += edge.dist; 
        totTime += (edge.time * edge.terrain * weatherSystem.getPenaltyMultiplier(graph.cityData[finalPath[i]].x, graph.cityData[finalPath[i]].y, graph.cityData[finalPath[i+1]].x, graph.cityData[finalPath[i+1]].y));
        totFood += edge.food; totPumps += edge.pumps;
        
        // Terrain affects fuel! Mountains cost 50% more fuel
        fuelCost += (edge.dist / 15) * 102 * edge.terrain;

        let p1 = graph.cityData[finalPath[i]]; let p2 = graph.cityData[finalPath[i+1]];
        let pxDist = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
        vehicle.pathSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, dist: pxDist });
        vehicle.totalDist += pxDist;
    }

    exploringNodesGlobal = []; highlightPathGlobal = finalPath;
    vehicle.progress = 0; vehicle.active = true;
    
    document.getElementById('resultBox').style.display = 'block';
    animateValue('resDistance', totDist, " km");
    animateValue('resTime', totTime, " hrs");
    animateValue('resCost', fuelCost, " ₹");
    animateValue('resCO2', totDist * 0.12, " kg");
    animateValue('resAmenities', totFood + totPumps);
    animateValue('resExplored', totalExplored);
    
    document.getElementById('resPath').innerHTML = finalPath.join(" ➝ ");
    isAnimating = false;
}

// SETUP
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('graph-canvas'); ctx = canvas.getContext('2d');
    canvas.width = 900; canvas.height = 700;

    const startSel = document.getElementById('startCity');
    const destSel = document.getElementById('destCity');
    const wpSel = document.getElementById('waypointCity');
    Object.keys(graph.adjacencyList).sort().forEach(c => {
        startSel.add(new Option(c, c)); destSel.add(new Option(c, c)); wpSel.add(new Option(c,c));
    });

    requestAnimationFrame(renderFrame);
});