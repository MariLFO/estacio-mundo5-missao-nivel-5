const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

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
  const perfil = getPerfil(req.user.usuario_id);
  if (perfil !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
}

// Endpoint para login do usuário
// Dados do body da requisição: {"username" : "user", "password" : "123456"}
// Verifique mais abaixo, no array users, os dados dos usuários existentes na app
app.post('/api/auth/login', (req, res) => {
  const credentials = req.body;

  let userData;
  userData = doLogin(credentials);

  if (userData) {
    // Cria o token JWT que será usado como session id
    const token = jwt.sign({ usuario_id: userData.id }, secretKey, { expiresIn: '1h' });
    res.json({ sessionid: token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Endpoint para recuperação dos dados do usuário logado
app.get('/api/me', authenticateToken, (req, res) => {
  const userData = getUserById(req.user.usuario_id);
  res.status(200).json({ data: userData });
});

// Endpoint para recuperação dos dados de todos os usuários cadastrados
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  res.status(200).json({ data: users });
});

// Endpoint para recuperação dos contratos existentes
app.get('/api/contracts/:empresa/:inicio', authenticateToken, authorizeAdmin, (req, res) => {
  const empresa = req.params.empresa;
  const dtInicio = req.params.inicio;

  const result = getContracts(empresa, dtInicio);
  if (result) {
    res.status(200).json({ data: result });
  } else {
    res.status(404).json({ data: 'Dados Não encontrados' });
  }
});

// Outros endpoints da API
// ...

///////////////////////////////////////////////////////////////////////////////////
///

// Mock de dados

const users = [
  { "username": "user", "password": "123456", "id": 123, "email": "user@dominio.com", "perfil": "user" },
  { "username": "admin", "password": "123456789", "id": 124, "email": "admin@dominio.com", "perfil": "admin" },
  { "username": "colab", "password": "123", "id": 125, "email": "colab@dominio.com", "perfil": "user" },
];

// APP SERVICES
function doLogin(credentials) {
  let userData;
  userData = users.find(item => {
    if (credentials?.username === item.username && credentials?.password === item.password)
      return item;
  });
  return userData;
}

// Recupera o perfil do usuário através do id
function getPerfil(userId) {
  const userData = users.find(item => {
    if (parseInt(userId) === parseInt(item.id))
      return item;
  });
  return userData.perfil;
}

// Recupera os dados do usuário através do id
function getUserById(userId) {
  return users.find(item => parseInt(userId) === parseInt(item.id));
}

// Classe fake emulando um script externo, responsável pela execução de queries no banco de dados
class Repository {
  execute(query) {
    return [];
  }
}

// Recupera, no banco de dados, os dados dos contratos
// Metodo não funcional, servindo apenas para fins de estudo
function getContracts(empresa, inicio) {
  const repository = new Repository();
  const query = `Select * from contracts Where empresa = '${empresa}' And data_inicio = '${inicio}'`;

  const result = repository.execute(query);

  return result;
}