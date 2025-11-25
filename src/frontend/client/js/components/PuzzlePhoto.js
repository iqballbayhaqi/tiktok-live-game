// Puzzle Photo Component
class PuzzlePhoto {
    constructor(config = {}) {
        this.config = config;
        this.size = 3; // Default 3x3
        this.imageUrl = null;
        this.puzzleElement = document.getElementById('puzzle');
        this.puzzleContainer = document.getElementById('puzzle-container');
        this.tileSize = 0;
        this.puzzleSize = 300; // Default puzzle size in pixels
    }

    setSize(size) {
        this.size = size;
        this.updatePuzzleSize();
    }

    setImage(imageUrl) {
        this.imageUrl = imageUrl;
        if (this.imageUrl) {
            this.makePuzzle();
        }
    }

    updatePuzzleSize() {
        // Adjust puzzle size based on viewport
        const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8, 600);
        this.puzzleSize = Math.max(200, maxSize);
        
        if (this.puzzleElement) {
            this.puzzleElement.style.width = this.puzzleSize + 'px';
            this.puzzleElement.style.height = this.puzzleSize + 'px';
        }
    }

    makePuzzle() {
        if (!this.puzzleElement || !this.imageUrl) return;
        
        this.puzzleElement.innerHTML = "";
        this.tileSize = this.puzzleSize / this.size;
        
        // Set background size for tiles
        const backgroundSize = this.puzzleSize + 'px ' + this.puzzleSize + 'px';

        // Generate shuffled positions
        let arr = [];
        for (let i = 0; i < this.size * this.size - 1; i++) {
            arr.push(i);
        }
        arr.sort(() => Math.random() - 0.5);

        arr.forEach((i, index) => {
            let tile = document.createElement("div");
            tile.className = "tile";
            tile.style.width = this.tileSize + "px";
            tile.style.height = this.tileSize + "px";
            tile.style.left = (index % this.size) * this.tileSize + "px";
            tile.style.top = Math.floor(index / this.size) * this.tileSize + "px";
            tile.style.backgroundImage = `url(${this.imageUrl})`;
            tile.style.backgroundSize = backgroundSize;
            tile.style.backgroundPosition =
                `-${(i % this.size) * this.tileSize}px -${Math.floor(i / this.size) * this.tileSize}px`;

            // Number label di pojok kiri atas
            let num = document.createElement("div");
            num.className = "tile-number";
            num.innerText = (i + 1);
            tile.appendChild(num);

            tile.onclick = () => this.moveTile(tile);
            this.puzzleElement.appendChild(tile);
        });
    }

    moveTile(tile) {
        let emptyPos = this.getEmptyPosition();
        let tilePos = {
            x: parseInt(tile.style.left),
            y: parseInt(tile.style.top)
        };

        let dist = Math.abs(tilePos.x - emptyPos.x) + Math.abs(tilePos.y - emptyPos.y);
        if (dist === this.tileSize) {
            tile.style.left = emptyPos.x + "px";
            tile.style.top = emptyPos.y + "px";
            this.checkWin();
        }
    }

    getEmptyPosition() {
        const tiles = document.querySelectorAll('.tile');
        let filled = new Set();

        tiles.forEach(t => {
            filled.add(t.style.left + ',' + t.style.top);
        });

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                let pos = `${c * this.tileSize}px,${r * this.tileSize}px`;
                if (!filled.has(pos)) {
                    return {
                        x: c * this.tileSize,
                        y: r * this.tileSize
                    };
                }
            }
        }
    }

    checkWin() {
        const tiles = document.querySelectorAll('.tile');
        let isWin = true;
        let expectedIndex = 0;

        tiles.forEach(tile => {
            const x = parseInt(tile.style.left) / this.tileSize;
            const y = parseInt(tile.style.top) / this.tileSize;
            const currentIndex = y * this.size + x;
            
            // Check if tile is in correct position
            const tileNumber = parseInt(tile.querySelector('.tile-number').innerText);
            if (tileNumber - 1 !== currentIndex) {
                isWin = false;
            }
        });

        if (isWin) {
            console.log('🎉 Puzzle solved!');
            // Optional: Add win animation or callback
            setTimeout(() => {
                this.makePuzzle(); // Restart puzzle
            }, 2000);
        }
    }

    resize() {
        this.updatePuzzleSize();
        if (this.imageUrl) {
            this.makePuzzle();
        }
    }
}

