class PriorityQueue {
    constructor() { this.values = []; }
    enqueue(val, priority) { this.values.push({val, priority}); this.sort(); }
    dequeue() { return this.values.shift(); }
    sort() { this.values.sort((a, b) => a.priority - b.priority); }
    isEmpty() { return this.values.length === 0; }
}

class Graph {
    constructor() {
        this.adjacencyList = {};
        this.cityData = {}; 
        this.blockedEdges = new Set(); 
    }
    
    addCity(name, x, y) {
        if (!this.adjacencyList[name]) {
            this.adjacencyList[name] = [];
            this.cityData[name] = {x, y};
        }
    }
    
    addEdge(c1, c2, dist, time, food, pumps) {
        this.adjacencyList[c1].push({node: c2, dist, time, food, pumps});
        this.adjacencyList[c2].push({node: c1, dist, time, food, pumps});
    }

    toggleEdgeBlock(c1, c2) {
        let edgeId = [c1, c2].sort().join("-");
        if (this.blockedEdges.has(edgeId)) this.blockedEdges.delete(edgeId);
        else this.blockedEdges.add(edgeId);
    }

    heuristic(city1, city2) {
        let p1 = this.cityData[city1];
        let p2 = this.cityData[city2];
        return Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2) * 1.5; 
    }

    findPath(start, finish, criteria, algo = "dijkstra") {
        const nodes = new PriorityQueue();
        const distances = {};
        const previous = {};
        let path = [];
        let visitedOrder = []; 

        for (let city in this.adjacencyList) {
            if (city === start) { distances[city] = 0; nodes.enqueue(city, 0); }
            else { distances[city] = Infinity; nodes.enqueue(city, Infinity); }
            previous[city] = null;
        }

        while (!nodes.isEmpty()) {
            let smallest = nodes.dequeue().val;
            
            if (smallest !== start && smallest !== finish && !visitedOrder.includes(smallest)) {
                visitedOrder.push(smallest);
            }

            if (smallest === finish) {
                while (previous[smallest]) { path.push(smallest); smallest = previous[smallest]; }
                path.push(start);
                return { path: path.reverse(), cost: distances[finish], visited: visitedOrder };
            }

            if (smallest || distances[smallest] !== Infinity) {
                for (let neighbor of this.adjacencyList[smallest]) {
                    let edgeId = [smallest, neighbor.node].sort().join("-");
                    if (this.blockedEdges.has(edgeId)) continue; 

                    let cost = neighbor[criteria]; 
                    let candidate = distances[smallest] + cost;

                    if (candidate < distances[neighbor.node]) {
                        distances[neighbor.node] = candidate;
                        previous[neighbor.node] = smallest;
                        
                        let priority = candidate;
                        if (algo === "astar") priority += this.heuristic(neighbor.node, finish);
                        
                        nodes.enqueue(neighbor.node, priority);
                    }
                }
            }
        }
        return null;
    }
}

// --- INIT DATA ---
const graph = new Graph();
let canvas, ctx, tooltip, isAnimating = false;
let clickState = 0; 
let hoverCityGlobal = null;
let exploringNodesGlobal = [];
let highlightPathGlobal = [];

// Vehicle Animation State
let vehicle = { active: false, progress: 0, pathSegments: [], totalDist: 0 };

graph.addCity("Srinagar", 300, 50); graph.addCity("Shimla", 350, 100);
graph.addCity("Chandigarh", 330, 140); graph.addCity("Delhi", 330, 200);
graph.addCity("Jaipur", 250, 250); graph.addCity("Agra", 380, 240);
graph.addCity("Lucknow", 480, 250); graph.addCity("Varanasi", 550, 290);
graph.addCity("Ahmedabad", 150, 350); graph.addCity("Mumbai", 150, 480);
graph.addCity("Pune", 200, 510); graph.addCity("Goa", 200, 590);
graph.addCity("Bhopal", 360, 350); graph.addCity("Indore", 300, 350);
graph.addCity("Nagpur", 420, 420); graph.addCity("Raipur", 500, 420);
graph.addCity("Patna", 580, 260); graph.addCity("Kolkata", 700, 390);
graph.addCity("Bhubaneswar", 620, 470); graph.addCity("Ranchi", 580, 340);
graph.addCity("Guwahati", 820, 270);
graph.addCity("Hyderabad", 420, 500); graph.addCity("Visakhapatnam", 530, 500);
graph.addCity("Bangalore", 350, 580); graph.addCity("Chennai", 480, 580);
graph.addCity("Kochi", 320, 650); graph.addCity("Thiruvananthapuram", 350, 670);

