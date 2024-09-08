const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const db = require('./dbSetup'); // Importa a configuração do banco de dados

const app = express();

app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Chave secreta para assinar os tokens JWT
const secretKey = 'P@%+~~=0[2YW59l@M+5ctb-;|Y4{z;1om1CuyN#n0t)pm0/yEC0"dn`wvg92D7A';

// Middleware para verificar o token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'Token not provided' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware para verificar o perfil do usuário
function authorizeAdmin(req, res, next) {
  getPerfil(req.user.usuario_id).then(perfil => {
    if (perfil !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
  }).catch(err => {
    res.status(500).json({ message: 'Internal Server Error' });
  });
}

// Endpoint para login do usuário
app.post('/api/auth/login', (req, res) => {
  const credentials = req.body;

  doLogin(credentials).then(userData => {
    if (userData) {
      // Cria o token JWT que será usado como session id
      const token = jwt.sign({ usuario_id: userData.id }, secretKey, { expiresIn: '1h' });
      res.json({ sessionid: token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }).catch(err => {
    res.status(500).json({ message: 'Internal Server Error' });
  });
});

// Endpoint para recuperação dos dados do usuário logado
app.get('/api/me', authenticateToken, (req, res) => {
  getUserById(req.user.usuario_id).then(userData => {
    res.status(200).json({ data: userData });
  }).catch(err => {
    res.status(500).json({ message: 'Internal Server Error' });
  });
});

// Endpoint para recuperação dos dados de todos os usuários cadastrados
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  getAllUsers().then(users => {
    res.status(200).json({ data: users });
  }).catch(err => {
    res.status(500).json({ message: 'Internal Server Error' });
  });
});

// Endpoint para recuperação dos contratos existentes
app.get('/api/contracts/:empresa/:inicio', authenticateToken, authorizeAdmin, async (req, res) => {
  const { empresa, inicio } = req.params;

  try {
    const result = await getContracts(empresa, inicio);
    if (result.length > 0) {
      res.status(200).json({ data: result });
    } else {
      res.status(404).json({ data: 'Dados Não encontrados' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Função genérica para executar consultas SQL
function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Função genérica para executar consultas SQL que retornam múltiplas linhas
function executeQueryAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Recupera os dados do usuário através do id
function getUserById(userId) {
  // Consulta parametrizada previne SQL Injection
  return executeQuery('SELECT id, username, email, perfil FROM users WHERE id = ?', [userId]);
}

// Recupera todos os usuários
function getAllUsers() {
  // Consulta parametrizada previne SQL Injection
  return executeQueryAll('SELECT * FROM users');
}

// Realiza o login do usuário
function doLogin(credentials) {
  // Consulta parametrizada previne SQL Injection
  return executeQuery('SELECT * FROM users WHERE username = ? AND password = ?', [credentials.username, credentials.password]);
}

// Recupera o perfil do usuário através do id
function getPerfil(userId) {
  // Consulta parametrizada previne SQL Injection
  return executeQuery('SELECT perfil FROM users WHERE id = ?', [userId]).then(row => row.perfil);
}

// Recupera, no banco de dados, os dados dos contratos
function getContracts(empresa, inicio) {
  // Consulta parametrizada previne SQL Injection
  return executeQueryAll('SELECT * FROM contracts WHERE empresa = ? AND data_inicio = ?', [empresa, inicio]);
}