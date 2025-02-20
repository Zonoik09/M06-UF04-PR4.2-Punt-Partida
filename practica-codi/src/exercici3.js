// Importacions
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Constants des de variables d'entorn
const IMAGES_SUBFOLDER = '/imatges/animals';
const IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif'];
const OLLAMA_URL = process.env.CHAT_API_OLLAMA_URL;
const OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL_VISION;
const MAX_API_CALLS = 5;

// Funció per llegir un fitxer i convertir-lo a Base64
async function imageToBase64(imagePath) {
    try {
        const data = await fs.readFile(imagePath);
        return Buffer.from(data).toString('base64');
    } catch (error) {
        console.error(`Error al llegir o convertir la imatge ${imagePath}:`, error.message);
        return null;
    }
}

// Funció per fer la petició a Ollama amb més detalls d'error
async function queryOllama(base64Image, prompt) {
    const requestBody = {
        model: OLLAMA_MODEL,
        prompt: prompt,
        images: [base64Image],
        stream: false
    };

    try {
        const response = await fetch(`${OLLAMA_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data || !data.response) {
            throw new Error('La resposta d\'Ollama no té el format esperat');
        }

        return data.response;
    } catch (error) {
        console.error('Error detallado en la petición a Ollama:', error.message);
        return null;
    }
}

// Funció per analitzar la informació de l'animal
async function analyzeAnimal(imageFile) {
    const base64Image = await imageToBase64(imageFile.path);
    if (base64Image) {
        const prompt = `
            Ets un assistent d'anàlisi d'imatges. Identifica l'animal en la imatge i proporciona informació en format JSON seguint aquesta estructura:

            {
            "timestamp": "YYYY-MM-DDTHH:MM:SS.sssZ",
            "animals": [
                {
                "name": "Nom de l'animal",
                "scientific_name": "Nom científic",
                "taxonomy": {
                    "kingdom": "Regne",
                    "phylum": "Fil",
                    "class": "Classe",
                    "order": "Ordre",
                    "family": "Família",
                    "genus": "Gènere",
                    "species": "Espècie"
                },
                "habitat": "Descripció de l'hàbitat",
                "diet": "Descripció de la dieta",
                "physical_characteristics": "Descripció de les característiques físiques",
                "conservation_status": "Estat de conservació segons la IUCN"
                }
            ]
            }
        `;

        return await queryOllama(base64Image, prompt);
    }
    return null;
}

// Funció per crear el fitxer de sortida
async function OutputFile(result) {
    const outputDir = path.join(__dirname, '../../data');
    const outputFilePath = path.join(outputDir, 'exercici3_resposta.json');

    try {
        await fs.access(outputDir);
    } catch (error) {
        await fs.mkdir(outputDir, { recursive: true });
    }

    await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2));
    console.log(`Resultat guardat a: ${outputFilePath}`);
}

// Funció principal
async function main() {
    try {
        const imagesFolderPath = path.join(__dirname, process.env.DATA_PATH, IMAGES_SUBFOLDER);
        const animalDirectories = await fs.readdir(imagesFolderPath);
        const analisis = [];
        let apiCalls = 0;

        for (const animalDir of animalDirectories) {
            if (apiCalls >= MAX_API_CALLS) break;
            const animalDirPath = path.join(imagesFolderPath, animalDir);
            const imageFiles = await fs.readdir(animalDirPath);

            for (const imageFile of imageFiles) {
                if (apiCalls >= MAX_API_CALLS) break;
                const imagePath = path.join(animalDirPath, imageFile);
                const ext = path.extname(imagePath).toLowerCase();
                if (IMAGE_TYPES.includes(ext)) {
                    const analysis = await analyzeAnimal({ path: imagePath, name: imageFile });
                    if (analysis) {
                        analisis.push({ imatge: { nom_fitxer: imageFile }, analisi: analysis });
                        apiCalls++;
                    }
                }
            }
        }

        const result = { analisis };
        await OutputFile(result);
    } catch (error) {
        console.error('Error durant l\'execució:', error.message);
    }
}

// Executem la funció principal
main();
