let stompClient = null;
let connected = false;
let stocksLoaded = false; // Flag para verificar se os stocks foram carregados

// Função para conectar ao WebSocket
function connect() {
    const socket = new SockJS('http://localhost:8080/stock-prices', {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);
        connected = true;

        stompClient.send("/app/connect", {}, JSON.stringify({ name: 'user' }));

        // Assina o tópico para receber as atualizações das ações
        stompClient.subscribe('/topic/stock-prices', function (response) {
            const stocks = JSON.parse(response.body);
            console.log('Received stocks:', stocks);
            if (!stocksLoaded) {
                // Cria os blocos de ações apenas na primeira vez que os dados chegam
                createStockBlocks(stocks);
                stocksLoaded = true;
            } else {
                // Atualiza os blocos de ações nas atualizações subsequentes
                updateStockBlocks(stocks);
            }
        });
    }, function (error) {
        console.error('Connection lost, retrying in 5 seconds...', error);
        connected = false;
        setTimeout(reconnect, 5000); // Tenta reconectar após 5 segundos
    });
}

// Função para reconectar ao WebSocket
function reconnect() {
    if (!connected) {
        console.log('Reconnecting...');
        connect();
    }
}

// Função para gerar blocos de ações na tela
function createStockBlocks(stocks) {
    const container = document.getElementById('stock-container');
    container.innerHTML = ''; // Limpa o container antes de adicionar novos blocos

    stocks.forEach(stock => {
        const stockBlock = createStockBlock(stock);
        container.appendChild(stockBlock);
    });
}

// Função para criar um bloco individual de ação
function createStockBlock(stock) {
    const stockBlock = document.createElement('div');
    stockBlock.className = 'stock-block';
    stockBlock.id = normalizeId(stock.name);

    const stockName = document.createElement('h2');
    stockName.innerText = stock.name;

    const stockPrice = document.createElement('p');
    stockPrice.innerText = stock.price.toFixed(2);

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.innerText = '→'; // Seta padrão

    stockBlock.appendChild(stockName);
    stockBlock.appendChild(stockPrice);
    stockBlock.appendChild(arrow);

    return stockBlock;
}

// Função para atualizar os blocos de ações na tela
function updateStockBlocks(stocks) {
    let highestPrice = 0;
    let highestStockName = "";
    let lowestPrice = Infinity;
    let lowestStockName = "";

    stocks.forEach(stock => {
        const stockId = normalizeId(stock.name);
        const stockBlock = document.getElementById(stockId);

        if (stockBlock) {
            // Atualiza o bloco existente
            updateStockBlock(stockBlock, stock);
        } else {
            // Cria um novo bloco caso não exista
            const newBlock = createStockBlock(stock);
            document.getElementById('stock-container').appendChild(newBlock);
            console.log(`Created new stock block for ${stock.name}`);
        }

        // Verifica maior e menor preço
        if (stock.price > highestPrice) {
            highestPrice = stock.price;
            highestStockName = stock.name;
        }
        if (stock.price < lowestPrice) {
            lowestPrice = stock.price;
            lowestStockName = stock.name;
        }
    });

    // Atualiza os preços de maior e menor valor exibidos
    updateHighestLowestPriceDisplay(highestStockName, highestPrice, lowestStockName, lowestPrice);
}

// Função para atualizar um bloco de ação específico
function updateStockBlock(stockBlock, stock) {
    const stockPriceElement = stockBlock.querySelector('p');
    const arrowElement = stockBlock.querySelector('.arrow');
    const previousPrice = parseFloat(stockPriceElement.innerText);
    const currentPrice = stock.price;

    stockPriceElement.innerText = currentPrice.toFixed(2);

    // Verifica se o preço aumentou ou diminuiu e atualiza a seta e as classes
    if (currentPrice > previousPrice) {
        stockBlock.classList.add('increase');
        stockBlock.classList.remove('decrease');
        arrowElement.innerText = '↑'; // Seta para cima
    } else if (currentPrice < previousPrice) {
        stockBlock.classList.add('decrease');
        stockBlock.classList.remove('increase');
        arrowElement.innerText = '↓'; // Seta para baixo
    } else {
        arrowElement.innerText = '→'; // Seta padrão se não houver mudança
    }
}

// Função de pesquisa para encontrar ações pelo nome
function searchStock() {
    const query = document.getElementById('search-stock').value.toLowerCase();
    const stockBlocks = document.getElementsByClassName('stock-block');

    Array.from(stockBlocks).forEach(stockBlock => {
        const stockName = stockBlock.querySelector('h2').innerText.toLowerCase();
        if (stockName.includes(query)) {
            stockBlock.style.display = 'block';
        } else {
            stockBlock.style.display = 'none';
        }
    });
}

// Função para atualizar os preços mais altos e mais baixos exibidos
function updateHighestLowestPriceDisplay(highestStockName, highestPrice, lowestStockName, lowestPrice) {
    const highestPriceElement = document.getElementById('highest-price');
    highestPriceElement.innerText = `${highestStockName}: ${highestPrice.toFixed(2)}`;

    const lowestPriceElement = document.getElementById('lowest-price');
    lowestPriceElement.innerText = `${lowestStockName}: ${lowestPrice.toFixed(2)}`;
}

// Função para normalizar o ID dos blocos de ações
function normalizeId(stockName) {
    return stockName.replace(/\s+/g, '-').toLowerCase();
}

// Carregar a conexão ao carregar a página
window.onload = function () {
    connect();
};