const routes = [
    ["Srinagar", "Shimla", 400, 12, 8, 4], ["Shimla", "Chandigarh", 110, 4, 3, 2], 
    ["Chandigarh", "Delhi", 245, 4.5, 12, 8], ["Delhi", "Jaipur", 280, 5, 15, 10], 
    ["Delhi", "Agra", 233, 3.5, 10, 6], ["Delhi", "Bhopal", 780, 14, 25, 15],
    ["Jaipur", "Ahmedabad", 675, 11, 22, 14], ["Jaipur", "Indore", 400, 7, 14, 8], 
    ["Agra", "Lucknow", 335, 5, 12, 7], ["Agra", "Bhopal", 530, 9, 18, 12], 
    ["Lucknow", "Varanasi", 320, 6, 11, 6], ["Varanasi", "Patna", 250, 5, 8, 5],
    ["Patna", "Kolkata", 580, 12, 20, 13], ["Patna", "Ranchi", 330, 7, 10, 7], 
    ["Ranchi", "Kolkata", 400, 8, 14, 9], ["Kolkata", "Bhubaneswar", 440, 8.5, 16, 10], 
    ["Kolkata", "Guwahati", 1000, 22, 30, 20], ["Ahmedabad", "Mumbai", 530, 9, 20, 12],
    ["Ahmedabad", "Indore", 390, 7.5, 13, 8], ["Indore", "Bhopal", 190, 3.5, 6, 4], 
    ["Bhopal", "Nagpur", 350, 6, 12, 7], ["Bhopal", "Raipur", 600, 11, 18, 11], 
    ["Mumbai", "Pune", 150, 3, 8, 5], ["Mumbai", "Goa", 590, 11, 19, 12], 
    ["Pune", "Hyderabad", 560, 10, 18, 11], ["Pune", "Bangalore", 840, 14, 28, 18], 
    ["Goa", "Bangalore", 560, 11, 17, 10], ["Goa", "Kochi", 750, 15, 24, 15],
    ["Nagpur", "Hyderabad", 500, 9, 16, 10], ["Nagpur", "Raipur", 280, 5.5, 9, 6], 
    ["Hyderabad", "Bangalore", 570, 9.5, 20, 13], ["Hyderabad", "Chennai", 630, 11, 22, 14],
    ["Hyderabad", "Visakhapatnam", 620, 12, 18, 11], ["Visakhapatnam", "Bhubaneswar", 440, 8, 14, 9], 
    ["Visakhapatnam", "Chennai", 800, 14, 25, 16], ["Bangalore", "Chennai", 350, 6, 12, 8], 
    ["Bangalore", "Kochi", 550, 10, 18, 11], ["Chennai", "Thiruvananthapuram", 770, 14, 26, 16], 
    ["Kochi", "Thiruvananthapuram", 200, 5, 7, 4]
];
routes.forEach(r => graph.addEdge(r[0], r[1], r[2], r[3], r[4], r[5]));

