const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('__dirname:', __dirname);

const DATA_SUBFOLDER = 'steamreviews';
const CSV_GAMES_FILE_NAME = 'games.csv';
const CSV_REVIEWS_FILE_NAME = 'reviews.csv';

if (!process.env.DATA_PATH) {
    console.error('ERROR: La variable de entorno DATA_PATH no está definida.');
    process.exit(1);
}

const dataPath = path.resolve(__dirname, process.env.DATA_PATH);
console.log('Ruta de datos resuelta:', dataPath);

const OUTPUT_FILE = path.join(dataPath, 'sentiment_results.json'); // Guarda en DATA_PATH

async function readCSV(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// Verificar si la API de Ollama está disponible
async function checkOllamaAPI() {
    try {
        const response = await globalThis.fetch(`${process.env.CHAT_API_OLLAMA_URL}/version`);
        if (!response.ok) throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
        console.log('API de Ollama disponible.');
    } catch (error) {
        console.error('ERROR: No se pudo conectar con Ollama:', error.message);
        process.exit(1);
    }
}

async function analyzeSentiment(text) {
    try {
        const response = await globalThis.fetch(`${process.env.CHAT_API_OLLAMA_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.CHAT_API_OLLAMA_MODEL_TEXT,
                prompt: `Analyze the sentiment of this text and respond with only one word (positive/negative/neutral): "${text}"`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response.trim().toLowerCase();
    } catch (error) {
        console.error('Error analizando sentimiento:', text, error.message);
        return 'error';
    }
}

async function main() {
    try {
        await checkOllamaAPI();

        const gamesFilePath = path.join(dataPath, DATA_SUBFOLDER, CSV_GAMES_FILE_NAME);
        const reviewsFilePath = path.join(dataPath, DATA_SUBFOLDER, CSV_REVIEWS_FILE_NAME);

        if (!fs.existsSync(gamesFilePath) || !fs.existsSync(reviewsFilePath)) {
            throw new Error('ERROR: Uno de los archivos CSV no existe.');
        }

        console.log('Archivos CSV encontrados, leyendo datos...');

        const games = await readCSV(gamesFilePath);
        const reviews = await readCSV(reviewsFilePath);

        const selectedGames = games.slice(0, 2).map(game => ({
            appid: game.appid,
            name: game.name
        }));

        console.log('Juegos seleccionados:', selectedGames);

        const sentimentResults = {
            timestamp: new Date().toISOString(),
            games: []
        };

        for (const game of selectedGames) {
            console.log(`\nAnalizando reseñas para ${game.name} (ID: ${game.appid})...`);
            const gameReviews = reviews.filter(review => review.app_id === game.appid).slice(0, 10); // Limitar a 10 reseñas por juego

            let sentimentCount = { positive: 0, negative: 0, neutral: 0, error: 0 };

            // Procesar reseñas en paralelo
            const sentimentPromises = gameReviews.map(review => analyzeSentiment(review.content));

            const sentimentResultsArray = await Promise.all(sentimentPromises);

            // Contar resultados
            sentimentResultsArray.forEach(sentiment => {
                if (sentiment in sentimentCount) {
                    sentimentCount[sentiment]++;
                }
            });

            sentimentResults.games.push({
                appid: game.appid,
                name: game.name,
                statistics: sentimentCount
            });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sentimentResults, null, 2), 'utf8');
        console.log(`Análisis de sentimiento guardado en ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error durante la ejecución:', error.message);
    }
}

main();
