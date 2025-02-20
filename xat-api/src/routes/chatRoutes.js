const express = require('express');
const router = express.Router();
const { registerPrompt, getConversation, listOllamaModels, analyzeSentiment } = require('../controllers/chatController');


/**
 * @swagger
 * /api/chat/prompt:
 *   post:
 *     summary: Crear un nou prompt o afegir-lo a una conversa existent
 *     tags: [Prompts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la conversa (opcional)
 *               prompt:
 *                 type: string
 *                 description: Text del prompt
 *               model:
 *                 type: string
 *                 description: Model d'Ollama a utilitzar
 *                 default: llama3:latest
 *               stream:
 *                 type: boolean
 *                 description: Indica si la resposta ha de ser en streaming
 *                 default: false
 *     responses:
 *       201:
 *         description: Prompt registrat correctament
 *       400:
 *         description: Dades invàlides
 *       404:
 *         description: Conversa no trobada
 */
router.post('/prompt', registerPrompt);

/**
 * @swagger
 * /api/chat/conversation/{id}:
 *   get:
 *     summary: Obtenir una conversa per ID
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID de la conversa
 *     responses:
 *       200:
 *         description: Conversa trobada
 *       404:
 *         description: Conversa no trobada
 */
router.get('/conversation/:id', getConversation);

/**
 * @swagger
 * /api/chat/models:
 *   get:
 *     summary: Llistar models disponibles a Ollama
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Llista de models disponibles
 *       500:
 *         description: Error al recuperar models
 */
router.get('/models', listOllamaModels);

/**
 * @swagger
 * /api/chat/sentiment:
 *   post:
 *     summary: Analitzar el sentiment d'un text
 *     tags: [Sentiment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *                 description: Model d'Ollama a utilitzar
 *                 default: llama3:latest
 *               prompt:
 *                 type: string
 *                 description: Text a analitzar
 *                 default: Analyze the sentiment of this text and respond with only one word (positive/negative/neutral) Is a good game!
 *               stream:
 *                 type: boolean
 *                 description: Indica si la resposta ha de ser en streaming
 *                 default: false
 *     responses:
 *       200:
 *         description: Sentiment analitzat correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 model:
 *                   type: string
 *                   description: Model utilitzat
 *                 prompt:
 *                   type: string
 *                   description: Text analitzat
 *                 sentiment:
 *                   type: string
 *                   description: Resultat del sentiment (positive/negative/neutral)
 *                 stream:
 *                   type: boolean
 *                   description: Indica si s'ha utilitzat streaming
 *       400:
 *         description: Dades invàlides
 *       500:
 *         description: Error en l'anàlisi de sentiment
 */
router.post('/sentiment', analyzeSentiment);



module.exports = router;