// --- RENDER ENGINE ---
function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let drawnEdges = new Set();
    let time = Date.now();
    let pulse = 15 + Math.sin(time / 200) * 5; // Radar pulse math
    
    // Draw Edges
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
                ctx.strokeStyle = '#FF9933'; ctx.lineWidth = 4;
                ctx.shadowBlur = 10; ctx.shadowColor = '#FF9933'; ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
            }
            ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);

            if(isPath && vehicle.progress >= 1) { // Only show amenities after car finishes driving
                let midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.beginPath(); ctx.roundRect(midX - 35, midY - 12, 70, 24, 12); ctx.fill();
                ctx.strokeStyle = '#FF9933'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
                ctx.fillText(`🍔${neighbor.food} ⛽${neighbor.pumps}`, midX, midY + 4);
                ctx.textAlign = 'left'; 
            }
        });
    }

    // Draw Nodes
    for (let city in graph.cityData) {
        let {x, y} = graph.cityData[city];
        let isStart = city === document.getElementById('startCity').value;
        let isDest = city === document.getElementById('destCity').value;
        let inPath = highlightPathGlobal.includes(city);
        let isExploring = exploringNodesGlobal.includes(city);
        
        // Radar Pulse for Start/End
        if (isStart) {
            ctx.beginPath(); ctx.arc(x, y, pulse, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(46, 204, 113, 0.3)'; ctx.fill();
        } else if (isDest) {
            ctx.beginPath(); ctx.arc(x, y, pulse, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'; ctx.fill();
        }

        ctx.beginPath(); ctx.arc(x, y, city === hoverCityGlobal ? 9 : 6, 0, 2 * Math.PI);
        
        if (isStart) { ctx.fillStyle = '#2ecc71'; ctx.shadowBlur = 15; ctx.shadowColor = '#2ecc71'; }
        else if (isDest) { ctx.fillStyle = '#e74c3c'; ctx.shadowBlur = 15; ctx.shadowColor = '#e74c3c'; }
        else if (inPath) { ctx.fillStyle = '#FF9933'; }
        else if (isExploring) { ctx.fillStyle = '#9b59b6'; ctx.shadowBlur = 10; ctx.shadowColor = '#9b59b6';}
        else { ctx.fillStyle = '#95a5a6'; }

        ctx.fill(); ctx.shadowBlur = 0; 
        ctx.fillStyle = inPath || isStart || isDest ? '#fff' : '#7f8c8d';
        ctx.font = city === hoverCityGlobal ? 'bold 13px Poppins' : '11px Poppins';
        ctx.fillText(city, x + 12, y + 4);
    }

    // Draw Moving Vehicle
    if (vehicle.active) {
        let targetDist = vehicle.progress * vehicle.totalDist;
        let currentDist = 0;
        let carX = 0, carY = 0;

        for (let seg of vehicle.pathSegments) {
            if (currentDist + seg.dist >= targetDist) {
                let segProgress = (targetDist - currentDist) / seg.dist;
                carX = seg.x1 + (seg.x2 - seg.x1) * segProgress;
                carY = seg.y1 + (seg.y2 - seg.y1) * segProgress;
                break;
            }
            currentDist += seg.dist;
        }

        if (carX && carY) {
            ctx.shadowBlur = 15; ctx.shadowColor = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText('🚗', carX - 10, carY + 5);
            ctx.shadowBlur = 0;
            
            // Move car forward
            if (vehicle.progress < 1) {
                vehicle.progress += 0.015; // Speed of car
            }
        }
    }

    requestAnimationFrame(renderFrame); // Loop forever
}

// Math Utils
function distToSegment(px, py, x1, y1, x2, y2) {
    let l2 = (x1 - x2)**2 + (y1 - y2)**2;
    if (l2 === 0) return Math.sqrt((px - x1)**2 + (py - y1)**2);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    let projX = x1 + t * (x2 - x1), projY = y1 + t * (y2 - y1);
    return Math.sqrt((px - projX)**2 + (py - projY)**2);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function animateValue(id, end, suffix="") {
    let obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / 1000, 1);
        obj.innerHTML = Math.floor(progress * end) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// --- CORE ALGORITHM ---
async function startVisualization() {
    if (isAnimating) return;
    const start = document.getElementById('startCity').value;
    const dest = document.getElementById('destCity').value;
    const criteria = document.getElementById('optimizeBy').value;
    const algo = document.getElementById('algoSelect').value;

    if (!start || !dest || start === dest) { alert("Please select two distinct cities."); return; }

    isAnimating = true; clickState = 2;
    document.getElementById('resultBox').style.display = 'none';
    highlightPathGlobal = []; exploringNodesGlobal = [];
    vehicle.active = false; // Reset car

    const result = graph.findPath(start, dest, criteria, algo);

    if (result) {
        // Step 1: Animate node exploration
        for (let i = 0; i < result.visited.length; i++) {
            exploringNodesGlobal.push(result.visited[i]);
            await sleep(algo === 'astar' ? 80 : 40); 
        }

        // Calculate Totals & Setup Vehicle Path
        let totDist = 0, totTime = 0, totFood = 0, totPumps = 0;
        vehicle.pathSegments = [];
        vehicle.totalDist = 0;

        for (let i = 0; i < result.path.length - 1; i++) {
            let edge = graph.adjacencyList[result.path[i]].find(n => n.node === result.path[i+1]);
            totDist += edge.dist; totTime += edge.time; totFood += edge.food; totPumps += edge.pumps;
            
            // Save coordinates for the moving car
            let p1 = graph.cityData[result.path[i]];
            let p2 = graph.cityData[result.path[i+1]];
            let pxDist = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
            vehicle.pathSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, dist: pxDist });
            vehicle.totalDist += pxDist;
        }

        let fuelCost = Math.floor((totDist / 15) * 102); 
        let carbon = Math.floor(totDist * 0.12); 

        exploringNodesGlobal = []; // Clear exploration
        highlightPathGlobal = result.path; // Highlight final route
        window.lastPath = result.path;
        
        // Activate Vehicle Animation
        vehicle.progress = 0;
        vehicle.active = true;
        
        // Show Results
        document.getElementById('resultBox').style.display = 'block';
        animateValue('resDistance', totDist, " km");
        animateValue('resTime', totTime, " hrs");
        animateValue('resCost', fuelCost, " ₹");
        animateValue('resCO2', carbon, " kg");
        animateValue('resAmenities', totFood + totPumps);
        animateValue('resExplored', result.visited.length);
        
        document.getElementById('resPath').innerHTML = result.path.join(" ➝ ");
    } else {
        alert("No route found! Are too many roads blocked?");
        clickState = 0; 
    }
    isAnimating = false;
}

