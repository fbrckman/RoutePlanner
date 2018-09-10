class WebWorker {
  
  nodes;
  searchDelay = 0;   // in milliseconds

  nodeCoords(nodeID) {
    const node = this.nodes[nodeID];
    return [node.lat, node.lon];
  }

  adjNodes(nodeID) {
    const node = this.nodes[nodeID];
    return node.adj;
  }

  distLatLon(latlonA, latlonB) {
    return Math.sqrt(Math.pow(latlonB[0] - latlonA[0], 2) + Math.pow(latlonB[1] - latlonA[1], 2));
  }

  distNodes(nodeA, nodeB) {
    return this.distLatLon(this.nodeCoords(nodeA), this.nodeCoords(nodeB));
  }

  reconstructPath(cameFrom, currentNode) {
    if (currentNode in cameFrom) {
      return this.reconstructPath(cameFrom, cameFrom[currentNode]).concat(currentNode);
    } else {
      return [currentNode];
    }
  }

  // From http://stackoverflow.com/a/12646864/2811887
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  addStartFlag(coords) {
    self.postMessage({task: 'addStartFlag', coords: coords});
  }

  addGoalFlag(coords) {
    self.postMessage({task: 'addGoalFlag', coords: coords});
  }

  displayNode(coords) {
    self.postMessage({task: 'displayNode', coords: coords});
  }

  noPathFound() {
    self.postMessage({task: 'noPathFound'});
  }

  pathFound(nodes) {
    self.postMessage({task: 'pathFound', path: nodes});
  }

  updateLegend(nodes, progress) {
    self.postMessage({task: 'updateLegend', nodes: nodes, progress: progress});
  }

  astar(start, goal) {
    const self = this;
    this.addStartFlag(self.nodeCoords(start));
    this.addGoalFlag(self.nodeCoords(goal));
    const closedSet = {}, openSet = {};
    openSet[start] = true;
    let openSetCount = 1, totalNodesSeen = 1, cameFrom = {}, progress = 0;

    const gScore = {};
    gScore[start] = 0;

    const fScore = {};
    fScore[start] = gScore[start] + distNodes(start, goal);

    let whileLoop;

    let algo = function () {
      if (openSetCount < 1) {
        clearInterval(whileLoop);
        let looping = false;
        self.noPathFound();
        return;
      }
      const openSetUnsorted = [];
      for (const k in openSet) openSetUnsorted.push(k);
      const openSetSortedF = openSetUnsorted.sort(function (a, b) {
        return fScore[a] - fScore[b];
      });
      const current = openSetSortedF[0];

      self.displayNode(self.nodeCoords(current));

      const currProgress = (1 - self.distNodes(current, goal) / self.distNodes(start, goal)) * 100;
      if (currProgress > progress) {
        progress = currProgress;
      }
      self.updateLegend(totalNodesSeen, progress);
      if (current === goal) {
        clearInterval(whileLoop);
        let looping = false;
        const path = self.reconstructPath(cameFrom, goal);
        const pathCoords = path.map(nodeCoords);
        self.pathFound(pathCoords);
        self.updateLegend(totalNodesSeen, 100);
        return;
      }

      delete openSet[current];
      openSetCount--;
      totalNodesSeen++;
      closedSet[current] = true;
      const adj = self.adjNodes(current);
      for (let i = 0; i < adj.length; i++) {
        const neighbor = adj[i];
        if (neighbor in closedSet) {
          continue;
        }
        const tentativeGScore = gScore[current] + self.distNodes(current, neighbor);
        if (!(neighbor in openSet) || tentativeGScore < gScore[neighbor]) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentativeGScore;
          fScore[neighbor] = gScore[neighbor] + self.distNodes(neighbor, goal);
          if (!(neighbor in openSet)) {
            openSet[neighbor] = true;
            openSetCount++;
          }
        }
      }
    };

    if (this.searchDelay < 0) {
      let looping = true;
      whileLoop = 0;
      while (looping) {
        algo();
      }
    } else {
      whileLoop = setInterval(algo, this.searchDelay);
    }
  }

  bfs(start, goal) {
    const self = this;

    this.addStartFlag(this.nodeCoords(start));
    this.addGoalFlag(this.nodeCoords(goal));

    const closedSet = {}, openSet = {};
    openSet[start] = true;
    let openSetCount = 1, totalNodesSeen = 1;
    const cameFrom = {};
    let progress = 0;

    const gScore = {};
    gScore[start] = 0;

    const fScore = {};
    fScore[start] = gScore[start];

    let whileLoop;

    const algo = function () {
      if (openSetCount < 1) {
        clearInterval(whileLoop);
        let looping = false;
        self.noPathFound();
        return;
      }
      const openSetUnsorted = [];
      for (let k in openSet) openSetUnsorted.push(k);
       const openSetSortedF = openSetUnsorted.sort(function (a, b) {
        return fScore[a] - fScore[b];
      });
      const current = openSetSortedF[0];
      self.displayNode(self.nodeCoords(current));

      const currProgress = (1 - self.distNodes(current, goal) / self.distNodes(start, goal)) * 100;
      if (currProgress > progress) {
        progress = currProgress;
      }
      self.updateLegend(totalNodesSeen, progress);

      if (current === goal) {
        clearInterval(whileLoop);
        let looping = false;
        const path = self.reconstructPath(cameFrom, goal);
        const pathCoords = path.map(self.nodeCoords);
        self.pathFound(pathCoords);
        self.updateLegend(totalNodesSeen, 100);
        return;
      }

      delete openSet[current];
      openSetCount--;
      closedSet[current] = true;
      const adj = self.adjNodes(current);
      self.shuffleArray(adj);
      for (let i = 0; i < adj.length; i++) {
        const neighbor = adj[i];
        if (neighbor in closedSet) {
          continue;
        }
        totalNodesSeen++;
        const tentativeGScore = gScore[current] + self.distNodes(current, neighbor);
        if (!(neighbor in openSet) || tentativeGScore < gScore[neighbor]) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentativeGScore;
          fScore[neighbor] = gScore[neighbor];
          if (!(neighbor in openSet)) {
            openSet[neighbor] = true;
            openSetCount++;
          }
        }
      }
    };

    if (self.searchDelay < 0) {
      let looping = true;
      whileLoop = 0;
      while (looping) {
        algo();
      }
    } else {
      whileLoop = setInterval(algo, self.searchDelay);
    }
  }



  gbfs(start, goal) {
    const self = this;

    this.addStartFlag(this.nodeCoords(start));
    this.addGoalFlag(this.nodeCoords(goal));
    const closedSet = {};
    const openSet = {};
    openSet[start] = true;
    let openSetCount = 1;
    let totalNodesSeen = 1;
    const cameFrom = {};
    let progress = 0;

    const fScore = {};
    fScore[start] = this.distNodes(start, goal);

    let whileLoop;

    const algo = function () {
      if (openSetCount < 1) {
        clearInterval(whileLoop);
        let looping = false;
        self.noPathFound();
        return;
      }
      const openSetUnsorted = [];
      for (let k in openSet) openSetUnsorted.push(k);
       const openSetSortedF = openSetUnsorted.sort(function (a, b) {
        return fScore[a] - fScore[b];
      });
      const current = openSetSortedF[0];
      self.displayNode(self.nodeCoords(current));

      const currProgress = (1 - self.distNodes(current, goal) / self.distNodes(start, goal)) * 100;
      if (currProgress > progress) {
        progress = currProgress;
      }
      self.updateLegend(totalNodesSeen, progress);

      if (current === goal) {
        clearInterval(whileLoop);
        let looping = false;
        const path = self.reconstructPath(cameFrom, goal);
        const pathCoords = path.map(self.nodeCoords);
        self.pathFound(pathCoords);
        self.updateLegend(totalNodesSeen, 100);
        return;
      }

      delete openSet[current];
      openSetCount--;
      closedSet[current] = true;
       adj = adjNodes(current);
      for ( i = 0; i < adj.length; i++) {
         neighbor = adj[i];
        if (neighbor in closedSet) {
          continue;
        }
        totalNodesSeen++;
        if (!(neighbor in openSet)) {
          cameFrom[neighbor] = current;
          fScore[neighbor] = distNodes(neighbor, goal);
          if (!(neighbor in openSet)) {
            openSet[neighbor] = true;
            openSetCount++;
          }
        }
      }

    };

    if (searchDelay < 0) {
       looping = true;
      whileLoop = 0;
      while (looping) {
        algo();
      }
    } else {
      whileLoop = setInterval(algo, searchDelay);
    }
  }



  ucs(start, goal) {
    addStartFlag(nodeCoords(start));
    addGoalFlag(nodeCoords(goal));
     openList = [];
    openList.push(start);
     closedSet = {};
    closedSet[start] = true;
     cameFrom = {};
     totalNodesSeen = 1;
     progress = 0;

     whileLoop;

     algo = function () {
      if (openList.length < 1) {
        clearInterval(whileLoop);
        looping = false;
        noPathFound();
        return;
      }
       current = openList.shift();

      displayNode(nodeCoords(current));

       currProgress = (1 - distNodes(current, goal) / distNodes(start, goal)) * 100;
      if (currProgress > progress) {
        progress = currProgress;
      }
      updateLegend(totalNodesSeen, progress);

      if (current == goal) {
        clearInterval(whileLoop);
        looping = false;
         path = reconstructPath(cameFrom, goal);
         pathCoords = path.map(nodeCoords);
        pathFound(pathCoords);
        updateLegend(totalNodesSeen, 100);
        return;
      }
       adj = adjNodes(current).filter(function (node) {
        return !(node in closedSet);
      });
      shuffleArray(adj);
      adj.forEach(function (node) {
        cameFrom[node] = current;
        closedSet[node] = true;
        totalNodesSeen++;
      });

      openList = openList.concat(adj);
    };

    if (searchDelay < 0) {
       looping = true;
      whileLoop = 0;
      while (looping) {
        algo();
      }
    } else {
      whileLoop = setInterval(algo, searchDelay);
    }
  }



  dfs(start, goal) {
    addStartFlag(nodeCoords(start));
    addGoalFlag(nodeCoords(goal));
     openList = [];
    openList.push(start);
     closedSet = {};
    closedSet[start] = true;
     cameFrom = {};
     totalNodesSeen = 1;
     progress = 0;

     whileLoop;

     algo = function () {
      if (openList.length < 1) {
        setInterval(whileLoop);
        noPathFound();
        return;
      }
       current = openList.pop();
      closedSet[current] = true;

      displayNode(nodeCoords(current));

       currProgress = (1 - distNodes(current, goal) / distNodes(start, goal)) * 100;
      if (currProgress > progress) {
        progress = currProgress;
      }
      updateLegend(totalNodesSeen, progress);

      if (current == goal) {
        clearInterval(whileLoop);
        looping = false;
         path = reconstructPath(cameFrom, goal);
         pathCoords = path.map(nodeCoords);
        pathFound(pathCoords);
        updateLegend(totalNodesSeen, 100);
        return;
      }
       adj = adjNodes(current).filter(function (node) {
        return !(node in closedSet);
      });
      shuffleArray(adj);
      adj.forEach(function (node) {
        cameFrom[node] = current;
        totalNodesSeen++;
      });

      openList = openList.concat(adj);
    };

    if (searchDelay < 0) {
       looping = true;
      whileLoop = 0;
      while (looping) {
        algo();
      }
    } else {
      whileLoop = setInterval(algo, searchDelay);
    }
  }

  self
.

  addEventListener(

  'message'
,

  function (ev) {
     msg = ev.data;
    if (msg.task === 'search') {
      if (msg.type === 'gbfs') {
        gbfs(msg.start, msg.goal);
      } else if (msg.type === 'astar') {
        astar(msg.start, msg.goal);
      } else if (msg.type === 'bfs') {
        bfs(msg.start, msg.goal);
      } else if (msg.type === 'ucs') {
        ucs(msg.start, msg.goal);
      } else if (msg.type === 'dfs') {
        dfs(msg.start, msg.goal);
      }
    } else if (msg.task === 'loadNodes') {
      nodes = msg.nodes;
    } else if (msg.task === 'searchDelay') {
      searchDelay = msg.searchDelay;
    }
  }

,
  false
)
  ;
}