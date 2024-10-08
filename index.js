const mysql = require('mysql2/promise');
const redis = require('redis');
const express = require('express');
const app = express();

// Conexão com MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'secret',
    database: 'ecommerce'
});

// Conexão com Redis
const client = redis.createClient();

client.on('error', (err) => {
    console.error('Erro ao conectar ao Redis:', err);
});

client.connect().then(() => {
    console.log('Conectado ao Redis');
});


app.get('/products', async (req, res) => {
    try {
        console.log('/products request begin');
        const key = 'product_list';

        // Verifica se os dados estão no cache
        const products = await client.get(key);  // Utilizando await para leitura de cache
        console.log('read from redis');

        if (products) {
            // Dados encontrados no cache, retorna imediatamente
            return res.json({ source: 'cache', data: JSON.parse(products) });
        }

        // Dados não encontrados no cache, consulta os produtos no MySQL
        const [rows] = await db.query('SELECT * FROM products');
        const dbProducts = JSON.stringify(rows);

        // Armazena os resultados da consulta no cache com TTL de 1 hora
        await client.setEx(key, 3600, dbProducts);  // Utilizando await para setEx no Redis

        // Retorna os dados consultados do banco de dados
        res.json({ source: 'database', data: rows });
    } catch (error) {
        console.error('Erro ao acessar o cache ou banco de dados:', error);
        res.status(500).send('Erro interno');
    }
});


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