// --- SETUP & LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('graph-canvas');
    ctx = canvas.getContext('2d');
    tooltip = document.getElementById('tooltip');
    canvas.width = 900; canvas.height = 700;

    const startSel = document.getElementById('startCity');
    const destSel = document.getElementById('destCity');
    Object.keys(graph.adjacencyList).sort().forEach(c => {
        startSel.add(new Option(c, c)); destSel.add(new Option(c, c));
    });

    startSel.addEventListener('change', () => clickState = 1);

    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        hoverCityGlobal = null;

        for (let city in graph.cityData) {
            let {x, y} = graph.cityData[city];
            if (Math.sqrt((mx-x)**2 + (my-y)**2) < 15) { hoverCityGlobal = city; break; }
        }

        if (hoverCityGlobal) {
            tooltip.style.left = (e.pageX + 15) + 'px'; tooltip.style.top = (e.pageY + 15) + 'px';
            tooltip.style.display = 'block'; 
            tooltip.innerText = clickState === 0 ? `Set Start: ${hoverCityGlobal}` : `Set Dest: ${hoverCityGlobal}`;
            document.body.style.cursor = 'pointer';
        } else {
            tooltip.style.display = 'none'; document.body.style.cursor = 'default';
        }
    });

    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault(); 
        if(isAnimating) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let clickedEdge = null;
        let minDistance = 10;

        for (let city in graph.adjacencyList) {
            let p1 = graph.cityData[city];
            graph.adjacencyList[city].forEach(n => {
                let p2 = graph.cityData[n.node];
                let d = distToSegment(mx, my, p1.x, p1.y, p2.x, p2.y);
                if (d < minDistance) {
                    minDistance = d; clickedEdge = {c1: city, c2: n.node};
                }
            });
        }

        if (clickedEdge) {
            graph.toggleEdgeBlock(clickedEdge.c1, clickedEdge.c2);
            if (clickState === 2) startVisualization();
        }
    });

    canvas.addEventListener('click', function(e) {
        if(isAnimating) return;
        
        if (clickState === 2) {
            document.getElementById('startCity').value = ""; document.getElementById('destCity').value = "";
            document.getElementById('resultBox').style.display = 'none';
            highlightPathGlobal = []; vehicle.active = false; clickState = 0; return;
        }

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let clickedCity = null;

        for (let city in graph.cityData) {
            if (Math.sqrt((mx-graph.cityData[city].x)**2 + (my-graph.cityData[city].y)**2) < 15) { clickedCity = city; break; }
        }

        if (clickedCity) {
            if (clickState === 0) {
                document.getElementById('startCity').value = clickedCity;
                clickState = 1;
            } else if (clickState === 1) {
                if(document.getElementById('startCity').value === clickedCity) return; 
                document.getElementById('destCity').value = clickedCity;
                startVisualization(); 
            }
        }
    });

    requestAnimationFrame(renderFrame); // Start the engine
});